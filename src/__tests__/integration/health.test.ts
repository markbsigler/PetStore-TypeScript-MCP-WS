import { FastifyInstance } from 'fastify';
import { build } from '../../app.ts';

describe('Health Check Integration Tests', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await build();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should return 200 OK on health check endpoint', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.status).toBe('ok');
    expect(typeof body.timestamp).toBe('string');
    expect(typeof body.uptime).toBe('number');
    expect(body.version).toBeDefined();
    expect(body.services).toBeDefined();
    expect(body.services.redis).toBeDefined();
    expect(['healthy', 'degraded']).toContain(body.services.redis.status);
    expect(typeof body.services.redis.latency).toBe('number');
    expect(body.services.api).toBeDefined();
    expect(body.services.api.status).toBe('healthy');
    expect(body.services.api.memory).toBeDefined();
    expect(typeof body.services.api.memory.heapUsed).toBe('number');
    expect(typeof body.services.api.memory.heapTotal).toBe('number');
    expect(typeof body.services.api.memory.external).toBe('number');
  });
});