import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { TestContext, setupTestEnvironment, teardownTestEnvironment, clearRedis, generateTestPet } from '../setup.js';

describe('Order Endpoints', () => {
  let context: TestContext;
  let testPet: ReturnType<typeof generateTestPet>;
  let testOrder: Record<string, unknown>;

  beforeAll(async () => {
    context = await setupTestEnvironment();
  });

  beforeEach(async () => {
    await clearRedis(context.app);
    testPet = generateTestPet();
    
    // Create a test pet for orders
    const petResponse = await context.app.inject({
      method: 'POST',
      url: '/pets',
      payload: testPet,
    });
    const pet = JSON.parse(petResponse.payload);

    testOrder = {
      petId: pet.id,
      quantity: 1,
      shipDate: new Date().toISOString(),
      status: 'placed',
      complete: false,
    };
  });

  afterAll(async () => {
    await teardownTestEnvironment(context);
  });

  describe('POST /store/orders', () => {
    test('should create a new order', async () => {
      const response = await context.app.inject({
        method: 'POST',
        url: '/store/orders',
        payload: testOrder,
      });

      expect(response.statusCode).toBe(201);
      const createdOrder = JSON.parse(response.payload);
      expect(createdOrder).toMatchObject({
        ...testOrder,
        id: expect.any(String),
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      });
    });

    test('should validate required fields', async () => {
      const invalidOrder = {
        status: 'placed',
      };

      const response = await context.app.inject({
        method: 'POST',
        url: '/store/orders',
        payload: invalidOrder,
      });

      expect(response.statusCode).toBe(400);
      const error = JSON.parse(response.payload);
      expect(error.message).toContain('Validation failed');
    });

    test('should validate pet exists', async () => {
      const orderWithInvalidPet = {
        ...testOrder,
        petId: 'non-existent-pet',
      };

      const response = await context.app.inject({
        method: 'POST',
        url: '/store/orders',
        payload: orderWithInvalidPet,
      });

      expect(response.statusCode).toBe(404);
      const error = JSON.parse(response.payload);
      expect(error.message).toContain('Pet not found');
    });
  });

  describe('GET /store/orders/{id}', () => {
    test('should get an order by ID', async () => {
      // Create a test order
      const createResponse = await context.app.inject({
        method: 'POST',
        url: '/store/orders',
        payload: testOrder,
      });
      const { id } = JSON.parse(createResponse.payload);

      const response = await context.app.inject({
        method: 'GET',
        url: `/store/orders/${id}`,
      });

      expect(response.statusCode).toBe(200);
      const order = JSON.parse(response.payload);
      expect(order).toMatchObject({
        ...testOrder,
        id,
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      });
    });

    test('should return 404 for non-existent order', async () => {
      const response = await context.app.inject({
        method: 'GET',
        url: '/store/orders/non-existent-id',
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('DELETE /store/orders/{id}', () => {
    test('should delete an existing order', async () => {
      // Create a test order
      const createResponse = await context.app.inject({
        method: 'POST',
        url: '/store/orders',
        payload: testOrder,
      });
      const { id } = JSON.parse(createResponse.payload);

      const response = await context.app.inject({
        method: 'DELETE',
        url: `/store/orders/${id}`,
      });

      expect(response.statusCode).toBe(204);

      // Verify order is deleted
      const getResponse = await context.app.inject({
        method: 'GET',
        url: `/store/orders/${id}`,
      });
      expect(getResponse.statusCode).toBe(404);
    });

    test('should return 404 for deleting non-existent order', async () => {
      const response = await context.app.inject({
        method: 'DELETE',
        url: '/store/orders/non-existent-id',
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('GET /store/inventory', () => {
    test('should get pet inventory by status', async () => {
      // Create pets with different statuses
      const availablePet = { ...testPet, status: 'available' };
      const soldPet = { ...testPet, status: 'sold' };
      const pendingPet = { ...testPet, status: 'pending' };

      await Promise.all([
        context.app.inject({
          method: 'POST',
          url: '/pets',
          payload: availablePet,
        }),
        context.app.inject({
          method: 'POST',
          url: '/pets',
          payload: soldPet,
        }),
        context.app.inject({
          method: 'POST',
          url: '/pets',
          payload: pendingPet,
        }),
      ]);

      const response = await context.app.inject({
        method: 'GET',
        url: '/store/inventory',
      });

      expect(response.statusCode).toBe(200);
      const inventory = JSON.parse(response.payload);
      expect(inventory).toMatchObject({
        available: 1,
        sold: 1,
        pending: 1,
      });
    });
  });
});