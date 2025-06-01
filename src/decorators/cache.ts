import { FastifyReply, FastifyRequest, RouteHandlerMethod, FastifyInstance } from 'fastify';

export interface CacheConfig {
  ttl?: number;
  key?: (request: FastifyRequest) => string;
}

const defaultKeyGenerator = (request: FastifyRequest): string => {
  const queryString = request.query ? `?${new URLSearchParams(request.query as Record<string, string>).toString()}` : '';
  return `${request.method}:${request.url}${queryString}`;
};

export function withCache(config: CacheConfig = {}): (target: RouteHandlerMethod) => RouteHandlerMethod {
  return (handler: RouteHandlerMethod): RouteHandlerMethod => {
    return async function (this: unknown, request: FastifyRequest, reply: FastifyReply) {
      const { ttl } = config;
      const keyGenerator = config.key || defaultKeyGenerator;
      const cacheKey = keyGenerator(request);

      // Try to get from cache
      // @ts-expect-error legacy decorator, cache is unknown
      const cached = await (this.cache as { get: (key: string) => Promise<unknown> }).get(cacheKey);
      if (cached) {
        reply.header('X-Cache', 'HIT');
        return cached;
      }

      reply.header('X-Cache', 'MISS');

      // Execute handler
      const result = await (handler as RouteHandlerMethod).call(this as FastifyInstance, request, reply);

      // Cache the result
      if (result && reply.statusCode === 200) {
        // @ts-expect-error legacy decorator, cache is unknown
        await (this.cache as { set: (key: string, value: unknown, ttl?: number) => Promise<void> }).set(cacheKey, result, ttl);
      }

      return result;
    };
  };
}