import fp from 'fastify-plugin';

declare module 'fastify' {
  interface FastifyInstance {
    redis: import('redis').RedisClientType;
    cache: {
      get<T>(key: string): Promise<T | null>;
      set<T>(key: string, value: T, ttl?: number): Promise<void>;
      del(key: string): Promise<void>;
      invalidatePattern(pattern: string): Promise<void>;
    };
  }
}

export interface CacheOptions {
  defaultTTL?: number;
  prefix?: string;
}

const defaultOptions: CacheOptions = {
  defaultTTL: 3600, // 1 hour
  prefix: 'cache:',
};

fp(async (fastify, options) => {
  const { defaultTTL, prefix } = { ...defaultOptions, ...options };

  const cache = {
    async get<T>(key: string): Promise<T | null> {
      const value = await fastify.redis.get(`${prefix}${key}`);
      if (!value) return null;
      try {
        return JSON.parse(value) as T;
      } catch (error) {
        fastify.log.error({ msg: 'Cache parse error', error, key });
        return null;
      }
    },

    async set<T>(key: string, value: T, ttl?: number): Promise<void> {
      try {
        const serialized = JSON.stringify(value);
        await fastify.redis.setEx(`${prefix}${key}`, Number(ttl ?? defaultTTL), serialized);
      } catch (error) {
        fastify.log.error({ msg: 'Cache set error', error, key });
      }
    },

    async del(key: string): Promise<void> {
      await fastify.redis.del(`${prefix}${key}`);
    },

    async invalidatePattern(pattern: string): Promise<void> {
      const keys = await fastify.redis.keys(`${prefix}${pattern}`);
      if (Array.isArray(keys) && keys.length > 0) {
        for (const key of keys) {
          await fastify.redis.del(key);
        }
      }
    },
  };

  fastify.decorate('cache', cache);

  // Add cache clear on server close
  fastify.addHook('onClose', async () => {
    const keys = await fastify.redis.keys(`${prefix}*`);
    if (Array.isArray(keys) && keys.length > 0) {
      for (const key of keys) {
        await fastify.redis.del(key);
      }
    }
  });
});
