import { FastifyInstance } from 'fastify';
import { PetController } from '../controllers/PetController.js';
import { Pet } from '../types/index.js';
import { Type } from '@sinclair/typebox';

export async function petRoutes(fastify: FastifyInstance) {
  const petController = new PetController();

  // Register multipart plugin
  await fastify.register(import('@fastify/multipart'), {
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB
    },
  });

  // Schema definitions
  const TagSchema = Type.Object({
    id: Type.Number(),
    name: Type.String(),
  });

  const CategorySchema = Type.Object({
    id: Type.Number(),
    name: Type.String(),
  });

  const PetSchema = Type.Object({
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
          200: Type.Array(PetSchema),
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
          200: Type.Array(PetSchema),
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
        const error = err as Error;
        return reply.status(400).send({ error: error.message });
      }
    },
  );

  // POST /pets/{petId}/uploadImage
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
        const error = err as Error;
        if (error.message === 'Pet not found') {
          return reply.status(404).send({ error: error.message });
        }
        return reply.status(400).send({ error: error.message });
      }
    },
  );

  // GET /pets
  fastify.get(
    '/pets',
    {
      schema: {
        querystring: Type.Object({
          page: Type.Optional(Type.Number({ minimum: 1 })),
          limit: Type.Optional(Type.Number({ minimum: 1, maximum: 100 })),
          status: Type.Optional(Type.String()),
        }),
        response: {
          200: Type.Object({
            data: Type.Array(PetSchema),
            pagination: Type.Object({
              total: Type.Number(),
              page: Type.Number(),
              limit: Type.Number(),
              pages: Type.Number(),
            }),
          }),
        },
      },
    },
    async (request, reply) => {
      const { page = 1, limit = 10, status } = request.query as { page?: number; limit?: number; status?: string };
      const result = await petController.findAll(page, limit, status);
      return reply.send(result);
    },
  );

  // GET /pets/{petId}
  fastify.get(
    '/pets/:petId',
    {
      schema: {
        params: Type.Object({
          petId: Type.String(),
        }),
        response: {
          200: PetSchema,
          404: Type.Object({
            error: Type.String(),
          }),
        },
      },
    },
    async (request, reply) => {
      const { petId } = request.params as { petId: string };
      const pet = await petController.findById(petId);
      if (!pet) {
        return reply.status(404).send({ error: 'Pet not found' });
      }
      return reply.send(pet);
    },
  );

  // POST /pets
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
    async (request, reply) => {
      const pet = await petController.create(request.body as Pet);
      return reply.status(201).send(pet);
    },
  );

  // PUT /pets/{petId}
  fastify.put(
    '/pets/:petId',
    {
      schema: {
        params: Type.Object({
          petId: Type.String(),
        }),
        body: PetSchema,
        response: {
          200: PetSchema,
          404: Type.Object({
            error: Type.String(),
          }),
        },
      },
    },
    async (request, reply) => {
      const { petId } = request.params as { petId: string };
      const pet = await petController.update(petId, request.body as Pet);
      if (!pet) {
        return reply.status(404).send({ error: 'Pet not found' });
      }
      return reply.send(pet);
    },
  );

  // DELETE /pets/{petId}
  fastify.delete(
    '/pets/:petId',
    {
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
      const { petId } = request.params as { petId: string };
      const success = await petController.delete(petId);
      if (!success) {
        return reply.status(404).send({ error: 'Pet not found' });
      }
      return reply.status(204).send();
    },
  );
}
