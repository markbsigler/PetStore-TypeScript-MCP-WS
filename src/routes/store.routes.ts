import { FastifyInstance } from 'fastify';
import { registerStoreRoutes } from '../controllers/StoreController.js';

export default async function (fastify: FastifyInstance) {
  await fastify.register(registerStoreRoutes);
}
