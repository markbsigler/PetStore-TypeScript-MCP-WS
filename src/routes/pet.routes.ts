import { FastifyInstance } from 'fastify';
import { PetController } from '../controllers/PetController.ts';
import { Pet } from '../types/index.js';
import { Type } from '@sinclair/typebox';

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: import('fastify').FastifyRequest, reply: import('fastify').FastifyReply) => Promise<void>;
  }
}

async function petRoutes(fastify: FastifyInstance) {
  fastify.log.info('Registering pet routes');
  const petController = new PetController();

  // Schema definitions
  const TagSchema = Type.Object({
    id: Type.Number(),
    name: Type.String(),
  });

  const CategorySchema = Type.Object({
    id: Type.Number(),
    name: Type.String(),
  });

  // Schema for the Pet object when returned in responses
  const PetResponseSchema = Type.Object({
    id: Type.String(), // id is always present in responses
    name: Type.String(),
    category: Type.Optional(CategorySchema),
    photoUrls: Type.Array(Type.String()),
    tags: Type.Optional(Type.Array(TagSchema)),
    status: Type.Union([Type.Literal('available'), Type.Literal('pending'), Type.Literal('sold')]),
    createdAt: Type.String(), // Should be present in response
    updatedAt: Type.String(), // Should be present in response
  });

  // Schema for the request body when creating a new Pet (id, createdAt, updatedAt are generated)
  const PetRequestBodySchema = Type.Object({
    id: Type.Optional(Type.String()),
    name: Type.String(),
    category: Type.Optional(CategorySchema),
    photoUrls: Type.Array(Type.String()),
    tags: Type.Optional(Type.Array(TagSchema)),
    status: Type.Union([Type.Literal('available'), Type.Literal('pending'), Type.Literal('sold')]),
  });

  // GET /pets/findByStatus
  fastify.get(
    '/pets/findByStatus',
    {
      schema: {
        querystring: Type.Object({
          status: Type.Array(Type.String()),
        }),
        response: {
          200: Type.Array(PetResponseSchema),
          400: Type.Object({
            error: Type.String(),
          }),
        },
      },
    },
    async (request, reply) => {
      try {
        const { status } = request.query as { status: string[] };
        const pets = await petController.findByStatus(status);
        return reply.send(pets);
      } catch (err) {
        request.log.error({ err }, 'Handler error');
        const error = err as Error;
        return reply.status(400).send({ error: error.message });
      }
    },
  );

  // GET /pets/findByTags
  fastify.get(
    '/pets/findByTags',
    {
      schema: {
        querystring: Type.Object({
          tags: Type.Array(Type.String()),
        }),
        response: {
          200: Type.Array(PetResponseSchema),
          400: Type.Object({
            error: Type.String(),
          }),
        },
      },
    },
    async (request, reply) => {
      try {
        const { tags } = request.query as { tags: string[] };
        const pets = await petController.findByTags(tags);
        return reply.send(pets);
      } catch (err) {
        request.log.error({ err }, 'Handler error');
        const error = err as Error;
        return reply.status(400).send({ error: error.message });
      }
    },
  );

  // POST /pets/:petId/uploadImage
  fastify.post(
    '/pets/:petId/uploadImage',
    {
      schema: {
        params: Type.Object({
          petId: Type.String(),
        }),
        response: {
          200: Type.Object({
            code: Type.Number(),
            type: Type.String(),
            message: Type.String(),
          }),
          404: Type.Object({
            error: Type.String(),
          }),
        },
      },
    },
    async (request, reply) => {
      try {
        const { petId } = request.params as { petId: string };
        const data = await request.file();

        if (!data) {
          throw new Error('No file uploaded');
        }

        const buffer = await data.toBuffer();
        const additionalMetadata = (request.body as { additionalMetadata?: string })?.additionalMetadata;

        const response = await petController.uploadImage(petId, buffer, additionalMetadata);

        return reply.send(response);
      } catch (err) {
        request.log.error({ err }, 'Handler error');
        const error = err as Error;
        if (error.message === 'Pet not found') {
          return reply.status(404).send({ error: error.message });
        }
        return reply.status(400).send({ error: error.message });
      }
    },
  );

  // GET /pets - List all pets
  fastify.get(
    '/pets',
    {
      schema: {
        response: {
          200: Type.Array(PetResponseSchema),
        },
      },
    },
    async (request, reply) => {
      try {
        // Use default pagination for now
        const result = await petController.findAll();
        return reply.send(result.data);
      } catch (err) {
        request.log.error({ err }, 'Handler error');
        return reply.status(500).send({ error: 'Failed to fetch pets' });
      }
    },
  );

  // GET /pets/:petId - Get pet by ID
  fastify.get(
    '/pets/:petId',
    {
      schema: {
        params: Type.Object({
          petId: Type.String(),
        }),
        response: {
          200: PetResponseSchema,
          404: Type.Object({
            error: Type.String(),
          }),
        },
      },
    },
    async (request, reply) => {
      try {
        const { petId } = request.params as { petId: string };
        const pet = await petController.findById(petId);
        if (!pet) {
          return reply.status(404).send({ error: 'Pet not found' });
        }
        return reply.send(pet);
      } catch (err) {
        request.log.error({ err }, 'Handler error');
        throw err;
      }
    },
  );

  // POST /pets - Add a new pet
  fastify.post(
    '/pets',
    {
      preHandler: [fastify.authenticate],
      schema: {
        body: PetRequestBodySchema,
        response: {
          201: PetResponseSchema,
          400: Type.Object({
            error: Type.String(),
          }),
        },
      },
    },
    async (request, reply) => {
      try {
        const pet = await petController.create(request.body as Pet);
        return reply.status(201).send(pet);
      } catch (err) {
        request.log.error({ err }, 'Handler error');
        const error = err as Error;
        if (error.message.includes('Invalid') || error.message.includes('required')) {
          return reply.status(400).send({ error: error.message });
        }
        return reply.status(500).send({ error: 'Internal server error' });
      }
    },
  );

  // PUT /pets/:petId - Update an existing pet
  fastify.put(
    '/pets/:petId',
    {
      preHandler: [fastify.authenticate],
      schema: {
        params: Type.Object({
          petId: Type.String(),
        }),
        body: PetRequestBodySchema,
        response: {
          200: PetResponseSchema,
          404: Type.Object({
            error: Type.String(),
          }),
        },
      },
    },
    async (request, reply) => {
      try {
        const { petId } = request.params as { petId: string };
        const pet = await petController.update(petId, request.body as Pet);
        if (!pet) {
          return reply.status(404).send({ error: 'Pet not found' });
        }
        return reply.send(pet);
      } catch (err) {
        request.log.error({ err }, 'Handler error');
        throw err;
      }
    },
  );

  // DELETE /pets/:petId - Delete a pet
  fastify.delete(
    '/pets/:petId',
    {
      preHandler: [fastify.authenticate],
      schema: {
        params: Type.Object({
          petId: Type.String(),
        }),
        response: {
          204: Type.Null(),
          404: Type.Object({
            error: Type.String(),
          }),
        },
      },
    },
    async (request, reply) => {
      try {
        const { petId } = request.params as { petId: string };
        const success = await petController.delete(petId);
        if (!success) {
          return reply.status(404).send({ error: 'Pet not found' });
        }
        return reply.status(204).send();
      } catch (err) {
        request.log.error({ err }, 'Handler error');
        throw err;
      }
    },
  );
}

export default petRoutes;
