import { Server as SocketIoServer, Socket } from 'socket.io';
import { Server } from 'http';

interface CommentMessage {
  id: string;
  videoId: string;
  userId: string;
  username: string;
  displayName: string;
  content: string;
  avatarUrl?: string;
  badge?: 'verified' | 'member' | 'moderator';
  timestamp: Date;
}

interface VideoRoom {
  videoId: string;
  socketIds: Set<string>;
  messageCount: number;
}

class CommentBroadcaster {
  private io: SocketIoServer;
  private videoRooms: Map<string, VideoRoom> = new Map();
  private userSocketMap: Map<string, string> = new Map(); // userId -> socketId

  constructor(httpServer: Server) {
    this.io = new SocketIoServer(httpServer, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:5173',
        credentials: true,
      },
      transports: ['websocket', 'polling'],
    });

    this.setupConnectionHandlers();
  }

  private setupConnectionHandlers() {
    this.io.on('connection', (socket: Socket) => {
      console.log(`User connected: ${socket.id}`);

      // Join video chat room
      socket.on('join-video', (data: { videoId: string; userId?: string; username: string; displayName: string }) => {
        const { videoId, userId, username, displayName } = data;

        // Create room if doesn't exist
        if (!this.videoRooms.has(videoId)) {
          this.videoRooms.set(videoId, {
            videoId,
            socketIds: new Set(),
            messageCount: 0,
          });
        }

        const room = this.videoRooms.get(videoId)!;
        room.socketIds.add(socket.id);

        if (userId) {
          this.userSocketMap.set(userId, socket.id);
        }

        // Join Socket.IO room
        socket.join(`video-${videoId}`);

        // Notify others in room
        socket.to(`video-${videoId}`).emit('user-joined', {
          displayName,
          viewerCount: room.socketIds.size,
        });

        // Send viewer count to the joining user
        socket.emit('viewer-count', { count: room.socketIds.size });

        console.log(`User joined video ${videoId}. Viewers: ${room.socketIds.size}`);
      });

      // Handle new comment
      socket.on(
        'send-comment',
        (data: {
          videoId: string;
          userId?: string;
          username: string;
          displayName: string;
          content: string;
          avatarUrl?: string;
          badge?: string;
        }) => {
          const comment: CommentMessage = {
            id: `comment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            videoId: data.videoId,
            userId: data.userId || 'anonymous',
            username: data.username,
            displayName: data.displayName,
            content: data.content,
            avatarUrl: data.avatarUrl,
            badge: data.badge as any,
            timestamp: new Date(),
          };

          const room = this.videoRooms.get(data.videoId);
          if (room) {
            room.messageCount++;
          }

          // Broadcast comment to all users in the video room
          this.io.to(`video-${data.videoId}`).emit('new-comment', comment);

          console.log(`Comment posted in video ${data.videoId}: ${data.displayName}`);
        }
      );

      // Handle typing indicator
      socket.on('user-typing', (data: { videoId: string; displayName: string; isTyping: boolean }) => {
        socket.to(`video-${data.videoId}`).emit('user-typing', {
          displayName: data.displayName,
          isTyping: data.isTyping,
        });
      });

      // Handle like/reaction
      socket.on('react-comment', (data: { videoId: string; commentId: string; reaction: string }) => {
        this.io.to(`video-${data.videoId}`).emit('comment-reaction', data);
      });

      // Leave video room
      socket.on('leave-video', (data: { videoId: string }) => {
        socket.leave(`video-${data.videoId}`);

        const room = this.videoRooms.get(data.videoId);
        if (room) {
          room.socketIds.delete(socket.id);

          if (room.socketIds.size === 0) {
            this.videoRooms.delete(data.videoId);
          } else {
            // Notify remaining users
            this.io.to(`video-${data.videoId}`).emit('viewer-count', {
              count: room.socketIds.size,
            });
          }
        }
      });

      // Disconnect
      socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);

        // Clean up user socket map
        for (const [userId, socketId] of this.userSocketMap.entries()) {
          if (socketId === socket.id) {
            this.userSocketMap.delete(userId);
          }
        }

        // Remove from all rooms
        for (const [videoId, room] of this.videoRooms.entries()) {
          if (room.socketIds.has(socket.id)) {
            room.socketIds.delete(socket.id);

            if (room.socketIds.size === 0) {
              this.videoRooms.delete(videoId);
            } else {
              this.io.to(`video-${videoId}`).emit('viewer-count', {
                count: room.socketIds.size,
              });
            }
          }
        }
      });

      socket.on('error', (error: Error) => {
        console.error('Socket error:', error);
      });
    });
  }

  public getVideoInfo(videoId: string) {
    const room = this.videoRooms.get(videoId);
    return {
      viewerCount: room?.socketIds.size || 0,
      messageCount: room?.messageCount || 0,
    };
  }

  public broadcastToVideo(videoId: string, event: string, data: any) {
    this.io.to(`video-${videoId}`).emit(event, data);
  }

  public getIO() {
    return this.io;
  }
}

export { CommentBroadcaster, CommentMessage, VideoRoom };
