import { z } from 'zod';
import { OrderStatusEnum, type OrderStatus, type StoreInventory } from '../types/index.js';

export const OrderSchema = z.object({
  id: z.number().int(),
  petId: z.number().int(),
  quantity: z.number().int(),
  shipDate: z.string().datetime(),
  status: OrderStatusEnum,
  complete: z.boolean(),
});

export type Order = z.infer<typeof OrderSchema>;
export { OrderStatus, StoreInventory };
