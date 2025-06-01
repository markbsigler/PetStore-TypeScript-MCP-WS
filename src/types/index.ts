import { z } from 'zod';

// Enums and their types
export const PetStatusEnum = z.enum(['available', 'pending', 'sold']);
export type PetStatus = z.infer<typeof PetStatusEnum>;

export const OrderStatusEnum = z.enum(['placed', 'approved', 'delivered']);
export type OrderStatus = z.infer<typeof OrderStatusEnum>;

// Base interfaces
export interface Tag {
  id: number;
  name: string;
}

export interface Category {
  id: number;
  name: string;
}

// Main interfaces
export interface Pet {
  id: string;
  name: string;
  category?: Category;
  photoUrls: string[];
  tags?: Tag[];
  status: PetStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Order {
  id: number;
  petId: number;
  quantity: number;
  shipDate: string;
  status: OrderStatus;
  complete: boolean;
}

export interface ApiResponse {
  code: number;
  type: string;
  message: string;
}

// Store types
export interface StoreInventory {
  [key: string]: number;
}

// Context types
export interface Context {
  userId?: string;
  roles?: string[];
  [key: string]: unknown;
}

// WebSocket types
export enum WebSocketEvents {
  PET_CREATED = 'pet:created',
  PET_UPDATED = 'pet:updated',
  PET_DELETED = 'pet:deleted',
  ORDER_CREATED = 'order:created',
  ORDER_UPDATED = 'order:updated',
  ORDER_CANCELLED = 'order:cancelled',
  INVENTORY_UPDATED = 'inventory:updated',
}

export enum WebSocketRooms {
  PETS = 'pets',
  ORDERS = 'orders',
  INVENTORY = 'inventory',
}
