import { FastifyPluginAsync } from 'fastify';
import { withCache } from '../../decorators/cache.js';
import { Type } from '@sinclair/typebox';

const PetTypeBoxSchema = Type.Object({
  id: Type.String(),
  name: Type.String(),
  category: Type.Optional(Type.Object({
    id: Type.Number(),
    name: Type.String(),
  })),
  photoUrls: Type.Array(Type.String()),
  tags: Type.Optional(Type.Array(Type.Object({
    id: Type.Number(),
    name: Type.String(),
  }))),
  status: Type.Union([
    Type.Literal('available'),
    Type.Literal('pending'),
    Type.Literal('sold'),
  ]),
  createdAt: Type.String(),
  updatedAt: Type.String(),
});

const plugin: FastifyPluginAsync = async (fastify) => {
  const schema = {
    response: {
      200: Type.Array(PetTypeBoxSchema),
    },
    querystring: Type.Object({
      status: Type.Optional(Type.String()),
      limit: Type.Optional(Type.Number()),
      offset: Type.Optional(Type.Number()),
    }),
  };

  fastify.get('/pets', {
    schema,
    handler: withCache({ ttl: 300 })(async (request) => { // Cache for 5 minutes
      const { status, limit = 10, offset = 0 } = request.query as { status?: string; limit?: number; offset?: number };

      const pets = await fastify.redis.hGetAll('pets');
      const filteredPets = Object.values(pets)
        .map(pet => JSON.parse(pet))
        .filter(pet => !status || pet.status === status)
        .slice(offset, offset + limit);

      return filteredPets;
    }),
  });
};

export default plugin;