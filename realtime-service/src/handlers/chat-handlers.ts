import { Server, Socket } from 'socket.io';
import { logger } from '../logger.js';

export function setupChatHandlers(io: Server, socket: Socket) {
  // Join live chat room
  socket.on('chat:join', (data: { videoId: string }) => {
    const room = `chat:${data.videoId}`;
    socket.join(room);
    logger.debug(`Socket ${socket.id} joined chat room: ${room}`);

    // Notify user count
    const roomSize = io.sockets.adapter.rooms.get(room)?.size || 0;
    io.to(room).emit('chat:user-count', { videoId: data.videoId, count: roomSize });
  });

  // Leave chat room
  socket.on('chat:leave', (data: { videoId: string }) => {
    const room = `chat:${data.videoId}`;
    socket.leave(room);
    logger.debug(`Socket ${socket.id} left chat room: ${room}`);

    const roomSize = io.sockets.adapter.rooms.get(room)?.size || 0;
    io.to(room).emit('chat:user-count', { videoId: data.videoId, count: roomSize });
  });

  // Send chat message
  socket.on('chat:message', (data: { videoId: string; message: string }) => {
    if (!socket.data.userId) {
      socket.emit('chat:error', { message: 'Authentication required' });
      return;
    }

    const room = `chat:${data.videoId}`;
    
    // Broadcast to room
    io.to(room).emit('chat:message', {
      id: Date.now().toString(),
      videoId: data.videoId,
      userId: socket.data.userId,
      message: data.message,
      timestamp: Date.now()
    });

    logger.debug(`Chat message in room ${room} from user ${socket.data.userId}`);
  });

  // Typing indicator
  socket.on('chat:typing', (data: { videoId: string; isTyping: boolean }) => {
    if (!socket.data.userId) return;

    const room = `chat:${data.videoId}`;
    socket.to(room).emit('chat:typing', {
      userId: socket.data.userId,
      isTyping: data.isTyping
    });
  });
}

// Emit chat messages from Kafka
export function emitChatMessage(io: Server, videoId: string, message: any) {
  const room = `chat:${videoId}`;
  io.to(room).emit('chat:message', message);
}
