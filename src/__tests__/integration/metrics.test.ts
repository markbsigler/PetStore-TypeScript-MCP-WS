import { FastifyInstance } from 'fastify';
import { build } from '../../app.ts';

describe('Metrics Integration Tests', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await build();
  });

  afterAll(async () => {
    await app.close();
  });

  // beforeEach(() => {
  //   registry.clear();
  // });

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

  it('should include default Node.js metrics', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/metrics',
    });

    const metricsText = response.payload;
    expect(metricsText).toContain('process_cpu_user_seconds_total');
    // Accept either legacy or current prom-client metric names
    expect(
      metricsText.includes('process_memory_heap_total_bytes') ||
      metricsText.includes('nodejs_heap_size_total_bytes')
    ).toBe(true);
  });

  it('should include custom WebSocket metrics', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/metrics',
    });

    const metricsText = response.payload;
    expect(metricsText).toContain('websocket_connections_current');
    expect(metricsText).toContain('websocket_messages_total');
  });
});