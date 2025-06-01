import { WebSocket } from 'ws';
import { Redis } from 'ioredis';
import { EventEmitter } from 'events';

// Extend global for custom test utilities
declare global {
  var createMockSocket: () => Partial<WebSocket>;
  var createMockRequest: (overrides?: Record<string, unknown>) => Record<string, unknown>;
  var wait: (ms: number) => Promise<void>;
}

// Mock WebSocket
jest.mock('ws', () => {
  return {
    WebSocket: jest.fn().mockImplementation(() => {
      return {
        on: jest.fn(),
        once: jest.fn(),
        send: jest.fn(),
        close: jest.fn(),
        ping: jest.fn(),
        readyState: WebSocket.OPEN,
      };
    }),
    OPEN: 1,
    CLOSED: 3,
  };
});

// Mock Redis
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => {
    const redis = new EventEmitter() as EventEmitter & Partial<Redis>;
    redis.connect = jest.fn().mockResolvedValue(undefined);
    redis.disconnect = jest.fn().mockResolvedValue(undefined);
    redis.quit = jest.fn().mockResolvedValue('OK');
    redis.publish = jest.fn().mockResolvedValue(1);
    redis.subscribe = jest.fn().mockResolvedValue(undefined);
    redis.duplicate = jest.fn().mockReturnValue(redis);
    return redis;
  });
});

// Add custom matchers
expect.extend({
  toBeWithinRange(received: number, floor: number, ceiling: number) {
    const pass = received >= floor && received <= ceiling;
    if (pass) {
      return {
        message: () =>
          `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      };
    } else {
      return {
        message: () =>
          `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      };
    }
  },
});

// Global test utilities
global.createMockSocket = () => {
  return {
    on: jest.fn(),
    once: jest.fn(),
    send: jest.fn(),
    close: jest.fn(),
    ping: jest.fn(),
    readyState: WebSocket.OPEN,
  };
};

global.createMockRequest = (overrides = {}) => {
  return {
    ip: '127.0.0.1',
    headers: {
      authorization: 'Bearer test-token',
      origin: 'http://localhost:3000',
    },
    ...overrides,
  };
};

global.wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Increase Jest timeout for all tests
jest.setTimeout(10000);

// Clean up timers after each test
afterEach(() => {
  jest.clearAllTimers();
  jest.useRealTimers();
}); 