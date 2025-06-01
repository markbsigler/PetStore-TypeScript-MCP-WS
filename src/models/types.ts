import { z } from 'zod';

export const PetStatusEnum = z.enum(['available', 'pending', 'sold']);
export type PetStatus = z.infer<typeof PetStatusEnum>;

export const OrderStatusEnum = z.enum(['placed', 'approved', 'delivered']);
export type OrderStatus = z.infer<typeof OrderStatusEnum>; 