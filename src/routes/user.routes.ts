import { FastifyInstance } from 'fastify';
import { UserController } from '../controllers/UserController.js';
import { User } from '../types/user.js';
import { Type } from '@sinclair/typebox';

export async function userRoutes(fastify: FastifyInstance) {
  // Schema definitions
  const UserSchema = Type.Object({
    id: Type.Number(),
    username: Type.String(),
    firstName: Type.String(),
    lastName: Type.String(),
    email: Type.String(),
    password: Type.String(),
    phone: Type.String(),
    userStatus: Type.Number(),
  });

  // POST /user
  fastify.post(
    '/user',
    {
      schema: {
        body: UserSchema,
        response: {
          200: UserSchema,
          400: Type.Object({
            error: Type.String(),
          }),
        },
      },
    },
    async (request, reply) => {
      try {
        const user = await new UserController().createUser(request.body as User);
        return reply.send(user);
      } catch (err) {
        const error = err as Error;
        return reply.status(400).send({ error: error.message });
      }
    },
  );

  // POST /user/createWithArray
  fastify.post(
    '/user/createWithArray',
    {
      schema: {
        body: Type.Array(UserSchema),
        response: {
          200: Type.Object({
            message: Type.String(),
          }),
          400: Type.Object({
            error: Type.String(),
          }),
        },
      },
    },
    async (request, reply) => {
      try {
        await new UserController().createUsersWithArray(request.body as User[]);
        return reply.send({ message: 'Users created successfully' });
      } catch (err) {
        const error = err as Error;
        return reply.status(400).send({ error: error.message });
      }
    },
  );

  // POST /user/createWithList
  fastify.post(
    '/user/createWithList',
    {
      schema: {
        body: Type.Array(UserSchema),
        response: {
          200: Type.Object({
            message: Type.String(),
          }),
          400: Type.Object({
            error: Type.String(),
          }),
        },
      },
    },
    async (request, reply) => {
      try {
        await new UserController().createUsersWithList(request.body as User[]);
        return reply.send({ message: 'Users created successfully' });
      } catch (err) {
        const error = err as Error;
        return reply.status(400).send({ error: error.message });
      }
    },
  );

  // GET /user/{username}
  fastify.get(
    '/user/:username',
    {
      schema: {
        params: Type.Object({
          username: Type.String(),
        }),
        response: {
          200: UserSchema,
          400: Type.Object({
            error: Type.String(),
          }),
          404: Type.Object({
            error: Type.String(),
          }),
        },
      },
    },
    async (request, reply) => {
      try {
        const { username } = request.params as { username: string };
        const user = await new UserController().getUserByName(username);
        return reply.send(user);
      } catch (err) {
        const error = err as Error;
        if (error.message === 'User not found') {
          return reply.status(404).send({ error: error.message });
        }
        return reply.status(400).send({ error: error.message });
      }
    },
  );

  // PUT /user/{username}
  fastify.put(
    '/user/:username',
    {
      schema: {
        params: Type.Object({
          username: Type.String(),
        }),
        body: UserSchema,
        response: {
          200: UserSchema,
          400: Type.Object({
            error: Type.String(),
          }),
          404: Type.Object({
            error: Type.String(),
          }),
        },
      },
    },
    async (request, reply) => {
      try {
        const { username } = request.params as { username: string };
        const user = await new UserController().updateUser(username, request.body as User);
        return reply.send(user);
      } catch (err) {
        const error = err as Error;
        if (error.message === 'User not found') {
          return reply.status(404).send({ error: error.message });
        }
        return reply.status(400).send({ error: error.message });
      }
    },
  );

  // DELETE /user/{username}
  fastify.delete(
    '/user/:username',
    {
      schema: {
        params: Type.Object({
          username: Type.String(),
        }),
        response: {
          400: Type.Object({
            error: Type.String(),
          }),
          404: Type.Object({
            error: Type.String(),
          }),
        },
      },
    },
    async (request, reply) => {
      try {
        const { username } = request.params as { username: string };
        const success = await new UserController().deleteUser(username);
        if (!success) {
          return reply.status(404).send({ error: 'User not found' });
        }
        return reply.status(204).send();
      } catch (err) {
        const error = err as Error;
        return reply.status(400).send({ error: error.message });
      }
    },
  );

  // GET /user/login
  fastify.get(
    '/user/login',
    {
      schema: {
        querystring: Type.Object({
          username: Type.String(),
          password: Type.String(),
        }),
        response: {
          200: Type.Object({
            token: Type.String(),
            expiresAfter: Type.String(),
          }),
          400: Type.Object({
            error: Type.String(),
          }),
        },
      },
    },
    async (request, reply) => {
      try {
        const { username, password } = request.query as { username: string; password: string };
        const result = await new UserController().login(username, password);

        reply.header('X-Rate-Limit', '100');
        reply.header('X-Expires-After', result.expiresAfter);

        return reply.send(result);
      } catch (err) {
        const error = err as Error;
        return reply.status(400).send({ error: error.message });
      }
    },
  );

  // GET /user/logout
  fastify.get(
    '/user/logout',
    {
      schema: {
        response: {
          200: Type.Object({
            message: Type.String(),
          }),
        },
      },
    },
    async (request, reply) => {
      try {
        const username = (request.headers['x-username'] as string) || '';
        await new UserController().logout(username);
        return reply.send({ message: 'User logged out successfully' });
      } catch (err) {
        const error = err as Error;
        return reply.status(400).send({ error: error.message });
      }
    },
  );
}
