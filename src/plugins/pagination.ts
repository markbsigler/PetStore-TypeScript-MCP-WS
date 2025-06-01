import fp from 'fastify-plugin';
import { FastifyPluginAsync, FastifyRequest } from 'fastify';

export interface PaginationQuery {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

declare module 'fastify' {
  interface FastifyRequest {
    pagination: {
      page: number;
      limit: number;
      skip: number;
      sort?: string;
      order: 'asc' | 'desc';
    };
  }
}

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;

const paginationPlugin: FastifyPluginAsync = fp(async (fastify) => {
  fastify.decorateRequest('pagination');

  fastify.addHook('preHandler', async (request: FastifyRequest) => {
    const query = request.query as PaginationQuery;
    
    const page = Math.max(1, parseInt(query.page?.toString() ?? DEFAULT_PAGE.toString()));
    const limit = Math.max(1, parseInt(query.limit?.toString() ?? DEFAULT_LIMIT.toString()));
    const skip = (page - 1) * limit;
    const sort = query.sort;
    const order = query.order ?? 'asc';

    request.pagination = {
      page,
      limit,
      skip,
      sort,
      order,
    };
  });
});

export default paginationPlugin;

export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number
): PaginatedResponse<T> {
  const totalPages = Math.ceil(total / limit);

  return {
    data,
    meta: {
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
}