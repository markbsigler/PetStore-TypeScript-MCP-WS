import { randomUUID } from 'crypto';
import { FastifyInstance } from 'fastify';
import { WebSocket } from 'ws';
import { RateLimiter } from './RateLimiter.js';
import { HeartbeatMonitor, HeartbeatConfig } from './HeartbeatMonitor.js';
import { MessageCompressor, CompressionConfig } from './MessageCompressor.js';
import { ConnectionMetrics, ConnectionStats } from './ConnectionMetrics.js';
import {
  WebSocketMessage,
  WebSocketMessageSchema,
  RequestMessage,
  ResponseMessage,
  NotificationMessage,
  WebSocketRequestHandler,
  WebSocketTimeoutError,
} from '../types/websocket.js';

interface PendingRequest {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  resolve: (value: any) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
}

interface ClientInfo {
  id: string;
  ip: string;
  connectedAt: Date;
  lastActivity: Date;
  socket: WebSocket;
}

export interface WebSocketManagerConfig {
  requestTimeout?: number;
  rateLimitWindowMs?: number;
  rateLimitMaxRequests?: number;
  heartbeat?: HeartbeatConfig;
  compression?: CompressionConfig;
}

export class WebSocketManager {
  private readonly handlers: Map<string, WebSocketRequestHandler>;
  private readonly pendingRequests: Map<string, PendingRequest>;
  private readonly clients: Map<string, ClientInfo>;
  private readonly rateLimiter: RateLimiter;
  private readonly heartbeatMonitor: HeartbeatMonitor;
  private readonly messageCompressor: MessageCompressor;
  private readonly metrics: ConnectionMetrics;
  private readonly requestTimeout: number;
  private readonly fastify: FastifyInstance;

  constructor(
    fastify: FastifyInstance,
    config: WebSocketManagerConfig = {}
  ) {
    this.fastify = fastify;
    this.handlers = new Map();
    this.pendingRequests = new Map();
    this.clients = new Map();
    this.requestTimeout = config.requestTimeout ?? 30000;
    this.rateLimiter = new RateLimiter({
      windowMs: config.rateLimitWindowMs,
      maxRequests: config.rateLimitMaxRequests,
    });
    this.heartbeatMonitor = new HeartbeatMonitor(config.heartbeat);
    this.messageCompressor = new MessageCompressor(config.compression);
    this.metrics = new ConnectionMetrics();
  }

  public registerHandler(
    action: string,
    handler: WebSocketRequestHandler
  ): void {
    this.handlers.set(action, handler);
  }

  public addClient(socket: WebSocket, ip: string): string {
    const clientId = randomUUID();
    this.clients.set(clientId, {
      id: clientId,
      ip,
      connectedAt: new Date(),
      lastActivity: new Date(),
      socket,
    });

    this.metrics.onConnection();

    socket.addListener('message', (data: unknown) => this.handleMessage(clientId, data));
    socket.addListener('close', () => this.removeClient(clientId));
    socket.addListener('error', () => this.metrics.onError());

    // Start heartbeat monitoring if this is the first client
    if (this.clients.size === 1) {
      this.heartbeatMonitor.start(this.clients, (socket) => {
        // Find and remove the client with the dead socket
        for (const [clientId, client] of this.clients.entries()) {
          if (client.socket === socket) {
            this.removeClient(clientId);
            break;
          }
        }
      });
    }

    return clientId;
  }

