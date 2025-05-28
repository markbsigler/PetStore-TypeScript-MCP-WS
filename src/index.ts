import fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import websocket from '@fastify/websocket';
import { Server } from 'socket.io';
import config from './config';
import { setupWebSocketHandlers } from './websocket';

const app = fastify({
  logger: {
    level: config.logging.level,
  },
});

// Register plugins
async function registerPlugins(): Promise<void> {
  // CORS
  await app.register(cors, {
    origin: config.cors.origin,
    methods: config.cors.methods,
  });

  // JWT
  await app.register(jwt, {
    secret: config.jwt.secret,
  });

  // Rate limiting
  await app.register(rateLimit, {
    max: config.rateLimit.max,
    timeWindow: config.rateLimit.window * 1000,
  });

  // Swagger documentation
  await app.register(swagger, {
    routePrefix: config.swagger.path,
    swagger: {
      info: {
        title: 'PetStore API',
        description: 'PetStore API with WebSocket support',
        version: '1.0.0',
      },
      host: `localhost:${config.server.port}`,
      schemes: ['http'],
      consumes: ['application/json'],
      produces: ['application/json'],
      securityDefinitions: {
        bearerAuth: {
          type: 'apiKey',
          name: 'Authorization',
          in: 'header',
        },
      },
    },
    exposeRoute: true,
  });

  // WebSocket support
  await app.register(websocket);
}

// Start the server
async function start(): Promise<void> {
  try {
    await registerPlugins();

    // Create Socket.IO server
    const io = new Server(app.server, {
      path: config.websocket.path,
      cors: {
        origin: config.cors.origin,
        methods: config.cors.methods,
      },
    });

    // Setup WebSocket handlers
    setupWebSocketHandlers(io);

    // Start listening
    await app.listen({
      port: config.server.port,
      host: '0.0.0.0',
    });

    app.log.info(`Server listening on port ${config.server.port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  app.log.info('SIGTERM received, shutting down...');
  await app.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  app.log.info('SIGINT received, shutting down...');
  await app.close();
  process.exit(0);
});

// Start the application
if (require.main === module) {
  start();
}

export default app; 