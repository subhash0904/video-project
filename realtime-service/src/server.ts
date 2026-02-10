import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import cors from 'cors';
import dotenv from 'dotenv';
import { logger } from './logger.js';
import { authenticateSocket } from './middleware/auth.js';
import { setupEventHandlers } from './handlers/index.js';
import { startKafkaConsumers } from './kafka-consumers.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);

const PORT = process.env.PORT || 4100;

// CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'realtime',
    timestamp: new Date().toISOString(),
    connections: io.engine.clientsCount
  });
});

// Redis for Socket.io adapter (multi-server support)
const pubClient = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379')
});

const subClient = pubClient.duplicate();

// Socket.io setup
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || '*',
    credentials: true
  },
  adapter: createAdapter(pubClient, subClient),
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000
});

// Authentication middleware
io.use(authenticateSocket);

// Connection handling
io.on('connection', (socket: Socket) => {
  logger.info(`Client connected: ${socket.id}`, {
    userId: socket.data.userId,
    authenticated: !!socket.data.userId
  });

  // Setup event handlers
  setupEventHandlers(io, socket);

  // Disconnection
  socket.on('disconnect', (reason) => {
    logger.info(`Client disconnected: ${socket.id}`, { reason });
  });

  socket.on('error', (error) => {
    logger.error(`Socket error: ${socket.id}`, error);
  });
});

// Start Kafka consumers to push events to connected clients
startKafkaConsumers(io).catch((error) => {
  logger.error('Failed to start Kafka consumers:', error);
});

// Start server
httpServer.listen(PORT, () => {
  logger.info(`🔴 Realtime service running on port ${PORT}`);
  logger.info(`🌍 CORS enabled for: ${process.env.FRONTEND_URL || '*'}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, closing connections...');
  io.close(() => {
    httpServer.close(() => {
      logger.info('Server closed');
      process.exit(0);
    });
  });
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, closing connections...');
  io.close(() => {
    httpServer.close(() => {
      logger.info('Server closed');
      process.exit(0);
    });
  });
});

export { io };
