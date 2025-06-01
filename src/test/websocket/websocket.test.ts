import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import WebSocket from 'ws';
import { TestContext, setupTestEnvironment, teardownTestEnvironment } from '../setup.js';

describe('WebSocket Integration', () => {
  let context: TestContext;
  let ws: WebSocket;
  const wsUrl = 'ws://localhost:3000/ws';

  beforeAll(async () => {
    context = await setupTestEnvironment();
    await context.app.listen({ port: 3000 });
  });

  afterAll(async () => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.close();
    }
    await teardownTestEnvironment(context);
  });

  test('should connect to WebSocket server', (done) => {
    ws = new WebSocket(wsUrl);

    ws.on('open', () => {
      expect(ws.readyState).toBe(WebSocket.OPEN);
      done();
    });

    ws.on('error', (error) => {
      done(error);
    });
  });

  test('should handle subscribe message', (done) => {
    ws = new WebSocket(wsUrl);

    ws.on('open', () => {
      ws.send(JSON.stringify({
        type: 'subscribe',
        topic: 'pets',
      }));
    });

    ws.on('message', (data) => {
      const message = JSON.parse(data.toString());
      expect(message).toEqual({
        type: 'subscribed',
        topic: 'pets',
      });
      done();
    });

    ws.on('error', (error) => {
      done(error);
    });
  });

  test('should handle unsubscribe message', (done) => {
    ws = new WebSocket(wsUrl);

    ws.on('open', () => {
      ws.send(JSON.stringify({
        type: 'unsubscribe',
        topic: 'pets',
      }));
    });

    ws.on('message', (data) => {
      const message = JSON.parse(data.toString());
      expect(message).toEqual({
        type: 'unsubscribed',
        topic: 'pets',
      });
      done();
    });

    ws.on('error', (error) => {
      done(error);
    });
  });

  test('should handle invalid message format', (done) => {
    ws = new WebSocket(wsUrl);

    ws.on('open', () => {
      ws.send('invalid json');
    });

    ws.on('message', (data) => {
      const message = JSON.parse(data.toString());
      expect(message).toEqual({
        error: 'Invalid message format',
      });
      done();
    });

    ws.on('error', (error) => {
      done(error);
    });
  });

  test('should handle invalid message type', (done) => {
    ws = new WebSocket(wsUrl);

    ws.on('open', () => {
      ws.send(JSON.stringify({
        type: 'invalid',
        topic: 'pets',
      }));
    });

    ws.on('message', (data) => {
      const message = JSON.parse(data.toString());
      expect(message).toEqual({
        error: 'Invalid message type',
      });
      done();
    });

    ws.on('error', (error) => {
      done(error);
    });
  });
}); 