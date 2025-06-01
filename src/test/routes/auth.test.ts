import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { TestContext, setupTestEnvironment, teardownTestEnvironment, clearRedis, generateTestUser } from '../setup.js';

describe('Authentication Endpoints', () => {
  let context: TestContext;
  let testUser: ReturnType<typeof generateTestUser>;

  beforeAll(async () => {
    context = await setupTestEnvironment();
  });

  beforeEach(async () => {
    await clearRedis(context.app);
    testUser = generateTestUser();
  });

  afterAll(async () => {
    await teardownTestEnvironment(context);
  });

  describe('POST /auth/register', () => {
    test('should register a new user', async () => {
      const response = await context.app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: testUser,
      });

      expect(response.statusCode).toBe(201);
      const result = JSON.parse(response.payload);
      expect(result).toMatchObject({
        id: expect.any(String),
        username: testUser.username,
        email: testUser.email,
      });
      expect(result.password).toBeUndefined();
    });

    test('should validate required fields', async () => {
      const invalidUser = {
        email: 'test@example.com',
      };

      const response = await context.app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: invalidUser,
      });

      expect(response.statusCode).toBe(400);
      const error = JSON.parse(response.payload);
      expect(error.message).toContain('Validation failed');
    });

    test('should prevent duplicate usernames', async () => {
      // Register first user
      await context.app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: testUser,
      });

      // Try to register with same username
      const response = await context.app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: testUser,
      });

      expect(response.statusCode).toBe(409);
      const error = JSON.parse(response.payload);
      expect(error.message).toContain('already exists');
    });
  });

  describe('POST /auth/login', () => {
    beforeEach(async () => {
      // Register a user before each test
      await context.app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: testUser,
      });
    });

    test('should login with valid credentials', async () => {
      const response = await context.app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: {
          username: testUser.username,
          password: testUser.password,
        },
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.payload);
      expect(result).toMatchObject({
        token: expect.any(String),
        user: {
          id: expect.any(String),
          username: testUser.username,
          email: testUser.email,
        },
      });
    });

    test('should reject invalid credentials', async () => {
      const response = await context.app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: {
          username: testUser.username,
          password: 'wrong-password',
        },
      });

      expect(response.statusCode).toBe(401);
      const error = JSON.parse(response.payload);
      expect(error.message).toContain('Invalid credentials');
    });
  });

  describe('GET /auth/me', () => {
    let authToken: string;

    beforeEach(async () => {
      // Register and login a user before each test
      await context.app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: testUser,
      });

      const loginResponse = await context.app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: {
          username: testUser.username,
          password: testUser.password,
        },
      });

      const { token } = JSON.parse(loginResponse.payload);
      authToken = token;
    });

    test('should get current user profile', async () => {
      const response = await context.app.inject({
        method: 'GET',
        url: '/auth/me',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const user = JSON.parse(response.payload);
      expect(user).toMatchObject({
        id: expect.any(String),
        username: testUser.username,
        email: testUser.email,
      });
      expect(user.password).toBeUndefined();
    });

    test('should reject unauthorized requests', async () => {
      const response = await context.app.inject({
        method: 'GET',
        url: '/auth/me',
      });

      expect(response.statusCode).toBe(401);
    });

    test('should reject invalid tokens', async () => {
      const response = await context.app.inject({
        method: 'GET',
        url: '/auth/me',
        headers: {
          authorization: 'Bearer invalid-token',
        },
      });

      expect(response.statusCode).toBe(401);
    });
  });
}); 