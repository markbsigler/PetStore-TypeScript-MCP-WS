import fp from 'fastify-plugin';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import pkg from '../../package.json' with { type: 'json' };

export default fp(async (fastify) => {
  await fastify.register(swagger, {
    swagger: {
      info: {
        title: 'PetStore API',
        description: 'A modern TypeScript implementation of the PetStore API with WebSocket support',
        version: pkg.version,
      },
      externalDocs: {
        url: 'https://github.com/your-username/PetStore-TypeScript-MCP-WS',
        description: 'Find more info here',
      },
      host: 'localhost:3000',
      schemes: ['http'],
      consumes: ['application/json'],
      produces: ['application/json'],
      tags: [
        { name: 'pet', description: 'Pet operations' },
        { name: 'store', description: 'Store operations' },
        { name: 'user', description: 'User operations' },
        { name: 'auth', description: 'Authentication operations' },
      ],
      securityDefinitions: {
        bearerAuth: {
          type: 'apiKey',
          name: 'Authorization',
          in: 'header',
        },
      },
    },
  });

  await fastify.register(swaggerUi, {
    routePrefix: '/documentation',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: false,
    },
    uiHooks: {
      onRequest: function (request, reply, next) {
        next();
      },
      preHandler: function (request, reply, next) {
        next();
      },
    },
    staticCSP: true,
    transformStaticCSP: (header) => header,
  });
});