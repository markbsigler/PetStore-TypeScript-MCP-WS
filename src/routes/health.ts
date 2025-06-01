import { FastifyPluginAsync } from 'fastify';
import { Type } from '@sinclair/typebox';
import process from 'process';

const plugin: FastifyPluginAsync = async (fastify) => {
  const healthSchema = {
    response: {
      200: Type.Object({
        status: Type.String(),
        timestamp: Type.String(),
        uptime: Type.Number(),
        version: Type.String(),
        services: Type.Object({
          redis: Type.Object({
            status: Type.String(),
            latency: Type.Number(),
          }),
          api: Type.Object({
            status: Type.String(),
            memory: Type.Object({
              heapUsed: Type.Number(),
              heapTotal: Type.Number(),
              external: Type.Number(),
            }),
          }),
        }),
      }),
    },
  };

  fastify.get('/health', {
    schema: healthSchema,
    handler: async () => {
      const redisLatency = await checkRedisLatency(fastify);
      const memory = process.memoryUsage();

      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.npm_package_version ?? '1.0.0',
        services: {
          redis: {
            status: redisLatency < 100 ? 'healthy' : 'degraded',
            latency: redisLatency,
          },
          api: {
            status: 'healthy',
            memory: {
              heapUsed: Math.round(memory.heapUsed / 1024 / 1024),
              heapTotal: Math.round(memory.heapTotal / 1024 / 1024),
              external: Math.round(memory.external / 1024 / 1024),
            },
          },
        },
      };
    },
  });
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function checkRedisLatency(fastify: any): Promise<number> {
  const start = process.hrtime();
  await fastify.redis.ping();
  const [seconds, nanoseconds] = process.hrtime(start);
  return Math.round((seconds * 1000) + (nanoseconds / 1000000));
}

export default plugin;
