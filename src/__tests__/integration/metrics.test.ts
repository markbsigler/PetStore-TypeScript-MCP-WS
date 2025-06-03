import { FastifyInstance } from 'fastify';
import Fastify from 'fastify';
import metricsPlugin from '../../routes/metrics.ts';

describe('Metrics Integration Tests', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify();
    await app.register(metricsPlugin);
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should expose metrics endpoint', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/metrics',
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toMatch(/^text\/plain/);
    
    // Verify basic metrics structure
    const metricsText = response.payload;
    expect(metricsText).toContain('# HELP');
    expect(metricsText).toContain('# TYPE');
  });

  it('should include application metrics', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/metrics',
    });

    const metricsText = response.payload;
    // Verify our custom metrics are present
    expect(metricsText).toContain('app_uptime_seconds');
    expect(metricsText).toContain('app_requests_total');
  });

  it('should include basic application metrics', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/metrics',
    });

    const metricsText = response.payload;
    // Verify the basic metrics that are actually being exposed
    expect(metricsText).toContain('app_uptime_seconds');
    expect(metricsText).toContain('app_requests_total');
    expect(metricsText).toContain('app_errors_total');
  });
});