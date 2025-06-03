import { FastifyPluginAsync } from 'fastify';

const rootPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', async (_request, reply) => {
    return reply.send({
      message: 'Welcome to the Pet Store API',
      version: '1.0.0',
      docs: '/documentation',
      health: '/health',
      metrics: '/metrics',
    });
  });
};

export default rootPlugin;
