import fp from 'fastify-plugin';
import websocket from '@fastify/websocket';
import { FastifyPluginAsync } from 'fastify';
import { WebSocketManager } from '../websocket/WebSocketManager.ts';
import { registerPetHandlers } from '../websocket/handlers/pet.ts';

declare module 'fastify' {
  interface FastifyInstance {
    wsManager: WebSocketManager;
  }
}

const plugin: FastifyPluginAsync = fp(async (fastify) => {
  // Register WebSocket plugin
  await fastify.register(websocket, {
    options: { maxPayload: 1048576 }, // 1MB max payload
  });

  // Create WebSocket manager
  const wsManager = new WebSocketManager(fastify);
  fastify.decorate('wsManager', wsManager);

  // Register WebSocket action handlers
  registerPetHandlers(fastify);

  // Register WebSocket route with /api/v1 prefix
  fastify.get('/api/v1/ws', { websocket: true }, (connection, req) => {
    fastify.log.info({
      msg: 'WebSocket client connected',
      ip: req.ip,
      id: req.id,
    });

    wsManager.addClient(connection.socket, req.ip);

    connection.socket.on('close', () => {
      fastify.log.info({
        msg: 'WebSocket client disconnected',
        ip: req.ip,
        id: req.id,
      });
    });
  });

  // Clean up on server close
  fastify.addHook('onClose', async () => {
    fastify.log.info('Cleaning up WebSocket connections');
  });
});

export default plugin;
