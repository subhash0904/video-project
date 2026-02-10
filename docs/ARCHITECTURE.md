# Architecture Documentation

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                         │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  React + TypeScript + Vite + Tailwind                │   │
│  │  - Pages (Home, Watch, Shorts, Search, Login)        │   │
│  │  - Components (VideoCard, Navbar, Sidebar, Player)   │   │
│  │  - State Management (Auth Context)                   │   │
│  │  - API Client (Axios/Fetch wrappers)                 │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                           │
                           │ HTTP/REST
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                         API LAYER                            │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Node.js + Express + TypeScript                      │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐          │   │
│  │  │   Auth   │  │  Videos  │  │ Channels │          │   │
│  │  └──────────┘  └──────────┘  └──────────┘          │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐          │   │
│  │  │  Users   │  │Analytics │  │   Recs   │          │   │
│  │  └──────────┘  └──────────┘  └──────────┘          │   │
│  │                                                      │   │
│  │  Middleware: Auth, Error Handling, Validation       │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                           │
                  ┌────────┴────────┐
                  │                 │
                  ▼                 ▼
┌──────────────────────────┐  ┌─────────────────────┐
│    DATA LAYER            │  │  CACHE LAYER        │
│  ┌────────────────────┐  │  │  ┌───────────────┐ │
│  │   PostgreSQL 16    │  │  │  │   Redis 7     │ │
│  │                    │  │  │  │               │ │
│  │  - Users           │  │  │  │ - Sessions    │ │
│  │  - Videos          │  │  │  │ - Feed cache  │ │
│  │  - Channels        │  │  │  │ - Video cache │ │
│  │  - Subscriptions   │  │  │  └───────────────┘ │
│  │  - WatchHistory    │  │  └─────────────────────┘
│  │  - Likes           │  │
│  │  - Comments        │  │
│  │  - Analytics       │  │
│  └────────────────────┘  │
└──────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    STREAMING LAYER                           │
│  ┌──────────────────────────────────────────────────────┐   │
│  │            FFmpeg + HLS + Nginx                      │   │
│  │                                                      │   │
│  │  Upload → Transcode → Multiple Qualities → Serve    │   │
│  │                                                      │   │
│  │  144p ─┐                                            │   │
│  │  360p  ├───→ HLS Playlist ──→ Nginx ──→ CDN       │   │
│  │  720p  │                                            │   │
│  │  1080p │                                            │   │
│  │  2160p ─┘                                            │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                      ML LAYER                                │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         Python + Flask + Scikit-learn                │   │
│  │                                                      │   │
│  │  - Collaborative Filtering                          │   │
│  │  - Content-Based Recommendations                    │   │
│  │  - Trending Algorithm                               │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Request Flow

### 1. User Registration
```
Client → POST /api/auth/register
         ↓
      Validate Input
         ↓
      Hash Password (bcrypt)
         ↓
      Create User + Channel (Transaction)
         ↓
      Generate JWT + Refresh Token
         ↓
      Return User + Tokens
```

### 2. Video Feed Request
```
Client → GET /api/videos/feed
         ↓
      Check Redis Cache
         ↓
    Cache Hit? ──Yes──→ Return Cached Data
         │
        No
         ↓
      Query Database (with pagination)
         ↓
      Cache Result (TTL: 2 minutes)
         ↓
      Return Video List
```

### 3. Video View
```
Client → GET /api/videos/:id
         ↓
      Check Redis Cache
         ↓
    Cache Hit? ──Yes──→ Return Cached Video
         │
        No
         ↓
      Query Database (includes channel, qualities)
         ↓
      Increment View Count (async)
         ↓
      Create Watch History (async)
         ↓
      Track Analytics Event (async)
         ↓
      Cache Result (TTL: 5 minutes)
         ↓
      Return Video Data
```

### 4. Video Upload & Transcode
```
Client → POST /api/videos/upload
         ↓
      Validate & Save Metadata (status: PROCESSING)
         ↓
      Queue Transcoding Job
         ↓
      Return Video ID
         
         (Background Process)
         ↓
      FFmpeg Transcodes to Multiple Qualities
         ↓
      Generate HLS Playlists
         ↓
      Create Master Playlist
         ↓
      Update Video Status (READY)
         ↓
      Invalidate Caches
```

## Database Schema Relationships

```
┌──────────┐        ┌──────────┐
│   User   │1──────1│ Channel  │
└──────────┘        └──────────┘
     │1                  │1
     │                   │
     │*                  │*
┌──────────────┐   ┌──────────┐
│Subscription  │   │  Video   │
└──────────────┘   └──────────┘
                         │1
     User 1──────* Watch │
     User 1──────* Like  │
     User 1──────* Comment
                         │1
                         │*
                   ┌──────────────┐
                   │VideoQuality  │
                   └──────────────┘
```

## API Module Structure

Each API module follows this pattern:

```
modules/
└── {module}/
    ├── {module}.service.ts    # Business logic & database queries
    ├── {module}.controller.ts # Request handling & validation
    └── {module}.routes.ts     # Route definitions
```

