import { Server, Socket } from 'socket.io';
import { config } from '../config/index.ts';
import { WebSocketEvents, WebSocketRooms } from '../types/index.ts';
import { wsLogger } from '../utils/logger.ts';

// Socket middleware for authentication
const authenticateSocket = (socket: Socket, next: (err?: Error) => void): void => {
  if (config.isDevelopment) {
    return next();
  }

  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('Authentication error'));
  }

  try {
    // Verify token here using your JWT implementation
    // socket.data.user = verifiedUser;
    next();
  } catch (error) {
    wsLogger.error('Authentication error:', error);
    next(new Error('Authentication error'));
  }
};

// Handle client connection
const handleConnection = (socket: Socket): void => {
  console.log('Client connected:', socket.id);

  // Join all rooms by default (in a production environment, you'd want to restrict this based on user permissions)
  Object.values(WebSocketRooms).forEach(room => {
    socket.join(room);
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });

  // Set up heartbeat
  const heartbeat = setInterval(() => {
    socket.emit('ping');
  }, 30000); // 30 seconds

  socket.on('disconnect', () => {
    clearInterval(heartbeat);
  });

  socket.on('error', (_err: Error) => {
    // Handle error
  });
};

// Setup WebSocket handlers
export const setupWebSocketHandlers = (io: Server): void => {
  // Use authentication middleware
  io.use(authenticateSocket);

  // Handle connections
  io.on('connection', handleConnection);

  // Set up event emitters on the io instance
  io.emit = Object.assign(io.emit, {
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
  });
};
