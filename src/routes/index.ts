import { FastifyInstance } from 'fastify';
import petRoutes from './pet.routes.ts';
import userRoutes from './user.routes.ts';
import storeRoutes from './store.routes.ts';
import healthPlugin from './health.ts';
import metricsPlugin from './metrics.ts';
import rootPlugin from './root.ts';

export default async function registerRoutes(app: FastifyInstance) {
  // Register REST route plugins with Fastify and proper prefixes
  await app.register(petRoutes, { prefix: '/api/v1' });
  await app.register(userRoutes, { prefix: '/api/v1' });
  await app.register(storeRoutes, { prefix: '/api/v1' });
  
  // Register health and metrics endpoints (no prefix for these)
  await app.register(healthPlugin);
  await app.register(metricsPlugin);
  
  // Register root endpoint last (no prefix)
  await app.register(rootPlugin);
}
