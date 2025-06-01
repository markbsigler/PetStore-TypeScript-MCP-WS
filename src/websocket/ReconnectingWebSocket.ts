import WebSocket, { CloseEvent } from 'ws';

export interface ReconnectConfig {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  factor?: number;
}

const defaultConfig: Required<ReconnectConfig> = {
  maxRetries: 10,
  initialDelay: 1000,
  maxDelay: 30000,
  factor: 2,
};

export class ReconnectingWebSocket {
  private ws: WebSocket | null = null;
  private retries = 0;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private config: Required<ReconnectConfig>;
  private messageQueue: string[] = [];
  private isConnecting = false;

  constructor(
    private url: string,
    config: ReconnectConfig = {},
    private protocols?: string | string[]
  ) {
    this.config = { ...defaultConfig, ...config };
    this.connect();
  }

  private connect(): void {
    if (this.isConnecting) return;
    this.isConnecting = true;

    try {
      this.ws = new WebSocket(this.url, this.protocols);
      this.setupEventHandlers();
    } catch (error) {
      this.handleError(error);
    }
  }

  private setupEventHandlers(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      this.isConnecting = false;
      this.retries = 0;
      this.flushMessageQueue();
      this.emit('open');
    };

    this.ws.onclose = (event) => {
      this.handleClose(event);
    };

    this.ws.onerror = (event) => {
      this.handleError(event);
    };

    this.ws.onmessage = (event) => {
      this.emit('message', event);
    };
  }

  private handleClose(event: CloseEvent): void {
    this.isConnecting = false;
    this.emit('close', event);

    if (!event.wasClean) {
      this.scheduleReconnect();
    }
  }

  private handleError(error: unknown): void {
    this.isConnecting = false;
    this.emit('error', error);
    this.scheduleReconnect();
  }

  private scheduleReconnect(): void {
    if (this.retries >= this.config.maxRetries) {
      this.emit('max-retries');
      return;
    }

    const delay = Math.min(
      this.config.initialDelay * Math.pow(this.config.factor, this.retries),
      this.config.maxDelay
    );

    this.reconnectTimeout = setTimeout(() => {
      this.retries++;
      this.emit('reconnecting', { attempt: this.retries, delay });
      this.connect();
    }, delay);
  }

  private flushMessageQueue(): void {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (message) this.send(message);
    }
  }

  public send(data: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(data);
    } else {
      this.messageQueue.push(data);
    }
  }

  public close(code?: number, reason?: string): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    this.ws?.close(code, reason);
  }

  private listeners: { [key: string]: Function[] } = {};

  public on(event: string, callback: Function): void {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  public off(event: string, callback: Function): void {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
  }

  private emit(event: string, ...args: unknown[]): void {
    if (!this.listeners[event]) return;
    this.listeners[event].forEach(callback => callback(...args));
  }

  public get readyState(): number {
    return this.ws?.readyState ?? WebSocket.CLOSED;
  }
}