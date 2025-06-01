import fp from 'fastify-plugin';
import { FastifyPluginAsync, FastifyRequest } from 'fastify';

export interface SearchQuery {
  q?: string;
  fields?: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    search: {
      query: string;
      fields: string[];
    };
  }
}

const searchPlugin: FastifyPluginAsync = fp(async (fastify) => {
  fastify.decorateRequest('search');

  fastify.addHook('preHandler', async (request: FastifyRequest) => {
    const query = request.query as SearchQuery;
    
    request.search = {
      query: query.q || '',
      fields: query.fields?.split(',') || [],
    };
  });
});

export default searchPlugin;

export function createSearchFilter(search: FastifyRequest['search']) {
  if (!search.query) {
    return {};
  }

  const fields = search.fields.length > 0 ? search.fields : ['name', 'description'];
  const searchRegex = new RegExp(search.query, 'i');

  return {
    $or: fields.map(field => ({
      [field]: searchRegex,
    })),
  };
}

export function applySearch<T>(items: T[], search: FastifyRequest['search']): T[] {
  if (!search.query) {
    return items;
  }

  const fields = search.fields.length > 0 ? search.fields : ['name', 'description'];
  const searchRegex = new RegExp(search.query, 'i');

  return items.filter(item =>
    fields.some(field =>
      typeof (item as Record<string, unknown>)[field] === 'string' &&
      searchRegex.test((item as Record<string, unknown>)[field] as string)
    )
  );
}