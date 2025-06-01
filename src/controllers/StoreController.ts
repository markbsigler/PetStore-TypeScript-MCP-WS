import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { Order, OrderSchema, StoreInventory } from '../models/Store.js';

// In-memory storage
const orders: Map<number, Order> = new Map();
const inventory: StoreInventory = {
  available: 0,
  pending: 0,
  sold: 0,
};

export async function registerStoreRoutes(fastify: FastifyInstance) {
  // Get inventory
  fastify.get(
    '/store/inventory',
    {
      schema: {
        response: {
          200: {
            type: 'object',
            additionalProperties: { type: 'integer' },
          },
        },
      },
    },
    async (_request: FastifyRequest, _reply: FastifyReply): Promise<{ [key: string]: number }> => {
      return inventory;
    },
  );

  // Place order
  fastify.post(
    '/store/order',
    {
      schema: {
        body: OrderSchema,
        response: {
          200: OrderSchema,
          400: { type: 'object', properties: { message: { type: 'string' } } },
        },
      },
    },
    async (request: FastifyRequest<{ Body: Order }>, _reply: FastifyReply) => {
      const order = request.body;
      orders.set(order.id, order);
      return order;
    },
  );

  // Get order by ID
  fastify.get(
    '/store/order/:orderId',
    {
      schema: {
        params: {
          type: 'object',
          properties: {
            orderId: { type: 'integer', minimum: 1, maximum: 10 },
          },
          required: ['orderId'],
        },
        response: {
          200: OrderSchema,
          400: { type: 'object', properties: { message: { type: 'string' } } },
          404: { type: 'object', properties: { message: { type: 'string' } } },
        },
      },
    },
    async (request: FastifyRequest<{ Params: { orderId: number } }>, reply: FastifyReply) => {
      const { orderId } = request.params;
      const order = orders.get(orderId);

      if (!order) {
        reply.code(404);
        return { message: 'Order not found' };
      }

      return order;
    },
  );

  // Delete order
  fastify.delete(
    '/store/order/:orderId',
    {
      schema: {
        params: {
          type: 'object',
          properties: {
            orderId: { type: 'integer', minimum: 1 },
          },
          required: ['orderId'],
        },
        response: {
          400: { type: 'object', properties: { message: { type: 'string' } } },
          404: { type: 'object', properties: { message: { type: 'string' } } },
        },
      },
    },
    async (request: FastifyRequest<{ Params: { orderId: number } }>, reply: FastifyReply) => {
      const { orderId } = request.params;

      if (!orders.has(orderId)) {
        reply.code(404);
        return { message: 'Order not found' };
      }

      orders.delete(orderId);
      reply.code(204);
    },
  );
}
