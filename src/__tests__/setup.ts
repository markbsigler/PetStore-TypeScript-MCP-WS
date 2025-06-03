// Only run jest.mock if jest is defined (workaround for ESM/ts-jest setup issues)
if (typeof jest !== 'undefined') {
  // Mock @fastify/websocket with a simple object
  jest.mock('@fastify/websocket', () => ({
    __esModule: true,
    default: jest.fn(() => ({
      default: jest.fn().mockImplementation((fastify) => {
        const mockServer = {
          on: jest.fn(),
          close: jest.fn(),
          address: jest.fn().mockReturnValue({ port: 3000 }),
        };
        fastify.decorate('websocketServer', mockServer);
        return Promise.resolve();
      }),
    })),
  }));

  // Mock WebSocket
  jest.mock('ws', () => ({
    __esModule: true,
    default: jest.requireActual('../../src/__mocks__/ws').default,
    WebSocket: jest.requireActual('../../src/__mocks__/ws').WebSocket,
  }));
  
  // Mock our custom WebSocket plugin
  jest.mock('../../src/plugins/websocket', () => ({
    __esModule: true,
    default: jest.fn(() => ({
      default: jest.fn(),
    })),
  }));

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
        message: function() {
          return `expected ${received} to be within range ${floor} - ${ceiling}`;
        },
        pass: false,
      };
    }
  },
});
