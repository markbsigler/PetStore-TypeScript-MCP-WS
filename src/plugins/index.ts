import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fastifyHelmet from '@fastify/helmet';
import fastifyCors from '@fastify/cors';
import fastifyJwt from '@fastify/jwt';
import fastifyMultipart from '@fastify/multipart';
import fastifyRateLimit from '@fastify/rate-limit';
import fastifyStatic from '@fastify/static';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import fastifyWebSocket from '@fastify/websocket';
import websocketPlugin from './websocket.js';
import redisPlugin from './redis.js';
import securityPlugin from './security.js';
import { errorHandler } from '../utils/errors.js';
import { config } from '../config/index.js';

export default async function registerPlugins(app: FastifyInstance) {
  // Error handling
  app.setErrorHandler(errorHandler);

  // Security plugins
  await app.register(securityPlugin);
  await app.register(fastifyHelmet);
  await app.register(fastifyCors, config.cors);
  await app.register(fastifyRateLimit, config.rateLimit);

  // Authentication
  await app.register(fastifyJwt, {
    ...config.jwt,
    verify: {
      maxAge: '1h',
    },
  });

  app.decorate('authenticate', async function(request: FastifyRequest, _reply: FastifyReply) {
    app.log.info({ url: request.url, method: request.method }, 'authenticate decorator called');
    
    try {
      // Get the authorization header
      const authHeader = request.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new Error('No token provided');
      }
      
      const token = authHeader.split(' ')[1];
      
      // Verify the JWT token
      const decoded = await request.jwtVerify<{ username: string; id?: number }>();
      
      // Import the sessions map dynamically to avoid circular dependencies
      const { sessions } = await import('../controllers/UserController.js');
      const session = sessions.get(token);
      
      if (!session) {
        throw new Error('Session not found');
      }
      
      // Attach the user to the request for use in route handlers
      request.user = {
        username: decoded.username,
        id: decoded.id
      };
      
    } catch (err) {
      app.log.error({ err }, 'Authentication failed');
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
  console.log('\n=== Registering WebSocket support ===');
  
  // First register the @fastify/websocket plugin
  console.log('Registering @fastify/websocket plugin...');
  await app.register(fastifyWebSocket, {
    options: { maxPayload: 1048576 } // 1MB max payload
  });
  console.log('@fastify/websocket plugin registered successfully');
  
  // Then register our custom WebSocket plugin
  console.log('Registering custom WebSocket plugin...');
  if (typeof websocketPlugin !== 'function') {
    const error = new Error('WebSocket plugin is not a function');
    console.error('Invalid WebSocket plugin:', error);
    throw error;
  }
  
  try {
    await app.register(websocketPlugin);
    console.log('Custom WebSocket plugin registered successfully');
    
    // Log all registered routes after plugin registration
    const routes = app.routes || [];
    console.log('\n=== Registered Routes After WebSocket Plugin ===');
    routes.forEach((route: { method: string | string[]; url: string }) => {
      const methods = Array.isArray(route.method) ? route.method.join(',') : route.method;
      console.log(`${methods} ${route.url}`);
    });
    console.log('==============================================\n');
    
  } catch (error) {
    console.error('Failed to register custom WebSocket plugin:', error);
    app.log.error('Failed to register custom WebSocket plugin:', error);
    throw error;
  }

  // Register Redis plugin before cache and others that depend on it
  await app.register(redisPlugin);

  // Only decorate, do NOT add a global hook
  // app.decorate('authenticate', async function(request: FastifyRequest, _reply: FastifyReply) {
  //   await request.jwtVerify();
  // });

  // Do NOT add any app.addHook('onRequest', ...) or similar for authentication here.
}
