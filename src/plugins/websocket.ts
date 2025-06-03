console.log('=== WebSocket plugin module is being imported ===');

import fp from 'fastify-plugin';
import { FastifyPluginAsync } from 'fastify';
import { WebSocketManager } from '../websocket/WebSocketManager.js';
import { registerPetHandlers } from '../websocket/handlers/pet.js';

declare module 'fastify' {
  interface FastifyInstance {
    wsManager: WebSocketManager;
  }
}

// Register WebSocket plugin first, before anything else
const plugin: FastifyPluginAsync = async (fastify, options) => {
  console.log('WebSocket plugin is being loaded');
  fastify.log.info('WebSocket plugin is being loaded');
  
  try {
    console.log('WebSocket plugin options:', options);
    
    // Create WebSocket manager
    fastify.log.info('Creating WebSocketManager instance');
    const wsManager = new WebSocketManager(fastify);
    fastify.decorate('wsManager', wsManager);

    // Register WebSocket action handlers
    fastify.log.info('Registering WebSocket handlers');
    registerPetHandlers(fastify);

    // Use the prefix from options or default to empty string
    const prefix = (options as { prefix?: string })?.prefix || '';
    const wsPath = `${prefix}/ws/connection`;
    const wsTestPath = `${prefix}/ws/test`;
    
    console.log(`Registering WebSocket route at ${wsPath}`);
    fastify.log.info(`Registering WebSocket route at ${wsPath}`);
    
    // Register routes directly without fastify.after()
    // Register a simple GET route for testing
    fastify.get(wsTestPath, async (_request, _reply) => {
      return { status: 'WebSocket test endpoint' };
    });
    
    // Register WebSocket endpoint
    fastify.get(wsPath, { websocket: true }, (connection, req) => {
      console.log('New WebSocket connection:', req.url);
      fastify.log.info('New WebSocket connection:', req.url);
      
      // Handle new connection
      const clientId = wsManager.addClient(connection.socket, req.ip);
      console.log(`New WebSocket client connected with ID: ${clientId}`);
      
      // Handle disconnection
      connection.socket.on('close', () => {
        console.log(`WebSocket client disconnected: ${clientId}`);
        fastify.log.info(`WebSocket client disconnected: ${clientId}`);
      });
      
      // Handle errors
      connection.socket.on('error', (error) => {
        console.error(`WebSocket error for client ${clientId}:`, error);
        fastify.log.error(`WebSocket error for client ${clientId}:`, error);
      });
    });
    
    console.log('WebSocket plugin has been registered');
    fastify.log.info('WebSocket plugin has been registered');
    
  } catch (error) {
    fastify.log.error('Error in WebSocket plugin:', error);
    throw error;
  }
};

// This plugin should be registered after @fastify/websocket
export default fp(plugin, {
  fastify: '5.x',
  name: 'websocket-plugin',
  dependencies: ['@fastify/websocket']
});

// Also export a named function for better debugging
export const websocketPlugin = plugin;
