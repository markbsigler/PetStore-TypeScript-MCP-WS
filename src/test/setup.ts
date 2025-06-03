import { afterAll, beforeAll, beforeEach } from '@jest/globals';
import { Server } from 'socket.io';
import { createServer } from 'http';
import { AddressInfo } from 'net';
import io from 'socket.io-client';
import crypto from 'node:crypto';
import { FastifyInstance } from 'fastify';
import { build } from '../app.ts';

let testIo: Server;
let clientSocket: ReturnType<typeof io>;
let httpServer: ReturnType<typeof createServer>;

beforeAll(done => {
  httpServer = createServer();
  testIo = new Server(httpServer);
  httpServer.listen(() => {
    const port = (httpServer.address() as AddressInfo).port;
    clientSocket = io(`http://localhost:${port}`);
    testIo.on('connection', socket => {
      console.log('Client connected:', socket.id);
    });
    done();
  });
});

beforeEach(() => {
  // Clear any mocks or test data before each test
});

afterAll(done => {
  testIo.close();
  clientSocket.close();
  httpServer.close();
  done();
});

export interface TestContext {
  app: FastifyInstance;
}

export async function setupTestEnvironment(): Promise<TestContext> {
  const app = await build();
  
  return {
    app,
  };
}

export async function teardownTestEnvironment(context: TestContext) {
  await context.app.close();
}

export async function clearRedis(app: FastifyInstance) {
  await app.redis.flushAll();
}

// Test utilities
export function generateTestPet() {
  return {
    id: crypto.randomUUID(),
    name: 'Test Pet',
    photoUrls: ['http://example.com/photo.jpg'],
    status: 'available',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function generateTestUser() {
  return {
    id: crypto.randomUUID(),
    username: 'testuser',
    email: 'test@example.com',
    password: 'password123',
  };
}

export function generateTestOrder() {
  return {
    id: crypto.randomUUID(),
    petId: crypto.randomUUID(),
    quantity: 1,
    shipDate: new Date().toISOString(),
    status: 'placed',
    complete: false,
  };
}
