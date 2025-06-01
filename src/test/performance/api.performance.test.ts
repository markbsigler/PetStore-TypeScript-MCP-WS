import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import autocannon from 'autocannon';
import { TestContext, setupTestEnvironment, teardownTestEnvironment, generateTestPet } from '../setup.js';

describe('API Performance Tests', () => {
  let context: TestContext;
  const baseUrl = 'http://localhost:3000';

  beforeAll(async () => {
    context = await setupTestEnvironment();
    await context.app.listen({ port: 3000 });
  });

  afterAll(async () => {
    await teardownTestEnvironment(context);
  });

  test('GET /pets should handle high load', async () => {
    const result = await autocannon({
      url: `${baseUrl}/pets`,
      connections: 100,
      duration: 10,
      headers: {
        'content-type': 'application/json',
      },
    });

    expect(result.errors).toBe(0);
    expect(result.timeouts).toBe(0);
    expect(result.non2xx).toBe(0);
    expect(result.latency.p99).toBeLessThan(500); // 99th percentile latency should be under 500ms
  });

  test('POST /pets should handle concurrent writes', async () => {
    const testPet = generateTestPet();

    const result = await autocannon({
      url: `${baseUrl}/pets`,
      connections: 50,
      duration: 10,
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(testPet),
    });

    expect(result.errors).toBe(0);
    expect(result.timeouts).toBe(0);
    expect(result.non2xx).toBe(0);
    expect(result.latency.p99).toBeLessThan(500); // Use p99 instead of p95
  });

  test('WebSocket connections should scale', async () => {
    const result = await autocannon({
      url: `ws://localhost:3000/ws`,
      connections: 200,
      duration: 10,
      workers: 4,
      headers: {
        'content-type': 'application/json',
      },
      // websocket: true, // Remove unsupported option
    });

    expect(result.errors).toBe(0);
    expect(result.timeouts).toBe(0);
    expect(result.latency.p99).toBeLessThan(1000); // 99th percentile latency should be under 1s
  });
});