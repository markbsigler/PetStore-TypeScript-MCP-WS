import { FastifyPluginAsync } from 'fastify';
import { Type } from '@sinclair/typebox';
import os from 'os';

const plugin: FastifyPluginAsync = async (fastify) => {
  // Initialize metrics
  let requestCount = 0;
  let errorCount = 0;
  const startTime = Date.now();

  // Add hook to track requests
  fastify.addHook('onRequest', async () => {
    requestCount++;
  });

  // Add hook to track errors
  fastify.addHook('onError', async () => {
    errorCount++;
  });

  // Rename the JSON metrics endpoint to /metrics/json to avoid conflict with Prometheus /metrics
  fastify.get('/metrics/json', {
    schema: {
      tags: ['metrics'],
      summary: 'Application metrics endpoint (JSON)',
      description: 'Returns various metrics about the application performance in JSON',
      response: {
        200: Type.Object({
          timestamp: Type.String({ format: 'date-time' }),
          uptime: Type.Number(),
          requests: Type.Object({
            total: Type.Number(),
            errors: Type.Number(),
            successRate: Type.Number(),
          }),
          system: Type.Object({
            memory: Type.Object({
              total: Type.Number(),
              free: Type.Number(),
              used: Type.Number(),
              heapTotal: Type.Number(),
              heapUsed: Type.Number(),
            }),
            cpu: Type.Object({
              loadAvg: Type.Array(Type.Number()),
              cores: Type.Number(),
              usage: Type.Number(),
            }),
          }),
        }),
      },
    },
    handler: async () => {
      const memTotal = os.totalmem();
      const memFree = os.freemem();
      const memUsed = memTotal - memFree;
      const { heapTotal, heapUsed } = process.memoryUsage();

      return {
        timestamp: new Date().toISOString(),
        uptime: (Date.now() - startTime) / 1000,
        requests: {
          total: requestCount,
          errors: errorCount,
          successRate: requestCount > 0 ? ((requestCount - errorCount) / requestCount) * 100 : 100,
        },
        system: {
          memory: {
            total: memTotal,
            free: memFree,
            used: memUsed,
            heapTotal,
            heapUsed,
          },
          cpu: {
            loadAvg: os.loadavg(),
            cores: os.cpus().length,
            usage: process.cpuUsage().user / 1000000,
          },
        },
      };
    },
  });
};

export default plugin;