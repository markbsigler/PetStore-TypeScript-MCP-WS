import fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { registry } from './monitoring/metrics.ts';
import registerRoutes from './routes/index.ts';

export async function build(): Promise<FastifyInstance> {
  const app: FastifyInstance = fastify({
    logger: true,
  });

  // Register plugins
  await app.register(cors, {
    origin: true,
    credentials: true,
  });

  // Register Redis plugin before routes
  const redisPlugin = (await import('./plugins/redis.ts')).default;
  await app.register(redisPlugin);

  // Register all routes (including /metrics)
  await registerRoutes(app);

  app.addHook('onClose', async () => {
    registry.clear();
  });

  return app;
}
