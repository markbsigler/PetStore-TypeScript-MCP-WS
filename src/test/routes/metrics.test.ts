import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { TestContext, setupTestEnvironment, teardownTestEnvironment } from '../setup.js';

describe('Metrics Endpoint', () => {
  let context: TestContext;

  beforeAll(async () => {
    context = await setupTestEnvironment();
  });

  afterAll(async () => {
    await teardownTestEnvironment(context);
  });

  test('GET /metrics should return 200 and Prometheus metrics', async () => {
    const response = await context.app.inject({
      method: 'GET',
      url: '/metrics',
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toBe('text/plain; version=0.0.4; charset=utf-8');
    
    const body = response.payload;
    
    // Check for required metric types
    expect(body).toContain('# HELP http_requests_total Total number of HTTP requests');
    expect(body).toContain('# HELP http_request_duration_seconds HTTP request duration in seconds');
    
    // Check metric format
    expect(body).toMatch(/http_requests_total{.*} \d+/);
    expect(body).toMatch(/http_request_duration_seconds_bucket{.*} \d+/);
  });

  test('Metrics should be updated after HTTP requests', async () => {
    // Make initial metrics request
    const initial = await context.app.inject({
      method: 'GET',
      url: '/metrics',
    });
    const initialCount = countMetric(initial.payload, 'http_requests_total');

    // Make a test request
    await context.app.inject({
      method: 'GET',
      url: '/health',
    });

    // Check metrics again
    const after = await context.app.inject({
      method: 'GET',
      url: '/metrics',
    });
    const afterCount = countMetric(after.payload, 'http_requests_total');

    expect(afterCount).toBeGreaterThan(initialCount);
  });
});

function countMetric(metricsOutput: string, metricName: string): number {
  const lines = metricsOutput.split('\n');
  let total = 0;

  for (const line of lines) {
    if (line.startsWith(metricName + '{')) {
      const value = parseFloat(line.split(' ')[1]);
      if (!isNaN(value)) {
        total += value;
      }
    }
  }

  return total;
} 