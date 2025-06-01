import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { TestContext, setupTestEnvironment, teardownTestEnvironment, clearRedis, generateTestUser } from '../setup.js';

describe('User Endpoints', () => {
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

  describe('POST /users', () => {
    test('should create a new user', async () => {
      const response = await context.app.inject({
        method: 'POST',
        url: '/users',
        payload: testUser,
      });

      expect(response.statusCode).toBe(201);
      const createdUser = JSON.parse(response.payload);
      expect(createdUser).toMatchObject({
        id: expect.any(String),
        username: testUser.username,
        email: testUser.email,
      });
      expect(createdUser.password).toBeUndefined();
    });

    test('should validate required fields', async () => {
      const invalidUser = {
        email: 'test@example.com',
      };

      const response = await context.app.inject({
        method: 'POST',
        url: '/users',
        payload: invalidUser,
      });

      expect(response.statusCode).toBe(400);
      const error = JSON.parse(response.payload);
      expect(error.message).toContain('Validation failed');
    });

    test('should prevent duplicate usernames', async () => {
      // Create first user
      await context.app.inject({
        method: 'POST',
        url: '/users',
        payload: testUser,
      });

      // Try to create user with same username
      const response = await context.app.inject({
        method: 'POST',
        url: '/users',
        payload: testUser,
      });

      expect(response.statusCode).toBe(409);
      const error = JSON.parse(response.payload);
      expect(error.message).toContain('already exists');
    });
  });

  describe('GET /users/{username}', () => {
    test('should get user by username', async () => {
      // Create a user
      await context.app.inject({
        method: 'POST',
        url: '/users',
        payload: testUser,
      });

      const response = await context.app.inject({
        method: 'GET',
        url: `/users/${testUser.username}`,
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

    test('should return 404 for non-existent user', async () => {
      const response = await context.app.inject({
        method: 'GET',
        url: '/users/non-existent-user',
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('PUT /users/{username}', () => {
    test('should update user', async () => {
      // Create a user
      await context.app.inject({
        method: 'POST',
        url: '/users',
        payload: testUser,
      });

      const updatedUser = {
        ...testUser,
        email: 'updated@example.com',
      };

      const response = await context.app.inject({
        method: 'PUT',
        url: `/users/${testUser.username}`,
        payload: updatedUser,
      });

      expect(response.statusCode).toBe(200);
      const user = JSON.parse(response.payload);
      expect(user).toMatchObject({
        id: expect.any(String),
        username: testUser.username,
        email: updatedUser.email,
      });
      expect(user.password).toBeUndefined();
    });

    test('should return 404 for non-existent user', async () => {
      const response = await context.app.inject({
        method: 'PUT',
        url: '/users/non-existent-user',
        payload: testUser,
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('DELETE /users/{username}', () => {
    test('should delete user', async () => {
      // Create a user
      await context.app.inject({
        method: 'POST',
        url: '/users',
        payload: testUser,
      });

      const response = await context.app.inject({
        method: 'DELETE',
        url: `/users/${testUser.username}`,
      });

      expect(response.statusCode).toBe(204);

      // Verify user is deleted
      const getResponse = await context.app.inject({
        method: 'GET',
        url: `/users/${testUser.username}`,
      });
      expect(getResponse.statusCode).toBe(404);
    });

    test('should return 404 for non-existent user', async () => {
      const response = await context.app.inject({
        method: 'DELETE',
        url: '/users/non-existent-user',
      });

      expect(response.statusCode).toBe(404);
    });
  });
}); 