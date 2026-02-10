import { Server, Socket } from 'socket.io';
import { logger } from '../logger.js';

export function setupNotificationHandlers(io: Server, socket: Socket) {
  // Join user's personal notification room
  if (socket.data.userId) {
    const room = `user:${socket.data.userId}`;
    socket.join(room);
    logger.debug(`Socket ${socket.id} joined notification room: ${room}`);
  }

  // Subscribe to channel notifications
  socket.on('notifications:subscribe', (data: { channelId: string }) => {
    if (!socket.data.userId) return;

    const room = `channel:${data.channelId}`;
    socket.join(room);
    logger.debug(`Socket ${socket.id} subscribed to channel notifications: ${room}`);
  });

  // Unsubscribe from channel notifications
  socket.on('notifications:unsubscribe', (data: { channelId: string }) => {
    const room = `channel:${data.channelId}`;
    socket.leave(room);
    logger.debug(`Socket ${socket.id} unsubscribed from channel notifications: ${room}`);
  });

  // Mark notification as read
  socket.on('notifications:read', (data: { notificationId: string }) => {
    if (!socket.data.userId) return;
    
    logger.debug(`Notification ${data.notificationId} marked as read by user ${socket.data.userId}`);
    // Database update would happen here or via API
  });
}

// Send notification to user
export function sendNotification(io: Server, userId: string, notification: any) {
  const room = `user:${userId}`;
  io.to(room).emit('notification', notification);
}

// Send notification to channel subscribers
export function sendChannelNotification(io: Server, channelId: string, notification: any) {
  const room = `channel:${channelId}`;
  io.to(room).emit('notification', notification);
}
