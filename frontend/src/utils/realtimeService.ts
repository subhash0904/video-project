import { io, Socket } from 'socket.io-client';

const API_URL = import.meta.env.VITE_WS_URL || import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:4000';

interface CommentData {
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

class RealtimeCommentService {
  private socket: Socket | null = null;
  private listeners: Map<
    string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Set<(data: any) => void>
  > = new Map();
  private currentVideoId: string | null = null;

  connect() {
    if (this.socket?.connected) return;

    this.socket = io(API_URL, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
      transports: ['websocket', 'polling'],
    });

    this.socket.on('connect', () => {
      console.log('✅ Connected to real-time comment service');
      this.emit('connected', {});
    });

    this.socket.on('disconnect', () => {
      console.log('❌ Disconnected from real-time comment service');
      this.emit('disconnected', {});
    });

    this.socket.on('error', (error) => {
      console.error('WebSocket error:', error);
      this.emit('error', { error });
    });

    // Listen for incoming comments
    this.socket.on('new-comment', (comment: CommentData) => {
      console.log('💬 New comment received:', comment);
      this.emit('new-comment', comment);
    });

    // Listen for viewer count
    this.socket.on('viewer-count', (data: { count: number }) => {
      this.emit('viewer-count', data);
    });

    // Listen for typing indicators
    this.socket.on('user-typing', (data: { displayName: string; isTyping: boolean }) => {
      this.emit('user-typing', data);
    });

    // Listen for reactions
    this.socket.on('comment-reaction', (data) => {
      this.emit('comment-reaction', data);
    });

    // Listen for user joined
    this.socket.on('user-joined', (data) => {
      this.emit('user-joined', data);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.currentVideoId = null;
  }

  joinVideo(videoId: string, userId?: string, username = 'Anonymous', displayName = 'User') {
    if (!this.socket) {
      this.connect();
    }

    this.currentVideoId = videoId;

    this.socket!.emit('join-video', {
      videoId,
      userId,
      username,
      displayName,
    });

    console.log(`👁️ Joined video chat for ${videoId}`);
  }

  leaveVideo() {
    if (this.socket && this.currentVideoId) {
      this.socket.emit('leave-video', { videoId: this.currentVideoId });
      this.currentVideoId = null;
      console.log('👋 Left video chat');
    }
  }

  sendComment(
    videoId: string,
    username: string,
    displayName: string,
    content: string,
    userId?: string,
    avatarUrl?: string,
    badge?: string
  ) {
    if (!this.socket?.connected) {
      console.error('Not connected to real-time service');
      return;
    }

    this.socket.emit('send-comment', {
      videoId,
      userId,
      username,
      displayName,
      content,
      avatarUrl,
      badge,
    });
  }

  notifyTyping(videoId: string, displayName: string, isTyping: boolean) {
    if (!this.socket?.connected) return;

    this.socket.emit('user-typing', {
      videoId,
      displayName,
      isTyping,
    });
  }

  reactToComment(videoId: string, commentId: string, reaction: string) {
    if (!this.socket?.connected) return;

    this.socket.emit('react-comment', {
      videoId,
      commentId,
      reaction,
    });
  }

  // Event subscription system
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  on(event: string, callback: (data: any) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    // Return unsubscribe function
    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  off(event: string, callback: (data: any) => void) {
    this.listeners.get(event)?.delete(callback);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private emit(event: string, data: any) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach((cb) => cb(data));
    }
  }

  isConnected() {
    return this.socket?.connected ?? false;
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  isInVideo(videoId: string) {
    return this.currentVideoId === videoId;
  }
}

// Singleton instance
export const realtimeService = new RealtimeCommentService();
export type { CommentData };
