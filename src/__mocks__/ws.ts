import { Server as WebSocketServer } from 'ws';

class MockWebSocket {
  on = jest.fn();
  once = jest.fn();
  send = jest.fn();
  close = jest.fn();
  ping = jest.fn();
  readyState = 1; // WebSocket.OPEN
}

class MockWebSocketServerImpl {
  clients = new Set();
  on = jest.fn();
  close = jest.fn();
}

const MockWebSocketServer = MockWebSocketServerImpl as unknown as typeof WebSocketServer;

const WebSocket = Object.assign(
  jest.fn().mockImplementation(() => new MockWebSocket()),
  {
    Server: MockWebSocketServer,
    OPEN: 1,
    CLOSED: 3,
  }
);

export { WebSocket };
export default WebSocket;
