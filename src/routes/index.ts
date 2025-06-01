import { FastifyInstance } from 'fastify';
import healthPlugin from './health.ts';

export default async function registerRoutes(app: FastifyInstance) {
  // Register health check route
  await app.register(healthPlugin);

  // Register metrics plugin (Prometheus)
  const metricsPlugin = (await import('../plugins/metrics.ts')).default;
  await app.register(metricsPlugin);

  // Register other routes
  // TODO: Add pet routes, user routes, etc.
}
