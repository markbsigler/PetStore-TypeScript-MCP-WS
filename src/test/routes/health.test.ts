import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { TestContext, setupTestEnvironment, teardownTestEnvironment } from '../setup.js';

describe('Health Check Endpoint', () => {
  let context: TestContext;

  beforeAll(async () => {
    context = await setupTestEnvironment();
  });

  afterAll(async () => {
    await teardownTestEnvironment(context);
  });

  test('GET /health should return 200 and correct response structure', async () => {
    const response = await context.app.inject({
      method: 'GET',
      url: '/health',
    });

    expect(response.statusCode).toBe(200);
    
    const body = JSON.parse(response.payload);
    expect(body).toEqual(expect.objectContaining({
      status: expect.any(String),
      timestamp: expect.any(String),
      uptime: expect.any(Number),
      redis: expect.stringMatching(/^(connected|not connected)$/),
    }));

    // Validate timestamp is ISO format
    expect(() => new Date(body.timestamp)).not.toThrow();
    
    // Validate status is 'ok'
    expect(body.status).toBe('ok');
    
    // Validate uptime is a positive number
    expect(body.uptime).toBeGreaterThan(0);
  });
}); 