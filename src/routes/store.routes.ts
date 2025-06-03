import { FastifyInstance } from 'fastify';
import { registerStoreRoutes } from '../controllers/StoreController.ts';

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: import('fastify').FastifyRequest, reply: import('fastify').FastifyReply) => Promise<void>;
  }
}

async function storeRoutes(fastify: FastifyInstance) {
  fastify.log.info('Registering store routes');
  // Register store routes directly on the main instance
  await registerStoreRoutes(fastify, fastify.authenticate);
}

export default storeRoutes;
