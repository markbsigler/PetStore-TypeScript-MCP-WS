import { Server } from 'socket.io';
import { Pet } from './types/index.js';

export interface WebSocketEvents {
  petCreated: { petId: string; data: Pet };
  petUpdated: { petId: string; data: Pet };
  petDeleted: { petId: string };
}

export function setupWebSocketHandlers(io: Server): void {
  io.on('connection', socket => {
    console.log('Client connected:', socket.id);

    socket.on('error', error => {
      console.error('WebSocket error:', error);
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });
}
