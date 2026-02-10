import { Server, Socket } from 'socket.io';
import { setupVideoHandlers } from './video-handlers.js';
import { setupChatHandlers } from './chat-handlers.js';
import { setupNotificationHandlers } from './notification-handlers.js';
import { logger } from '../logger.js';

export function setupEventHandlers(io: Server, socket: Socket) {
  logger.debug(`Setting up event handlers for socket: ${socket.id}`);

  // Video-related handlers
  setupVideoHandlers(io, socket);

  // Chat handlers
  setupChatHandlers(io, socket);

  // Notification handlers
  setupNotificationHandlers(io, socket);

  // Heartbeat/ping for connection health
  socket.on('ping', () => {
    socket.emit('pong', { timestamp: Date.now() });
  });
}
