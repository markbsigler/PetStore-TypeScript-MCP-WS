import { z } from 'zod';
import { PetStatusEnum, type PetStatus } from '../types/index.js';

export const TagSchema = z.object({
  id: z.number().int(),
  name: z.string(),
});

export const CategorySchema = z.object({
  id: z.number().int(),
  name: z.string(),
});

export const PetSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  category: CategorySchema.optional(),
  photoUrls: z.array(z.string()),
  tags: z.array(TagSchema).optional(),
  status: PetStatusEnum,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Pet = z.infer<typeof PetSchema>;
export type Tag = z.infer<typeof TagSchema>;
export type Category = z.infer<typeof CategorySchema>;
export { PetStatus };
