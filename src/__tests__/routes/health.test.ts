import { FastifyInstance } from 'fastify';
import healthPlugin from '../../routes/health.ts';

describe('health route', () => {
  let fastify: FastifyInstance;
  beforeEach(async () => {
    const f = (await import('fastify')).default;
    fastify = f();
    await fastify.register(healthPlugin);
    await fastify.ready();
  });
  afterEach(async () => {
    await fastify.close();
  });

  it('should return healthy status and valid structure', async () => {
    // @ts-ignore
    const orig = fastify.redis;
    // @ts-ignore
    fastify.redis = { ping: async () => {} };
    const res = await fastify.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.status).toBe('ok');
    expect(body.services.redis).toBeDefined();
    expect(body.services.api).toBeDefined();
    expect(typeof body.uptime).toBe('number');
    expect(typeof body.version).toBe('string');
    // @ts-ignore
    fastify.redis = orig;
  });

  it('should degrade redis status if latency is high', async () => {
    // @ts-ignore
    const orig = fastify.redis;
    // @ts-ignore
    fastify.redis = { ping: async () => { await new Promise(r => setTimeout(r, 200)); } };
    const res = await fastify.inject({ method: 'GET', url: '/health' });
    const body = JSON.parse(res.body);
    expect(body.services.redis.status).toBe('degraded');
    // @ts-ignore
    fastify.redis = orig;
  });
});
