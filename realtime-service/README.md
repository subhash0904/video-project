# Realtime Service (WebSocket)

WebSocket service for real-time updates including live view counts, likes, comments, chat, and notifications.

## Features

- **Real-time Video Updates**
  - Live view count
  - Live like/dislike count
  - Live comment notifications
  - Current viewer count per video

- **Live Chat**
  - Real-time chat for live streams
  - Typing indicators
  - User presence

- **Push Notifications**
  - Instant notifications to users
  - Channel-based notifications
  - Subscription updates

- **Multi-Server Support**
  - Redis adapter for horizontal scaling
  - Sticky sessions not required
  - Load balanced WebSocket connections

## Architecture

```
User Browser
     ↓
WebSocket Connection
     ↓
Socket.io Server (with Redis Adapter)
     ↓
Redis Pub/Sub (for multi-server)
     ↓
Kafka Consumer (real-time events)
     ↓
Broadcast to Connected Clients
```

## Events

### Client → Server

#### Video Events
```typescript
// Join video room to receive updates
socket.emit('video:join', { videoId: '123' });

// Leave video room
socket.emit('video:leave', { videoId: '123' });

// Sync playback position (multi-device)
socket.emit('video:progress', { videoId: '123', timestamp: 45.5 });
```

#### Chat Events
```typescript
// Join live chat
socket.emit('chat:join', { videoId: '123' });

// Send chat message
socket.emit('chat:message', { videoId: '123', message: 'Hello!' });

// Typing indicator
socket.emit('chat:typing', { videoId: '123', isTyping: true });

// Leave chat
socket.emit('chat:leave', { videoId: '123' });
```

#### Notification Events
```typescript
// Subscribe to channel notifications
socket.emit('notifications:subscribe', { channelId: '456' });

// Unsubscribe
socket.emit('notifications:unsubscribe', { channelId: '456' });

// Mark as read
socket.emit('notifications:read', { notificationId: '789' });
```

### Server → Client

#### Video Updates
```typescript
// Current viewer count
socket.on('video:viewers', (data) => {
  // { videoId: '123', count: 1234 }
});

// Live view count update
socket.on('video:view', (data) => {
  // { videoId: '123', timestamp: 1234567890 }
});

// Like/dislike update
socket.on('video:like', (data) => {
  // { videoId: '123', type: 'video.like', timestamp: 1234567890 }
});

// New comment
socket.on('video:comment', (data) => {
  // { videoId: '123', commentId: '456', timestamp: 1234567890 }
});

// Playback sync (multi-device)
socket.on('video:sync', (data) => {
  // { videoId: '123', timestamp: 45.5 }
});
```

#### Chat Messages
```typescript
// New chat message
socket.on('chat:message', (message) => {
  // {
  //   id: '123',
  //   videoId: '456',
  //   userId: '789',
  //   message: 'Hello!',
  //   timestamp: 1234567890
  // }
});

// Active users in chat
socket.on('chat:user-count', (data) => {
  // { videoId: '123', count: 45 }
});

// Typing indicator
socket.on('chat:typing', (data) => {
  // { userId: '789', isTyping: true }
});
```

#### Notifications
```typescript
// New notification
socket.on('notification', (notification) => {
  // {
  //   id: '123',
  //   type: 'new_video',
  //   title: 'New video from Channel',
  //   message: 'Check out the latest video!',
  //   timestamp: 1234567890
  // }
});
```

## Client Integration

### React/TypeScript Example

```typescript
import { io, Socket } from 'socket.io-client';

class RealtimeService {
  private socket: Socket;

  constructor(token?: string) {
    this.socket = io('http://localhost:4100', {
      auth: { token },
      transports: ['websocket', 'polling']
    });

    this.socket.on('connect', () => {
      console.log('Connected to realtime service');
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from realtime service');
    });
  }

  // Join video room
  joinVideo(videoId: string) {
    this.socket.emit('video:join', { videoId });
  }

  // Listen for live view updates
  onVideoView(callback: (data: any) => void) {
    this.socket.on('video:view', callback);
  }

  // Join chat
  joinChat(videoId: string) {
    this.socket.emit('chat:join', { videoId });
  }

  // Send chat message
  sendChatMessage(videoId: string, message: string) {
    this.socket.emit('chat:message', { videoId, message });
  }

  // Listen for chat messages
  onChatMessage(callback: (message: any) => void) {
    this.socket.on('chat:message', callback);
  }

  // Clean up
  disconnect() {
    this.socket.disconnect();
  }
}

export default RealtimeService;
```

