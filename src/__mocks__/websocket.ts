import { FastifyPluginAsync } from 'fastify';

// Simple mock implementation that satisfies the type checker
export const mockWebSocketPlugin: FastifyPluginAsync = async (fastify) => {
  // Create a simple mock object with just the methods we need for testing
  const mockWsManager = {
    addClient: jest.fn().mockImplementation(() => {
      // Mock implementation
    }),
    // Add other methods as needed for tests
    on: jest.fn().mockReturnThis(),
    off: jest.fn().mockReturnThis(),
    emit: jest.fn().mockReturnThis(),
    getClient: jest.fn().mockReturnValue(undefined),
    // Add type assertions to satisfy TypeScript
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as unknown as any; // We use type assertion here to simplify the mock
  
  // Decorate the fastify instance with our mock
  fastify.decorate('wsManager', mockWsManager);

  // Add cleanup hook
  fastify.addHook('onClose', async () => {
    // Cleanup if needed
  });
};

export default mockWebSocketPlugin;
