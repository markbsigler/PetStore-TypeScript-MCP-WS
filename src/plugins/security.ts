import fp from 'fastify-plugin';
import csrf from '@fastify/csrf-protection';
import helmet from '@fastify/helmet';
import { FastifyPluginAsync, FastifyRequest } from 'fastify';
import crypto from 'crypto';

declare module 'fastify' {
  interface FastifyRequest {
    id: string;
  }
}

const securityPlugin: FastifyPluginAsync = fp(async (fastify) => {
  // Add CSRF protection
  await fastify.register(csrf, {
    sessionPlugin: '@fastify/session',
    getToken: (req) => {
      return req.headers['csrf-token'] as string;
    },
  });

  // Enhanced security headers
  await fastify.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
    crossOriginEmbedderPolicy: true,
    crossOriginOpenerPolicy: true,
    crossOriginResourcePolicy: { policy: 'same-site' },
    originAgentCluster: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    strictTransportSecurity: {
      maxAge: 15552000,
      includeSubDomains: true,
    },
    xssFilter: true,
  });

  // Add request ID to each request
  fastify.addHook('onRequest', async (request: FastifyRequest, reply) => {
    const requestId = request.headers['x-request-id'] as string || crypto.randomUUID();
    request.id = requestId;
    reply.header('x-request-id', requestId);
  });

  // Add security middleware
  fastify.addHook('onRequest', async (request, reply) => {
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('X-Frame-Options', 'DENY');
    reply.header('X-XSS-Protection', '1; mode=block');
    reply.header('X-Download-Options', 'noopen');
    reply.header('X-Permitted-Cross-Domain-Policies', 'none');
  });
});

export default securityPlugin;

