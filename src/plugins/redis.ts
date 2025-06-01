import fp from 'fastify-plugin';
import { createClient, RedisClientType } from 'redis';
import { FastifyPluginAsync } from 'fastify';

const redisPlugin: FastifyPluginAsync = fp(async (fastify) => {
  const client: RedisClientType = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  });
  await client.connect();
  fastify.decorate('redis', client);

  fastify.addHook('onClose', async () => {
    await client.quit();
  });
});

export default redisPlugin;
