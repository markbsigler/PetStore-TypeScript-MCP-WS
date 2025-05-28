import { afterAll, beforeAll, beforeEach } from '@jest/globals';
import { Server } from 'socket.io';
import { createServer } from 'http';
import { AddressInfo } from 'net';
import { io as ioc, Socket as ClientSocket } from 'socket.io-client';

let io: Server;
let clientSocket: ClientSocket;
let httpServer: ReturnType<typeof createServer>;

beforeAll(done => {
  httpServer = createServer();
  io = new Server(httpServer);
  httpServer.listen(() => {
    const port = (httpServer.address() as AddressInfo).port;
    clientSocket = ioc(`http://localhost:${port}`);
    io.on('connection', socket => {
      console.log('Client connected:', socket.id);
    });
    done();
  });
});

beforeEach(() => {
  // Clear any mocks or test data before each test
});

afterAll(done => {
  io.close();
  clientSocket.close();
  httpServer.close();
  done();
}); 