import { FastifyInstance, FastifyRequest } from 'fastify';
import { SocketStream } from '@fastify/websocket';
import { wsLogger } from '../utils/logger.js';
import { Pet } from '../models/Pet.js';
import WebSocket from 'ws';

interface WSMessage {
  type: 'subscribe' | 'unsubscribe';
  topic: 'pets' | 'orders';
}

export async function handleWebSocket(connection: SocketStream, request: FastifyRequest, _server: FastifyInstance) {
  const { socket } = connection;
  const clientId = request.id;

  wsLogger.info({ clientId }, 'Client connected');

  // Handle incoming messages
  socket.on('message', async (rawData: Buffer) => {
    try {
      const message: WSMessage = JSON.parse(rawData.toString());
      wsLogger.info({ clientId, message }, 'Received message');

      switch (message.type) {
        case 'subscribe':
          handleSubscribe(socket, message.topic, clientId);
          break;
        case 'unsubscribe':
          handleUnsubscribe(socket, message.topic, clientId);
          break;
        default:
          socket.send(JSON.stringify({ error: 'Invalid message type' }));
      }
    } catch (error) {
      wsLogger.error({ clientId, error }, 'Error processing message');
      socket.send(JSON.stringify({ error: 'Invalid message format' }));
    }
  });

  // Handle client disconnect
  socket.on('close', () => {
    wsLogger.info({ clientId }, 'Client disconnected');
  });
}

function handleSubscribe(socket: WebSocket, topic: string, clientId: string) {
  wsLogger.info({ clientId, topic }, 'Client subscribed to topic');
  socket.send(JSON.stringify({ type: 'subscribed', topic }));
}

function handleUnsubscribe(socket: WebSocket, topic: string, clientId: string) {
  wsLogger.info({ clientId, topic }, 'Client unsubscribed from topic');
  socket.send(JSON.stringify({ type: 'unsubscribed', topic }));
}

// Event emitters for real-time updates
export function emitPetUpdate(server: FastifyInstance, pet: Pet) {
  const message = JSON.stringify({
    type: 'update',
    topic: 'pets',
    data: pet,
  });

  server.websocketServer.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

export function emitPetDelete(server: FastifyInstance, petId: string) {
  const message = JSON.stringify({
    type: 'delete',
    topic: 'pets',
    data: { id: petId },
  });

  server.websocketServer.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}