### Usage in Component

```typescript
import { useEffect, useState } from 'react';
import RealtimeService from './RealtimeService';

function VideoPlayer({ videoId, token }) {
  const [viewerCount, setViewerCount] = useState(0);
  const [realtime, setRealtime] = useState<RealtimeService>();

  useEffect(() => {
    const service = new RealtimeService(token);
    setRealtime(service);

    // Join video room
    service.joinVideo(videoId);

    // Listen for viewer count updates
    service.onVideoView((data) => {
      console.log('View update:', data);
    });

    // Cleanup
    return () => {
      service.disconnect();
    };
  }, [videoId, token]);

  return (
    <div>
      <h1>Video Player</h1>
      <p>Current viewers: {viewerCount}</p>
    </div>
  );
}
```

## Scaling

### Horizontal Scaling

The service uses Socket.io Redis adapter, enabling multiple server instances:

```bash
# Run 3 instances
docker-compose up --scale realtime-service=3
```

All instances share state via Redis pub/sub.

### Load Balancing

Configure load balancer for WebSocket:

#### Nginx
```nginx
upstream realtime {
    ip_hash; # Optional: sticky sessions
    server realtime-1:4100;
    server realtime-2:4100;
    server realtime-3:4100;
}

server {
    location /socket.io/ {
        proxy_pass http://realtime;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Development

```bash
# Install dependencies
pnpm install

# Run in development
pnpm dev

# Build
pnpm build

# Production
pnpm start
```

## Configuration

See [.env.example](.env.example) for all options.

## Monitoring

### Health Check

```bash
curl http://localhost:4100/health
```

Response:
```json
{
  "status": "healthy",
  "service": "realtime",
  "timestamp": "2026-02-10T...",
  "connections": 1234
}
```

### Connection Stats

View connected clients:
```javascript
io.engine.clientsCount
```

View room sizes:
```javascript
io.sockets.adapter.rooms
```

## Performance

### Metrics

- **Max connections per instance**: 10K-50K
- **Message throughput**: 100K+ messages/sec
- **Latency**: < 100ms (same region)
- **Memory per connection**: ~1 KB

### Optimization Tips

1. Use binary data for large payloads
2. Implement message batching
3. Use Redis pub/sub for multi-server
4. Configure pingTimeout and pingInterval
5. Use compression for large messages

## Security

### Authentication

- JWT-based authentication
- Optional authentication (allows public access)
- Token validation on connection

### Rate Limiting

Implemented at API Gateway level for HTTP requests. WebSocket rate limiting can be added:

```typescript
// Example: limit messages per user
const messageRateLimit = new Map();

socket.on('chat:message', (data) => {
  const userId = socket.data.userId;
  const now = Date.now();
  const userRate = messageRateLimit.get(userId) || { count: 0, resetTime: now + 60000 };

  if (now > userRate.resetTime) {
    userRate.count = 0;
    userRate.resetTime = now + 60000;
  }

  userRate.count++;

  if (userRate.count > 10) { // 10 messages per minute
    socket.emit('error', { message: 'Rate limit exceeded' });
    return;
  }

  messageRateLimit.set(userId, userRate);
  // Process message...
});
```

## Testing

### Test Connection

```javascript
const io = require('socket.io-client');

const socket = io('http://localhost:4100', {
  auth: { token: 'your-jwt-token' }
});

socket.on('connect', () => {
  console.log('Connected:', socket.id);
  
  socket.emit('video:join', { videoId: '123' });
});

socket.on('video:viewers', (data) => {
  console.log('Viewers:', data);
});
```
