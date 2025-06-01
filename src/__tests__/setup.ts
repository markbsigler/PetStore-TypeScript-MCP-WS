import { WebSocket } from 'ws';

// Extend global for custom test utilities
declare global {
  var createMockSocket: () => Partial<WebSocket>;
  var createMockRequest: (overrides?: Record<string, unknown>) => Record<string, unknown>;
  var wait: (ms: number) => Promise<void>;
}

// Only run jest.mock if jest is defined (workaround for ESM/ts-jest setup issues)
if (typeof jest !== 'undefined') {
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
          readyState: 1, // WebSocket.OPEN
        };
      }),
      OPEN: 1,
      CLOSED: 3,
    };
  });

  // Mock Redis
  jest.mock('ioredis', () => {
    const EventEmitter = require('events');
    const redis = Object.assign(new EventEmitter(), {
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined),
      quit: jest.fn().mockResolvedValue('OK'),
      publish: jest.fn().mockResolvedValue(1),
      subscribe: jest.fn().mockResolvedValue(undefined),
      duplicate: jest.fn().mockReturnValue(this),
    });
    return jest.fn().mockImplementation(() => redis);
  });

  // Increase Jest timeout for all tests
  jest.setTimeout(10000);

  // Clean up timers after each test
  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });
}

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