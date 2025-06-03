import fp from 'fastify-plugin';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';

// Basic Swagger configuration
export default fp(async (fastify) => {
  // Register Swagger
  await fastify.register(fastifySwagger, {
    swagger: {
      info: {
        title: 'PetStore API',
        description: 'A modern TypeScript implementation of the PetStore API with WebSocket support',
        version: '1.0.0'
      },
      externalDocs: {
        url: 'https://github.com/markbsigler/PetStore-TypeScript-MCP-WS',
        description: 'Find more info here'
      },
      host: 'localhost:3000',
      schemes: ['http'],
      consumes: ['application/json'],
      produces: ['application/json'],
      tags: [
        { name: 'pets', description: 'Pet operations' },
        { name: 'store', description: 'Store operations' },
        { name: 'users', description: 'User operations' },
        { name: 'auth', description: 'Authentication operations' }
      ],
      securityDefinitions: {
        bearerAuth: {
          type: 'apiKey',
          name: 'Authorization',
          in: 'header',
          description: 'JWT Authorization header using the Bearer scheme. Example: "Authorization: Bearer {token}"'
        }
      }
    }
  });

  // Register Swagger UI
  await fastify.register(fastifySwaggerUi, {
    routePrefix: '/documentation',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
      displayRequestDuration: true,
      filter: true,
      showExtensions: true,
      showCommonExtensions: true,
      tagsSorter: 'alpha',
      operationsSorter: 'method',
      defaultModelExpandDepth: 3,
      defaultModelsExpandDepth: 1,
      defaultModelRendering: 'example',
      displayOperationId: true,
      tryItOutEnabled: true
    },
    staticCSP: true,
    transformStaticCSP: (header: string) => header,
    logo: {
      type: 'image/svg+xml',
      content: Buffer.from(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 2L1 12h3v9h6v-6h4v6h6v-9h3L12 2z"/></svg>'
      ).toString('base64')
    },
    theme: {
      title: 'PetStore API Documentation'
    }
  });
});