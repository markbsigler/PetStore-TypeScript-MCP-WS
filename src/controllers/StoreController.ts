import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { Order, OrderSchema, StoreInventory } from '../models/Store.ts';
import { zodToJsonSchema } from 'zod-to-json-schema';

// Type for authentication function
type AuthenticateFunction = (request: FastifyRequest, reply: FastifyReply) => Promise<void>;

const OrderJsonSchema = zodToJsonSchema(OrderSchema); // Use default (draft-07) for Fastify compatibility

// In-memory storage
const orders = new Map<number, Order>();
const inventory: StoreInventory = {
  available: 0,
  pending: 0,
  sold: 0,
};


export async function registerStoreRoutes(fastify: FastifyInstance, authenticate?: AuthenticateFunction) {
  // Get inventory - public endpoint
  fastify.get(
    '/store/inventory',
    {
      preHandler: [], // No authentication required
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
  fastify.post<{
    Body: Order;
    Reply: Order | { message: string };
  }>(
    '/store/order',
    {
      preHandler: authenticate ? [authenticate] : [],
      schema: {
        body: OrderJsonSchema,
        response: {
          200: OrderJsonSchema,
          400: { 
            type: 'object', 
            properties: { 
              message: { type: 'string' } 
            } 
          },
        },
      },
    },
    async (request, _reply) => {
      const order = request.body;
      orders.set(order.id, order);
      return order;
    },
  );

  // Get order by ID
  fastify.get<{
    Params: { orderId: number };
    Reply: Order | { message: string };
  }>(
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
          200: OrderJsonSchema,
          400: { 
            type: 'object', 
            properties: { 
              message: { type: 'string' } 
            } 
          },
          404: { 
            type: 'object', 
            properties: { 
              message: { type: 'string' } 
            } 
          },
        },
      },
    },
    async (request, _reply) => {
      const { orderId } = request.params;
      const order = orders.get(orderId);

      if (!order) {
        _reply.code(404);
        return { message: 'Order not found' };
      }

      return order;
    },
  );

  // Delete order
  fastify.delete<{
    Params: { orderId: number };
    Reply: { message: string } | undefined;
  }>(
    '/store/order/:orderId',
    {
      preHandler: authenticate ? [authenticate] : [],
      schema: {
        params: {
          type: 'object',
          properties: {
            orderId: { type: 'integer', minimum: 1 },
          },
          required: ['orderId'],
        },
        response: {
          204: { type: 'null' },
          400: { 
            type: 'object', 
            properties: { 
              message: { type: 'string' } 
            } 
          },
          404: { 
            type: 'object', 
            properties: { 
              message: { type: 'string' } 
            } 
          },
        },
      },
    },
    async (request, _reply) => {
      const { orderId } = request.params;

      if (!orders.has(orderId)) {
        _reply.code(404);
        return { message: 'Order not found' };
      }

      orders.delete(orderId);
      _reply.code(204).send();
    },
  );
}
