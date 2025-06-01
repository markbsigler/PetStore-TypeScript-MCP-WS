import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { WebSocketRequestHandler } from '../../types/websocket.js';
import { PetSchema } from '../../models/Pet.js';

// Request payload schemas
const GetPetRequestSchema = z.object({
  id: z.string().uuid(),
});

const UpdatePetStatusRequestSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(['available', 'pending', 'sold']),
});

// Handler types
type GetPetHandler = WebSocketRequestHandler<unknown, z.infer<typeof PetSchema>>;

type UpdatePetStatusHandler = WebSocketRequestHandler<unknown, z.infer<typeof PetSchema>>;

export function registerPetHandlers(fastify: FastifyInstance): void {
  const { wsManager } = fastify;

  // Get pet handler
  const getPet: GetPetHandler = async (payload, _client, _correlationId) => {
    const { id } = GetPetRequestSchema.parse(payload);
    const petJson = await fastify.redis.hGet('pets', id);
    
    if (!petJson) {
      throw new Error('Pet not found');
    }

    const pet = PetSchema.parse(JSON.parse(petJson));
    return pet;
  };

  // Update pet status handler
  const updatePetStatus: UpdatePetStatusHandler = async (payload, _client, _correlationId) => {
    const { id, status } = UpdatePetStatusRequestSchema.parse(payload);
    const petJson = await fastify.redis.hGet('pets', id);
    
    if (!petJson) {
      throw new Error('Pet not found');
    }

    const pet = PetSchema.parse(JSON.parse(petJson));
    pet.status = status;
    pet.updatedAt = new Date().toISOString();

    await fastify.redis.hSet('pets', id, JSON.stringify(pet));

    // Broadcast the update to all clients
    wsManager.broadcast('pet:updated', pet);

    return pet;
  };

  // Register handlers
  wsManager.registerHandler('getPet', getPet);
  wsManager.registerHandler('updatePetStatus', updatePetStatus);
}