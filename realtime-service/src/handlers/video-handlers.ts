import { Server, Socket } from 'socket.io';
import { logger } from '../logger.js';

export function setupVideoHandlers(io: Server, socket: Socket) {
  // Join video room
  socket.on('video:join', (data: { videoId: string }) => {
    const room = `video:${data.videoId}`;
    socket.join(room);
    logger.debug(`Socket ${socket.id} joined video room: ${room}`);

    // Notify room about current viewer count
    const roomSize = io.sockets.adapter.rooms.get(room)?.size || 0;
    io.to(room).emit('video:viewers', { videoId: data.videoId, count: roomSize });
  });

  // Leave video room
  socket.on('video:leave', (data: { videoId: string }) => {
    const room = `video:${data.videoId}`;
    socket.leave(room);
    logger.debug(`Socket ${socket.id} left video room: ${room}`);

    // Update viewer count
    const roomSize = io.sockets.adapter.rooms.get(room)?.size || 0;
    io.to(room).emit('video:viewers', { videoId: data.videoId, count: roomSize });
  });

  // Watch progress (for synchronized watching)
  socket.on('video:progress', (data: { videoId: string; timestamp: number }) => {
    if (!socket.data.userId) return;

    // Broadcast to user's other devices
    socket.to(`user:${socket.data.userId}`).emit('video:sync', {
      videoId: data.videoId,
      timestamp: data.timestamp
    });
  });
}

// Emit real-time updates to video rooms
export function emitVideoUpdate(io: Server, videoId: string, type: string, data: any) {
  const room = `video:${videoId}`;
  io.to(room).emit(`video:${type}`, data);
}
