import { FastifyInstance } from 'fastify';
import petRoutes from './pet.routes.ts';
import userRoutes from './user.routes.ts';
import storeRoutes from './store.routes.ts';
import healthPlugin from './health.ts';
import metricsPlugin from './metrics.ts';
import rootPlugin from './root.ts';

export default async function registerRoutes(app: FastifyInstance) {
  // Register REST route plugins with Fastify
  await app.register(petRoutes);
  await app.register(userRoutes);
  await app.register(storeRoutes);
  // Register health and metrics endpoints
  await app.register(healthPlugin);
  await app.register(metricsPlugin);
  // Register root endpoint last
  await app.register(rootPlugin);
}
