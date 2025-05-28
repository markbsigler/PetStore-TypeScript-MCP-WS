import { Server, Socket } from 'socket.io';
import config from '../config';

// WebSocket event types
export enum WebSocketEvents {
  PET_CREATED = 'pet:created',
  PET_UPDATED = 'pet:updated',
  PET_DELETED = 'pet:deleted',
  ORDER_CREATED = 'order:created',
  ORDER_UPDATED = 'order:updated',
  ORDER_CANCELLED = 'order:cancelled',
  INVENTORY_UPDATED = 'inventory:updated',
}

// WebSocket room types
export enum WebSocketRooms {
  PETS = 'pets',
  ORDERS = 'orders',
  INVENTORY = 'inventory',
  USERS = 'users',
}

// Socket middleware for authentication
const authenticateSocket = (socket: Socket, next: (err?: Error) => void): void => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('Authentication error'));
  }

  try {
    // Verify token here using your JWT implementation
    // socket.data.user = verifiedUser;
    next();
  } catch (err) {
    next(new Error('Authentication error'));
  }
};

// Handle client connection
const handleConnection = (socket: Socket): void => {
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });

  // Join rooms based on user permissions
  Object.values(WebSocketRooms).forEach(room => {
    socket.join(room);
  });

  // Set up heartbeat
  const heartbeat = setInterval(() => {
    socket.emit('ping');
  }, config.websocket.heartbeatInterval);

  socket.on('disconnect', () => {
    clearInterval(heartbeat);
  });
};

// Setup WebSocket handlers
export const setupWebSocketHandlers = (io: Server): void => {
  // Use authentication middleware
  io.use(authenticateSocket);

  // Handle connections
  io.on('connection', handleConnection);

  // Broadcast methods for different events
  const broadcast = {
    petCreated: (petId: string, data: unknown) => {
      io.to(WebSocketRooms.PETS).emit(WebSocketEvents.PET_CREATED, { petId, data });
    },
    petUpdated: (petId: string, data: unknown) => {
      io.to(WebSocketRooms.PETS).emit(WebSocketEvents.PET_UPDATED, { petId, data });
    },
    petDeleted: (petId: string) => {
      io.to(WebSocketRooms.PETS).emit(WebSocketEvents.PET_DELETED, { petId });
    },
    orderCreated: (orderId: string, data: unknown) => {
      io.to(WebSocketRooms.ORDERS).emit(WebSocketEvents.ORDER_CREATED, { orderId, data });
    },
    orderUpdated: (orderId: string, data: unknown) => {
      io.to(WebSocketRooms.ORDERS).emit(WebSocketEvents.ORDER_UPDATED, { orderId, data });
    },
    orderCancelled: (orderId: string) => {
      io.to(WebSocketRooms.ORDERS).emit(WebSocketEvents.ORDER_CANCELLED, { orderId });
    },
    inventoryUpdated: (data: unknown) => {
      io.to(WebSocketRooms.INVENTORY).emit(WebSocketEvents.INVENTORY_UPDATED, data);
    },
  };

  return broadcast;
}; 