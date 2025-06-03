import { FastifyInstance as OriginalFastifyInstance, FastifyRequest as OriginalFastifyRequest } from 'fastify';

declare module 'fastify' {
  interface FastifyInstance extends OriginalFastifyInstance {
    routes?: Array<{
      method: string | string[];
      url: string;
      path: string;
      prefix: string;
      routePath: string;
      routeOptions: Record<string, unknown>;
    }>;
  }

  interface FastifyRequest extends OriginalFastifyRequest {
    user?: {
      username: string;
      id?: number;
    };
  }

  interface FastifyContextConfig {
    user?: {
      username: string;
      id?: number;
    };
  }
}
