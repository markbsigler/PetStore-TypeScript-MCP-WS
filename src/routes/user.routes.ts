import { FastifyInstance } from 'fastify';
import { UserController } from '../controllers/UserController.ts';
import { User } from '../types/user.ts';
import { Type } from '@sinclair/typebox';

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: import('fastify').FastifyRequest, reply: import('fastify').FastifyReply) => Promise<void>;
  }
}

async function userRoutes(fastify: FastifyInstance) {
  fastify.log.info('Registering user routes');

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
  
  // Schema for creating a user (without requiring id)
  const CreateUserSchema = Type.Omit(UserSchema, ['id']);

  // POST /users - Create a new user
  fastify.post(
    '/users',
    {
      schema: {
        body: CreateUserSchema,
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
        const user = await new UserController(fastify).createUser(request.body as Omit<User, 'id'>);
        return reply.send(user);
      } catch (err) {
        request.log.error({ err }, 'Handler error');
        throw err;
      }
    },
  );

  // POST /createWithArray
  fastify.post(
    '/createWithArray',
    {
      preHandler: [fastify.authenticate],
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
        request.log.error({ err }, 'Handler error');
        throw err;
      }
    },
  );

  // POST /createWithList
  fastify.post(
    '/createWithList',
    {
      preHandler: [fastify.authenticate],
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
        request.log.error({ err }, 'Handler error');
        throw err;
      }
    },
  );

  // GET /users/:username - Get user by username
  fastify.get(
    '/users/:username',
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
        const user = await new UserController(fastify).getUserByName(username);
        return reply.send(user);
      } catch (err) {
        request.log.error({ err }, 'Handler error');
        throw err;
      }
    },
  );

  // PUT /users/:username - Update user
  fastify.put(
    '/users/:username',
    {
      preHandler: [fastify.authenticate],
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
        const user = await new UserController(fastify).updateUser(username, request.body as User);
        return reply.send(user);
      } catch (err) {
        request.log.error({ err }, 'Handler error');
        throw err;
      }
    },
  );

  // DELETE /users/:username - Delete user
  fastify.delete(
    '/users/:username',
    {
      preHandler: [fastify.authenticate],
      schema: {
        params: Type.Object({
          username: Type.String(),
        }),
        response: {
          204: Type.Null(),
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
        const success = await new UserController(fastify).deleteUser(username);
        if (!success) {
          return reply.status(404).send({ error: 'User not found' });
        }
        return reply.status(204).send();
      } catch (err) {
        request.log.error({ err }, 'Handler error');
        throw err;
      }
    },
  );

  // GET /users/login - User login
  fastify.get(
    '/users/login',
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
        const result = await new UserController(fastify).login(username, password);

        reply.header('X-Rate-Limit', '100');
        reply.header('X-Expires-After', result.expiresAfter);

        return reply.send(result);
      } catch (err) {
        request.log.error({ err }, 'Handler error');
        throw err;
      }
    },
  );

  // GET /users/logout - User logout
  fastify.get(
    '/users/logout',
    {
      preHandler: [fastify.authenticate],
      schema: {
        response: {
          200: Type.Object({
            message: Type.String(),
          }),
          401: Type.Object({
            error: Type.String(),
          }),
        },
      },
    },
    async (request, _reply) => {
      try {
        const { username } = request.user as { username: string };
        await new UserController(fastify).logout(username);
        return { message: 'Successfully logged out' };
      } catch (err) {
        request.log.error({ err }, 'Handler error');
        throw err;
      }
    },
  );
}

export default userRoutes;
