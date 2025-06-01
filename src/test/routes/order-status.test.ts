import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { TestContext, setupTestEnvironment, teardownTestEnvironment, clearRedis, generateTestOrder } from '../setup.js';
import { type OrderStatus } from '../../models/types.js';

describe('Order Status Endpoints', () => {
  let context: TestContext;
  let testOrder: ReturnType<typeof generateTestOrder>;

  beforeAll(async () => {
    context = await setupTestEnvironment();
  });

  beforeEach(async () => {
    await clearRedis(context.app);
    testOrder = generateTestOrder();
  });

  afterAll(async () => {
    await teardownTestEnvironment(context);
  });

  describe('GET /store/orders/status/{status}', () => {
    test('should get orders by status', async () => {
      // Create orders with different statuses
      const placedOrder = { ...testOrder, status: 'placed' as OrderStatus };
      const approvedOrder = { ...testOrder, status: 'approved' as OrderStatus };
      const deliveredOrder = { ...testOrder, status: 'delivered' as OrderStatus };

      await Promise.all([
        context.app.inject({
          method: 'POST',
          url: '/store/orders',
          payload: placedOrder,
        }),
        context.app.inject({
          method: 'POST',
          url: '/store/orders',
          payload: approvedOrder,
        }),
        context.app.inject({
          method: 'POST',
          url: '/store/orders',
          payload: deliveredOrder,
        }),
      ]);

      const response = await context.app.inject({
        method: 'GET',
        url: '/store/orders/status/placed',
      });

      expect(response.statusCode).toBe(200);
      const orders = JSON.parse(response.payload);
      expect(Array.isArray(orders)).toBe(true);
      expect(orders.length).toBe(1);
      expect(orders[0].status).toBe('placed');
    });

    test('should return empty array for status with no orders', async () => {
      const response = await context.app.inject({
        method: 'GET',
        url: '/store/orders/status/delivered',
      });

      expect(response.statusCode).toBe(200);
      const orders = JSON.parse(response.payload);
      expect(Array.isArray(orders)).toBe(true);
      expect(orders.length).toBe(0);
    });

    test('should validate status parameter', async () => {
      const response = await context.app.inject({
        method: 'GET',
        url: '/store/orders/status/invalid-status',
      });

      expect(response.statusCode).toBe(400);
      const error = JSON.parse(response.payload);
      expect(error.message).toContain('Invalid status');
    });
  });

  describe('PUT /store/orders/{id}/status', () => {
    test('should update order status', async () => {
      // Create an order
      const createResponse = await context.app.inject({
        method: 'POST',
        url: '/store/orders',
        payload: testOrder,
      });
      const { id } = JSON.parse(createResponse.payload);

      const response = await context.app.inject({
        method: 'PUT',
        url: `/store/orders/${id}/status`,
        payload: {
          status: 'approved' as OrderStatus,
        },
      });

      expect(response.statusCode).toBe(200);
      const updatedOrder = JSON.parse(response.payload);
      expect(updatedOrder).toMatchObject({
        id,
        status: 'approved',
      });
    });

    test('should validate status value', async () => {
      // Create an order
      const createResponse = await context.app.inject({
        method: 'POST',
        url: '/store/orders',
        payload: testOrder,
      });
      const { id } = JSON.parse(createResponse.payload);

      const response = await context.app.inject({
        method: 'PUT',
        url: `/store/orders/${id}/status`,
        payload: {
          status: 'invalid-status',
        },
      });

      expect(response.statusCode).toBe(400);
      const error = JSON.parse(response.payload);
      expect(error.message).toContain('Invalid status');
    });

    test('should return 404 for non-existent order', async () => {
      const response = await context.app.inject({
        method: 'PUT',
        url: '/store/orders/non-existent-id/status',
        payload: {
          status: 'approved' as OrderStatus,
        },
      });

      expect(response.statusCode).toBe(404);
    });
  });
});