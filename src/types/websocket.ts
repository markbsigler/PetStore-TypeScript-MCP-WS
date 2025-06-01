import type { WebSocket } from 'ws';
import { z } from 'zod';

// Base message schema
export const BaseMessageSchema = z.object({
  type: z.enum(['request', 'response', 'notification']),
  correlationId: z.string().uuid(),
  timestamp: z.number(),
});

// Request message schema
export const RequestMessageSchema = BaseMessageSchema.extend({
  type: z.literal('request'),
  action: z.string(),
  payload: z.unknown(),
});

// Response message schema
export const ResponseMessageSchema = BaseMessageSchema.extend({
  type: z.literal('response'),
  status: z.enum(['success', 'error']),
  payload: z.unknown(),
});

// Notification message schema
export const NotificationMessageSchema = BaseMessageSchema.extend({
  type: z.literal('notification'),
  event: z.string(),
  payload: z.unknown(),
});

// Message union type
export const WebSocketMessageSchema = z.discriminatedUnion('type', [
  RequestMessageSchema,
  ResponseMessageSchema,
  NotificationMessageSchema,
]);

// TypeScript types
export type BaseMessage = z.infer<typeof BaseMessageSchema>;
export type RequestMessage = z.infer<typeof RequestMessageSchema>;
export type ResponseMessage = z.infer<typeof ResponseMessageSchema>;
export type NotificationMessage = z.infer<typeof NotificationMessageSchema>;
export type WebSocketMessage = z.infer<typeof WebSocketMessageSchema>;

// Request handler type
export type WebSocketRequestHandler<T = unknown, R = unknown> = (
  payload: T,
  client: WebSocket,
  correlationId: string
) => Promise<R>;

// Error types
export class WebSocketTimeoutError extends Error {
  constructor(correlationId: string) {
    super(`Request ${correlationId} timed out`);
    this.name = 'WebSocketTimeoutError';
  }
}

export class WebSocketValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WebSocketValidationError';
  }
}