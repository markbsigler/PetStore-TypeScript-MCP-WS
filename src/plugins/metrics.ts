import fp from 'fastify-plugin';
import { FastifyPluginAsync } from 'fastify';
import { registry } from '../monitoring/metrics.ts';

const metricsPlugin: FastifyPluginAsync = fp(async (fastify) => {
  // Expose metrics endpoint using the shared registry
  fastify.get('/metrics', async (request, reply) => {
    reply.header('Content-Type', registry.contentType);
    return registry.metrics();
  });
});

export default metricsPlugin;