  public removeClient(clientId: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      this.heartbeatMonitor.removeClient(client.socket);
      this.clients.delete(clientId);
      this.rateLimiter.removeClient(clientId);
      this.metrics.onDisconnection();
      this.fastify.log.info({ msg: 'Client disconnected', clientId });

      // Stop heartbeat monitoring if no clients remain
      if (this.clients.size === 0) {
        this.heartbeatMonitor.stop();
      }
    }
  }

  public getClientInfo(clientId: string): ClientInfo | undefined {
    return this.clients.get(clientId);
  }

  public async sendRequest<T = unknown, R = unknown>(
    clientId: string,
    action: string,
    payload: T
  ): Promise<R> {
    const client = this.clients.get(clientId);
    if (!client) {
      throw new Error('Client not found');
    }

    if (this.rateLimiter.isRateLimited(clientId)) {
      throw new Error('Rate limit exceeded');
    }

    const correlationId = randomUUID();
    const message: RequestMessage = {
      type: 'request',
      correlationId,
      timestamp: Date.now(),
      action,
      payload,
    };

    return new Promise<R>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(correlationId);
        reject(new WebSocketTimeoutError(correlationId));
      }, this.requestTimeout);

      // @ts-ignore: Type mismatch between Promise<R> and PendingRequest.resolve
      this.pendingRequests.set(correlationId, { resolve, reject, timeout });
      client.socket.send(JSON.stringify(message));
      client.lastActivity = new Date();
    });
  }

  public async broadcast(
    event: string,
    payload: unknown,
    filter?: (client: ClientInfo) => boolean
  ): Promise<void> {
    const message: NotificationMessage = {
      type: 'notification',
      correlationId: randomUUID(),
      timestamp: Date.now(),
      event,
      payload,
    };

    const data = JSON.stringify(message);
    const compressed = await this.messageCompressor.compress(data);
    const messageSize = Buffer.byteLength(data);

    this.clients.forEach((client) => {
      if (
        client.socket.readyState === WebSocket.OPEN &&
        (!filter || filter(client))
      ) {
        client.socket.send(compressed);
        this.metrics.onMessage(messageSize);
        client.lastActivity = new Date();
      }
    });
  }

  private async handleMessage(clientId: string, data: unknown): Promise<void> {
    const client = this.clients.get(clientId);
    if (!client) return;

    // Normalize ws RawData to Buffer or string
    let normalized: Buffer | string;
    if (typeof data === 'string') {
      normalized = data;
    } else if (Buffer.isBuffer(data)) {
      normalized = data;
    } else if (Array.isArray(data)) {
      // Buffer[]
      normalized = Buffer.concat(data);
    } else if (data instanceof ArrayBuffer) {
      normalized = Buffer.from(data);
    } else {
      this.metrics.onError();
      this.fastify.log.error({ msg: 'Unknown WebSocket message data type', dataType: typeof data });
      return;
    }

    client.lastActivity = new Date();

    if (this.rateLimiter.isRateLimited(clientId)) {
      this.sendError(
        client.socket,
        'Rate limit exceeded',
        undefined,
        this.rateLimiter.getResetTime(clientId)
      );
      return;
    }

    let message: WebSocketMessage;
    try {
      const decompressed = await this.messageCompressor.decompress(normalized);
      this.metrics.onMessage(Buffer.byteLength(decompressed));
      const parsed = JSON.parse(decompressed);
      message = WebSocketMessageSchema.parse(parsed);
    } catch (error) {
      this.metrics.onError();
      await this.sendError(client.socket, 'Invalid message format');
      return;
    }

    client.lastActivity = new Date();

    switch (message.type) {
      case 'request':
        await this.handleRequest(client.socket, message);
        break;
      case 'response':
        await this.handleResponse(message);
        break;
      case 'notification':
        // Notifications don't need responses
        break;
    }
  }

  private async handleRequest(
    socket: WebSocket,
    message: RequestMessage
  ): Promise<void> {
    const { correlationId, action, payload } = message;
    const handler = this.handlers.get(action);

    if (!handler) {
      this.sendError(socket, `Unknown action: ${action}`, correlationId);
      return;
    }

    try {
      const result = await handler(payload, socket, correlationId);
      this.sendSuccess(socket, result, correlationId);
    } catch (error) {
      const errorMessage = (error instanceof Error && error.message) ? error.message : String(error);
      this.sendError(
        socket,
        errorMessage,
        correlationId
      );
    }
  }

  private async handleResponse(message: ResponseMessage): Promise<void> {
    const pending = this.pendingRequests.get(message.correlationId);
    if (!pending) return;

    clearTimeout(pending.timeout);
    this.pendingRequests.delete(message.correlationId);

    if (message.status === 'success') {
      pending.resolve(message.payload);
    } else {
      pending.reject(new Error(message.payload as string));
    }
  }

  private async sendSuccess(
    socket: WebSocket,
    payload: unknown,
    correlationId: string
  ): Promise<void> {
    const response: ResponseMessage = {
      type: 'response',
      correlationId,
      timestamp: Date.now(),
      status: 'success',
      payload,
    };
    
    const message = JSON.stringify(response);
    const compressed = await this.messageCompressor.compress(message);
    socket.send(compressed);
    this.metrics.onMessage(Buffer.byteLength(message));
  }

  private async sendError(
    socket: WebSocket,
    error: string,
    correlationId?: string,
    retryAfter?: number
  ): Promise<void> {
    const response: ResponseMessage = {
      type: 'response',
      correlationId: correlationId ?? randomUUID(),
      timestamp: Date.now(),
      status: 'error',
      payload: error,
    };
    
    if (retryAfter) {
      const message = JSON.stringify({
        ...response,
        retryAfter,
      });
      const compressed = await this.messageCompressor.compress(message);
      socket.send(compressed);
      this.metrics.onMessage(Buffer.byteLength(message));
    } else {
      const message = JSON.stringify(response);
      const compressed = await this.messageCompressor.compress(message);
      socket.send(compressed);
      this.metrics.onMessage(Buffer.byteLength(message));
    }
  }

  public getStats(): {
    totalClients: number;
    activeHandlers: string[];
    pendingRequests: number;
    heartbeat: {
      activePings: number;
      missedHeartbeats: number;
    };
    metrics: ConnectionStats;
  } {
    const heartbeatStats = this.heartbeatMonitor.getStats();
    return {
      totalClients: this.clients.size,
      activeHandlers: Array.from(this.handlers.keys()),
      pendingRequests: this.pendingRequests.size,
      heartbeat: {
        activePings: heartbeatStats.activePings,
        missedHeartbeats: heartbeatStats.missedHeartbeats.size,
      },
      metrics: this.metrics.getStats(),
    };
  }
}