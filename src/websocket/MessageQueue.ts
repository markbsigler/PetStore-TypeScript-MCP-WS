import { Redis } from 'ioredis';
import { EventEmitter } from 'events';
import { Counter, Gauge, Histogram } from 'prom-client';

export enum MessagePriority {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

interface QueueMessage<T = unknown> {
  id: string;
  data: T;
  priority: MessagePriority;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
}

interface MessageQueueConfig {
  redisUrl: string;
  maxQueueSize: number;
  processingTimeout: number;
  maxRetries: number;
  backpressureThreshold: number;
  retryDelay: number;
  concurrency: number;
}

export class MessageQueue extends EventEmitter {
  private readonly publisher: Redis;
  private readonly subscriber: Redis;
  private readonly processing: Map<string, NodeJS.Timeout> = new Map();
  private isProcessing: boolean = false;
  private backpressureActive: boolean = false;
  private readonly config: MessageQueueConfig;

  // Prometheus metrics
  private readonly queueSizeGauge: Gauge;
  private readonly messageCounter: Counter;
  private readonly processingTimeHistogram: Histogram;
  private readonly backpressureGauge: Gauge;

  constructor(config: MessageQueueConfig) {
    super();
    this.config = config;
    this.publisher = new Redis(config.redisUrl);
    this.subscriber = new Redis(config.redisUrl);

    this.queueSizeGauge = new Gauge({
      name: 'message_queue_size',
      help: 'Current size of the message queue',
      labelNames: ['priority'],
    });

    this.messageCounter = new Counter({
      name: 'message_queue_messages_total',
      help: 'Total number of messages processed',
      labelNames: ['priority', 'status'],
    });

    this.processingTimeHistogram = new Histogram({
      name: 'message_queue_processing_time_seconds',
      help: 'Time taken to process messages',
      buckets: [0.1, 0.5, 1, 2, 5],
    });

    this.backpressureGauge = new Gauge({
      name: 'message_queue_backpressure',
      help: 'Whether backpressure is currently active',
      labelNames: ['queue'],
    });

    this.setupSubscriber();
    // Do not start processing in constructor; let user call startProcessing()
  }

  private setupSubscriber(): void {
    this.subscriber.subscribe('queue:events', (err) => {
      if (err) {
        this.emit('error', new Error(err instanceof Error ? err.message : String(err)));
        // removed redundant return
      }
    });

    this.subscriber.on('message', (channel, message) => {
      if (channel === 'queue:events') {
        try {
          const event = JSON.parse(message);
          this.emit(event.type, event.data);
        } catch (err) {
          this.emit('error', new Error('Failed to parse message: ' + String(err)));
        }
      }
    });
  }

  // Replace crypto.randomUUID() with a Node.js import and fallback
  private static generateId(): string {
    try {
      // Dynamically require crypto for Node.js environments
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const crypto = require('crypto');
      if (typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
      }
    } catch (e) {
      // Fallback: log error in development, ignore in production
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.warn('crypto.randomUUID unavailable, using fallback UUID:', e);
      }
    }
    // Fallback: generate a simple UUID v4
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  public async enqueue<T>(
    data: T,
    priority: MessagePriority = MessagePriority.MEDIUM,
    maxRetries: number = this.config.maxRetries
  ): Promise<string> {
    const queueSize = await this.getQueueSize();
    if (queueSize >= this.config.maxQueueSize) {
      throw new Error('Queue is full');
    }
    if (queueSize >= this.config.backpressureThreshold) {
      this.backpressureActive = true;
      this.backpressureGauge.labels('main').set(1);
      this.emit('backpressure_start');
    }
    const message: QueueMessage<T> = {
      id: MessageQueue.generateId(),
      data,
      priority,
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries,
    };
    const queueKey = `queue:${priority}`;
    await this.publisher.lpush(queueKey, JSON.stringify(message));
    this.queueSizeGauge.labels(priority).inc();
    this.messageCounter.labels(priority, 'enqueued').inc();
    return message.id;
  }

  private async dequeue(): Promise<QueueMessage | null> {
    // Try queues in priority order
    for (const priority of Object.values(MessagePriority)) {
      const queueKey = `queue:${priority}`;
      const message = await this.publisher.rpop(queueKey);
      
      if (message) {
        this.queueSizeGauge.labels(priority).dec();
        return JSON.parse(message);
      }
    }
    
    return null;
  }

