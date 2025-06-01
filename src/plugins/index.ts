import { FastifyInstance } from 'fastify';
import fastifyHelmet from '@fastify/helmet';
import fastifyCors from '@fastify/cors';
import fastifyJwt from '@fastify/jwt';
import fastifyMultipart from '@fastify/multipart';
import fastifyRateLimit from '@fastify/rate-limit';
import fastifyStatic from '@fastify/static';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import websocketPlugin from './websocket.js';
import redisPlugin from './redis.js';
import { errorHandler } from '../utils/errors.js';
import { config } from '../config/index.js';

export default async function registerPlugins(app: FastifyInstance) {
  // Error handling
  app.setErrorHandler(errorHandler);

  // Security plugins
  await app.register(fastifyHelmet);
  await app.register(fastifyCors, config.cors);
  await app.register(fastifyRateLimit, config.rateLimit);

  // Authentication
  await app.register(fastifyJwt, config.jwt);

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

  // Add authentication hook
  app.addHook('onRequest', async (request, reply) => {
    try {
      // Remove routerPath check, just check for documentation path in request.url
      if (request.url && !request.url.startsWith('/documentation')) {
        await request.jwtVerify();
      }
    } catch (err) {
      reply.send(err);
    }
  });
}