### Service Layer
- Contains all business logic
- Interacts with database (Prisma)
- Handles caching (Redis)
- Throws AppError for known errors

### Controller Layer
- Validates requests (express-validator)
- Calls service methods
- Formats responses
- Handles pagination

### Route Layer
- Defines HTTP endpoints
- Applies middleware (auth, validation)
- Mounts controllers

## Authentication Flow

```
┌────────┐                    ┌────────┐
│ Client │                    │  API   │
└───┬────┘                    └───┬────┘
    │                             │
    │ 1. POST /auth/register      │
    │────────────────────────────▶│
    │                             │ Create User
    │                             │ Hash Password
    │                             │ Generate JWT
    │                             │
    │ 2. Access + Refresh Tokens  │
    │◀────────────────────────────│
    │                             │
    │ 3. Store Tokens             │
    │                             │
    │ 4. GET /videos/feed         │
    │    Header: Bearer {token}   │
    │────────────────────────────▶│
    │                             │ Verify JWT
    │                             │ Attach user to req
    │                             │
    │ 5. Video Feed Data          │
    │◀────────────────────────────│
    │                             │
    │ 6. Token Expired            │
    │────────────────────────────▶│
    │◀─────── 401 Unauthorized ───│
    │                             │
    │ 7. POST /auth/refresh       │
    │    Body: {refreshToken}     │
    │────────────────────────────▶│
    │                             │ Verify Refresh Token
    │                             │ Generate New Tokens
    │                             │
    │ 8. New Access + Refresh     │
    │◀────────────────────────────│
    │                             │
```

## Caching Strategy

### What Gets Cached
- ✅ Video feed (public, non-personalized)
- ✅ Video details
- ✅ Channel profiles
- ✅ User profiles
- ✅ Shorts feed

### Cache Invalidation
- Video uploaded → Invalidate feed caches
- Video updated → Invalidate video cache
- Channel updated → Invalidate channel cache
- User subscribes → Invalidate channel cache

### Cache Keys Pattern
```
feed:{type}:{page}:{limit}
video:{videoId}
channel:{channelId}
user:profile:{userId}
shorts:feed:{page}:{limit}
```

### TTL (Time To Live)
```
Feed: 2 minutes
Video: 5 minutes
Channel: 10 minutes
User: 5 minutes
```

## Scaling Considerations

### Horizontal Scaling
- **Stateless Backend**: No session state in memory
- **Redis for Sessions**: Centralized session storage
- **Load Balancer**: Distribute requests across instances
- **CDN for Static Assets**: Serve HLS segments via CDN

### Vertical Scaling
- **Database Connection Pooling**: Prisma handles this
- **Redis Memory**: Increase maxmemory as needed
- **Worker Threads**: For CPU-intensive tasks

### Database Optimization
- **Indexes**: On frequently queried fields
- **Pagination**: Cursor-based for large datasets
- **Read Replicas**: For read-heavy operations
- **Denormalization**: Stats stored on models

## Security Measures

### Authentication
- JWT with short expiry (7 days access, 30 days refresh)
- Bcrypt with 12 rounds
- Refresh token rotation

### Authorization
- Middleware checks token validity
- Owner checks for update/delete operations
- Resource-based permissions

### Input Validation
- Express-validator on all endpoints
- Type validation via TypeScript
- Sanitization of user inputs

### API Security
- CORS configured for frontend origin
- Rate limiting (implement in nginx/load balancer)
- SQL injection prevention (Prisma ORM)
- XSS protection (input sanitization)

## Error Handling

### Error Types
```typescript
class AppError extends Error {
  statusCode: number;
  isOperational: boolean;
}
```

### Error Flow
```
Controller throws AppError
         ↓
Error Middleware catches
         ↓
Log error (Winston)
         ↓
Return formatted response
```

### Production vs Development
- **Development**: Full stack trace
- **Production**: Generic error messages

## Performance Optimizations

1. **Database**
   - Indexes on foreign keys
   - Composite indexes for complex queries
   - Connection pooling

2. **Caching**
   - Redis for frequently accessed data
   - Cache invalidation on mutations
   - TTL-based expiry

3. **API**
   - Pagination for large result sets
   - Lazy loading of relations
   - Denormalized stats (views, likes)

4. **Streaming**
   - HLS for adaptive bitrate
   - CDN for segment delivery
   - Chunked transfer encoding

## Monitoring & Logging

### What Gets Logged
- All HTTP requests (dev mode)
- Errors (all environments)
- Database queries (dev mode)
- Cache hits/misses (dev mode)

### Log Levels
```
- error: Application errors
- warn: Operational warnings
- info: General information
- debug: Detailed debug info
```

### Production Monitoring
- Application logs → Winston → File/Cloud
- Database metrics → Prisma metrics
- Redis metrics → redis-cli info
- System metrics → OS monitoring

---

**This architecture supports:**
- ✅ Millions of videos
- ✅ Thousands of concurrent users
- ✅ Real-time analytics
- ✅ Horizontal scaling
- ✅ High availability
- ✅ CDN integration
- ✅ ML recommendations