  private async startProcessing(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    while (this.isProcessing) {
      try {
        const activeProcesses = this.processing.size;
        
        if (activeProcesses >= this.config.concurrency) {
          await new Promise(resolve => setTimeout(resolve, 100));
          continue;
        }

        const message = await this.dequeue();
        if (!message) {
          await new Promise(resolve => setTimeout(resolve, 100));
          continue;
        }

        this.processMessage(message);
      } catch (error) {
        this.emit('error', error);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  private async processMessage(message: QueueMessage): Promise<void> {
    const startTime = Date.now();
    const timer = setTimeout(() => {
      this.handleMessageTimeout(message);
    }, this.config.processingTimeout);

    this.processing.set(message.id, timer);

    try {
      this.emit('processing', message);
      const listeners = this.listeners('message');
      for (const listener of listeners) {
        if (typeof listener === 'function') {
          // Await the listener, but pass both the message and the queueMessage object for flexibility
          await listener(message.data, message);
        }
      }
      
      clearTimeout(timer);
      this.processing.delete(message.id);
      
      const processingTime = (Date.now() - startTime) / 1000;
      this.processingTimeHistogram.observe(processingTime);
      this.messageCounter.labels(message.priority, 'processed').inc();

      // Check if we can release backpressure
      const queueSize = await this.getQueueSize();
      if (this.backpressureActive && queueSize < this.config.backpressureThreshold) {
        this.backpressureActive = false;
        this.backpressureGauge.labels('main').set(0);
        this.emit('backpressure_end');
      }
    } catch (error) {
      clearTimeout(timer);
      this.processing.delete(message.id);
      await this.handleMessageError(message, error);
    }
  }

  private async handleMessageTimeout(message: QueueMessage): Promise<void> {
    this.processing.delete(message.id);
    this.messageCounter.labels(message.priority, 'timeout').inc();
    await this.handleMessageError(message, new Error('Processing timeout'));
  }

  private async handleMessageError(message: QueueMessage, error: unknown): Promise<void> {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const wrappedError = new Error(`Message processing failed: ${errorMessage}`);
    
    this.emit('error', { message, error: wrappedError });
    this.messageCounter.labels(message.priority, 'error').inc();

    if (message.retryCount < message.maxRetries) {
      message.retryCount++;
      await new Promise(resolve => setTimeout(resolve, this.config.retryDelay));
      await this.enqueue(message.data, message.priority, message.maxRetries);
    } else {
      this.emit('failed', { message, error: wrappedError });
      this.messageCounter.labels(message.priority, 'failed').inc();
    }
  }

  private async getQueueSize(): Promise<number> {
    let total = 0;
    for (const priority of Object.values(MessagePriority)) {
      const size = await this.publisher.llen(`queue:${priority}`);
      total += size;
    }
    return total;
  }

  public async pause(): Promise<void> {
    this.isProcessing = false;
    this.emit('paused');
  }

  public async resume(): Promise<void> {
    if (!this.isProcessing) {
      this.startProcessing();
      this.emit('resumed');
    }
  }

  public async clear(): Promise<void> {
    for (const priority of Object.values(MessagePriority)) {
      const queueKey = `queue:${priority}`;
      await this.publisher.del(queueKey);
      this.queueSizeGauge.labels(priority).set(0);
    }
    this.emit('cleared');
  }

  public async stop(): Promise<void> {
    this.isProcessing = false;
    for (const timer of this.processing.values()) {
      clearTimeout(timer);
    }
    this.processing.clear();

    await this.publisher.quit();
    await this.subscriber.quit();
    this.emit('stopped');
  }

  // Overload signatures
  public on(event: 'message', listener: (...args: unknown[]) => Promise<void>): this;
  public on(event: 'error', listener: (...args: unknown[]) => void): this;
  public on(event: 'processing', listener: (...args: unknown[]) => void): this;
  public on(event: 'failed', listener: (...args: unknown[]) => void): this;
  public on(event: 'backpressure_start' | 'backpressure_end', listener: (...args: unknown[]) => void): this;
  public on(event: 'paused' | 'resumed' | 'cleared' | 'stopped', listener: (...args: unknown[]) => void): this;
  public override on(event: string, listener: (...args: unknown[]) => void): this {
    return super.on(event, listener);
  }
}