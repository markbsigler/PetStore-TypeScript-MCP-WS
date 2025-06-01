import { Pet } from '../models/Pet.js';
import { Server } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PetSchema } from '../models/Pet.js';
import logger from '../utils/logger.js';

// In-memory storage
const pets: Map<string, Pet> = new Map();

export class PetController {
  private readonly io: Server;

  constructor(io?: Server) {
    this.io = io || new Server();
  }

  async findAll(
    page: number = 1,
    limit: number = 10,
    status?: string,
  ): Promise<{
    data: Pet[];
    pagination: { total: number; page: number; limit: number; pages: number };
  }> {
    let filteredPets = Array.from(pets.values());
    if (status) {
      filteredPets = filteredPets.filter((pet: Pet) => pet.status === status);
    }
    const total = filteredPets.length;
    const pages = Math.ceil(total / limit);
    const start = (page - 1) * limit;
    const end = start + limit;
    return {
      data: filteredPets.slice(start, end),
      pagination: { total, page, limit, pages },
    };
  }

  async findByStatus(status: string[]): Promise<Pet[]> {
    const validStatuses = ['available', 'pending', 'sold'];
    const filteredStatuses = status.filter(s => validStatuses.includes(s));
    if (filteredStatuses.length === 0) {
      throw new Error('Invalid status value');
    }
    return Array.from(pets.values()).filter(pet => filteredStatuses.includes(pet.status));
  }

  async findByTags(tags: string[]): Promise<Pet[]> {
    if (!tags || tags.length === 0) {
      throw new Error('Invalid tags value');
    }
    return Array.from(pets.values()).filter((pet: Pet) =>
      pet.tags?.some((petTag: { name: string }) => tags.includes(petTag.name))
    );
  }

