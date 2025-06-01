import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 20 }, // Ramp up to 20 users
    { duration: '1m', target: 20 },  // Stay at 20 users
    { duration: '30s', target: 0 },  // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests should be below 500ms
    http_req_failed: ['rate<0.01'],   // Less than 1% of requests should fail
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  // Health check
  const healthCheck = http.get(`${BASE_URL}/v1/health`);
  check(healthCheck, {
    'health check status is 200': (r) => r.status === 200,
    'health check response has correct format': (r) => {
      const body = JSON.parse(r.body);
      return body.status === 'ok' && body.metrics !== undefined;
    },
  });

  // Test cache with a pet request
  const petId = '123e4567-e89b-12d3-a456-426614174000';
  const getPet = http.get(`${BASE_URL}/v1/pets/${petId}`);
  check(getPet, {
    'get pet status is 200 or 404': (r) => r.status === 200 || r.status === 404,
  });

  // Test API versioning
  const wrongVersion = http.get(`${BASE_URL}/v999/health`);
  check(wrongVersion, {
    'invalid version returns 400': (r) => r.status === 400,
  });

  sleep(1);
} 