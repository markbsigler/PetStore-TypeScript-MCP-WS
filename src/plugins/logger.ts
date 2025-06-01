import fp from 'fastify-plugin';
import { randomUUID } from 'crypto';
import { FastifyRequest } from 'fastify';

declare module 'fastify' {
  interface FastifyRequest {
    correlationId: string;
  }
}

export default fp(async (fastify) => {
  // Add correlation ID to each request
  fastify.decorateRequest('correlationId', '');

  fastify.addHook('onRequest', async (request: FastifyRequest) => {
    const correlationId = request.headers['x-correlation-id'] as string || randomUUID();
    request.correlationId = correlationId;
  });

  // Remove or comment out fastify.log.formatters assignment and related custom formatting code.
  // Use Fastify's built-in logger configuration instead.

  // Add response logging
  fastify.addHook('onResponse', async (request, reply) => {
    fastify.log.info({
      msg: 'request completed',
      correlationId: request.correlationId,
      method: request.method,
      url: request.url,
      statusCode: reply.statusCode,
      // responseTime: reply.getResponseTime(), // Removed, not standard
    });
  });

  // Add error logging
  fastify.setErrorHandler((error, request: FastifyRequest, reply) => {
    fastify.log.error({
      msg: 'request error',
      correlationId: request.correlationId,
      error: {
        message: error.message,
        stack: error.stack,
        code: error.code,
      },
    });
    reply.send(error);
  });
});