  async create(pet: Omit<Pet, 'id' | 'createdAt' | 'updatedAt'>): Promise<Pet> {
    const newPet: Pet = {
      ...pet,
      id: uuidv4(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    pets.set(newPet.id, newPet);
    this.io.emit('petCreated', { petId: newPet.id, data: newPet });
    return newPet;
  }

  async update(id: string, pet: Partial<Omit<Pet, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Pet | undefined> {
    const existing = pets.get(id);
    if (!existing) return undefined;
    const updatedPet: Pet = {
      ...existing,
      ...pet,
      id,
      updatedAt: new Date().toISOString(),
    };
    pets.set(id, updatedPet);
    this.io.emit('petUpdated', { petId: id, data: updatedPet });
    return updatedPet;
  }

  async delete(id: string): Promise<boolean> {
    if (!pets.has(id)) return false;
    pets.delete(id);
    this.io.emit('petDeleted', { petId: id });
    return true;
  }

  async uploadImage(
    petId: string,
    file: Buffer,
    additionalMetadata?: string,
  ): Promise<{ code: number; type: string; message: string }> {
    if (!pets.has(petId)) {
      throw new Error('Pet not found');
    }
    return {
      code: 200,
      type: 'success',
      message: `Image uploaded for pet ${petId}${additionalMetadata ? '. Additional metadata: ' + additionalMetadata : ''}`,
    };
  }

  async findById(id: string): Promise<Pet | undefined> {
    return pets.get(id);
  }

  async findPetsByStatus(_request: FastifyRequest, _reply: FastifyReply): Promise<Pet[]> {
    // Implementation needed
    throw new Error('Method not implemented');
  }

  async findPetsByTags(_request: FastifyRequest, _reply: FastifyReply): Promise<Pet[]> {
    // Implementation needed
    throw new Error('Method not implemented');
  }

  async findPetById(_request: FastifyRequest, _reply: FastifyReply): Promise<Pet> {
    // Implementation needed
    throw new Error('Method not implemented');
  }
}

export async function registerPetRoutes(fastify: FastifyInstance) {
  // Create pet
  fastify.post(
    '/pets',
    {
      schema: {
        body: PetSchema,
        response: {
          201: PetSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Body: Pet }>, reply: FastifyReply) => {
      const pet = request.body;
      pets.set(pet.id, pet);
      reply.code(201);
      return pet;
    },
  );

  // Get all pets
  fastify.get(
    '/pets',
    {
      schema: {
        querystring: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['available', 'pending', 'sold'] },
            page: { type: 'integer', minimum: 1 },
            limit: { type: 'integer', minimum: 1, maximum: 100 },
          },
        },
        response: {
          200: {
            type: 'array',
            items: PetSchema,
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Querystring: { status?: string; page?: number; limit?: number } }>,
      _reply: FastifyReply,
    ) => {
      const { status, page = 1, limit = 10 } = request.query;
      let filteredPets = Array.from(pets.values());

      if (status) {
        filteredPets = filteredPets.filter((pet: Pet) => pet.status === status);
      }

      const start = (page - 1) * limit;
      const end = start + limit;
      return filteredPets.slice(start, end);
    },
  );

  // Get pet by ID
  fastify.get(
    '/pets/:id',
    {
      schema: {
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
          required: ['id'],
        },
        response: {
          200: PetSchema,
          404: {
            type: 'object',
            properties: {
              message: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const { id } = request.params;
      const pet = pets.get(id);

      if (!pet) {
        reply.code(404);
        return { message: 'Pet not found' };
      }

      return pet;
    },
  );

  // Update pet
  fastify.put(
    '/pets/:id',
    {
      schema: {
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
          required: ['id'],
        },
        body: PetSchema,
        response: {
          200: PetSchema,
          404: {
            type: 'object',
            properties: {
              message: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string }; Body: Pet }>, reply: FastifyReply) => {
      const { id } = request.params;
      const existingPet = pets.get(id);

      if (!existingPet) {
        reply.code(404);
        return { message: 'Pet not found' };
      }

      const updatedPet: Pet = {
        ...request.body,
        id,
        createdAt: existingPet.createdAt,
        updatedAt: new Date().toISOString(),
      };

      pets.set(id, updatedPet);
      return updatedPet;
    },
  );

  // Delete pet
  fastify.delete(
    '/pets/:id',
    {
      schema: {
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
          required: ['id'],
        },
        response: {
          204: {
            type: 'null',
          },
          404: {
            type: 'object',
            properties: {
              message: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const { id } = request.params;

      if (!pets.has(id)) {
        reply.code(404);
        return { message: 'Pet not found' };
      }

      pets.delete(id);
      reply.code(204);
    },
  );

  // Find pets by status
  fastify.get(
    '/pet/findByStatus',
    {
      schema: {
        querystring: {
          type: 'object',
          properties: {
            status: {
              type: 'array',
              items: {
                type: 'string',
                enum: ['available', 'pending', 'sold'],
              },
            },
          },
          required: ['status'],
        },
        response: {
          200: {
            type: 'array',
            items: PetSchema,
          },
        },
      },
    },
    async (request: FastifyRequest<{ Querystring: { status: string[] } }>, _reply: FastifyReply) => {
      const { status } = request.query;
      const filteredPets = Array.from(pets.values()).filter(pet => status.includes(pet.status));
      return filteredPets;
    },
  );

  // Find pets by tags
  fastify.get(
    '/pet/findByTags',
    {
      schema: {
        querystring: {
          type: 'object',
          properties: {
            tags: {
              type: 'array',
              items: { type: 'string' },
            },
          },
          required: ['tags'],
        },
        response: {
          200: {
            type: 'array',
            items: PetSchema,
          },
        },
      },
    },
    async (request: FastifyRequest<{ Querystring: { tags: string[] } }>, _reply: FastifyReply) => {
      const { tags } = request.query;
      const filteredPets = Array.from(pets.values()).filter(pet =>
        pet.tags?.some(tag => tags.includes(tag.name)),
      );
      return filteredPets;
    },
  );

  // Upload pet image
  fastify.post(
    '/pet/:petId/uploadImage',
    {
      schema: {
        params: {
          type: 'object',
          properties: {
            petId: { type: 'string' },
          },
          required: ['petId'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              code: { type: 'integer' },
              type: { type: 'string' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Params: { petId: string } }>, reply: FastifyReply) => {
      const { petId } = request.params;
      const pet = pets.get(petId);

      if (!pet) {
        reply.code(404);
        return { message: 'Pet not found' };
      }

      try {
        const data = await request.file();
        if (!data) {
          reply.code(400);
          return { message: 'No file uploaded' };
        }

        const fileInfo = data;
        const metadata = request.body as { additionalMetadata?: string };

        // For demo purposes, just add a dummy URL
        pet.photoUrls.push(`https://example.com/pets/${petId}/${fileInfo.filename}`);
        pets.set(petId, pet);

        let message = `Image uploaded successfully. File: ${fileInfo.filename}`;
        if (metadata.additionalMetadata) {
          message += `, Additional metadata: ${metadata.additionalMetadata}`;
        }

        return {
          code: 200,
          type: 'success',
          message,
        };
      } catch (error) {
        logger.error('Error uploading image:', error);
        reply.code(500);
        return { message: 'Error uploading image' };
      }
    },
  );
}
