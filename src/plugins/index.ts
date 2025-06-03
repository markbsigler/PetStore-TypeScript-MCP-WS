import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fastifyHelmet from '@fastify/helmet';
import fastifyCors from '@fastify/cors';
import fastifyJwt from '@fastify/jwt';
import fastifyMultipart from '@fastify/multipart';
import fastifyRateLimit from '@fastify/rate-limit';
import fastifyStatic from '@fastify/static';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import websocketPlugin from './websocket.ts';
import redisPlugin from './redis.ts';
import securityPlugin from './security.ts';
import { errorHandler } from '../utils/errors.ts';
import { config } from '../config/index.ts';

export default async function registerPlugins(app: FastifyInstance) {
  // Error handling
  app.setErrorHandler(errorHandler);

  // Security plugins
  await app.register(securityPlugin);
  await app.register(fastifyHelmet);
  await app.register(fastifyCors, config.cors);
  await app.register(fastifyRateLimit, config.rateLimit);

  // Authentication
  await app.register(fastifyJwt, config.jwt);
  app.decorate('authenticate', async function(request: FastifyRequest, _reply: FastifyReply) {
    app.log.info({ url: request.url, method: request.method }, 'authenticate decorator called');
    try {
      await request.jwtVerify();
    } catch (err) {
      _reply.code(401).send({ error: 'Unauthorized' });
    }
  });

  // File handling
  await app.register(fastifyMultipart, {
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB
    },
  });
  await app.register(fastifyStatic, {
    root: process.cwd(),
    prefix: '/static/',
  });

  // API Documentation
  await app.register(fastifySwagger, {
    openapi: {
      info: {
        title: 'Petstore API',
        description: 'Professional TypeScript Node.js Microservice with WebSockets',
        version: '1.0.0',
      },
      servers: [
        {
          url: `http://${config.server.host}:${config.server.port}`,
        },
      ],
    },
  });

  await app.register(fastifySwaggerUi, {
    routePrefix: '/documentation',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: false,
    },
    staticCSP: true,
  });

  // WebSocket support
  await app.register(websocketPlugin);

  // Register Redis plugin before cache and others that depend on it
  await app.register(redisPlugin);

  // Only decorate, do NOT add a global hook
  // app.decorate('authenticate', async function(request: FastifyRequest, _reply: FastifyReply) {
  //   await request.jwtVerify();
  // });

  // Do NOT add any app.addHook('onRequest', ...) or similar for authentication here.
}
