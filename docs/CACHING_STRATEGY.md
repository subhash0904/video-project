# Multi-Layer Caching Strategy

## Overview

This document describes the comprehensive caching strategy for the video platform, optimized for YouTube-scale performance.

## Cache Layers

```
┌─────────────────────────────────────────┐
│     Browser Cache (Client-Side)         │
│  - Video chunks (IndexedDB)             │
│  - Thumbnails (Cache API)               │
│  - Static assets                        │
│  - TTL: 7 days                          │
└─────────────────────────────────────────┘
              ↓ Cache Miss
┌─────────────────────────────────────────┐
│         CDN Edge Cache                   │
│  - Video segments (HLS/DASH)            │
│  - Images, thumbnails                    │
│  - Static assets                        │
│  - TTL: 30 days                         │
│  - Distributed globally                  │
└─────────────────────────────────────────┘
              ↓ Cache Miss
┌─────────────────────────────────────────┐
│       Application Cache (Redis)          │
│  - Video metadata (hot videos)          │
│  - User sessions                        │
│  - Feed data                            │
│  - Search results                       │
│  - TTL: 5 minutes - 1 hour              │
└─────────────────────────────────────────┘
              ↓ Cache Miss
┌─────────────────────────────────────────┐
│      In-Memory Cache (Node.js)           │
│  - Hot counters (views, likes)          │
│  - Rate limit buckets                   │
│  - Active sessions                      │
│  - TTL: 30 seconds - 5 minutes          │
└─────────────────────────────────────────┘
              ↓ Cache Miss
┌─────────────────────────────────────────┐
│          Database Layer                  │
│  - PostgreSQL (persistent data)         │
│  - Read replicas for queries            │
│  - Write primary for updates            │
└─────────────────────────────────────────┘
```

## 1. Browser Cache (Client-Side)

### Video Chunks
```typescript
// Service Worker caching strategy
const CACHE_NAME = 'video-segments-v1';

self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('.m3u8') || event.request.url.includes('.ts')) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((response) => {
          return response || fetch(event.request).then((networkResponse) => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });
        });
      })
    );
  }
});
```

### Cache Strategy
- **Video segments**: Cache with IndexedDB for offline access
- **Thumbnails**: HTTP Cache-Control headers (7 days)
- **Static assets**: Long-term caching with versioned URLs

### Headers
```
Cache-Control: public, max-age=604800, immutable
```

## 2. CDN Edge Cache

### CloudFlare / Fastly Configuration

```nginx
# Video segments (HLS/DASH)
location ~ \.(m3u8|ts|mp4)$ {
    proxy_pass http://origin;
    proxy_cache video_cache;
    proxy_cache_valid 200 30d;
    proxy_cache_key "$scheme$request_method$host$request_uri";
    add_header X-Cache-Status $upstream_cache_status;
    add_header Cache-Control "public, max-age=2592000";
}

# Images and thumbnails
location ~ \.(jpg|jpeg|png|webp)$ {
    proxy_pass http://origin;
    proxy_cache image_cache;
    proxy_cache_valid 200 7d;
    add_header Cache-Control "public, max-age=604800";
}
```

### Benefits
- **Reduced latency**: Content served from nearest edge server
- **Reduced origin load**: 90%+ cache hit rate
- **Global distribution**: Automatic geo-routing

## 3. Application Cache (Redis)

### Redis Configuration

```typescript
import Redis from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: 6379,
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: false
});

// Cache helper functions
export const cache = {
  async get<T>(key: string): Promise<T | null> {
    const value = await redis.get(key);
    return value ? JSON.parse(value) : null;
  },

  async set(key: string, value: any, ttl: number = 3600): Promise<void> {
    await redis.setex(key, ttl, JSON.stringify(value));
  },

  async del(key: string): Promise<void> {
    await redis.del(key);
  },

  async mget(keys: string[]): Promise<any[]> {
    const values = await redis.mget(...keys);
    return values.map(v => v ? JSON.parse(v) : null);
  }
};
```

### What to Cache

#### Video Metadata (Hot Videos)
```typescript
// Cache video details for trending videos
async function getVideo(videoId: string) {
  const cacheKey = `video:${videoId}`;
  
  // Try cache first
  let video = await cache.get(cacheKey);
  
  if (!video) {
    // Fetch from database
    video = await db.video.findUnique({ where: { id: videoId } });
    
    // Cache for 1 hour
    await cache.set(cacheKey, video, 3600);
  }
  
  return video;
}
```

#### Feed Data
```typescript
// Cache home feed
async function getHomeFeed(userId: string, page: number = 1) {
  const cacheKey = `feed:home:${userId}:${page}`;
  
  let feed = await cache.get(cacheKey);
  
  if (!feed) {
    feed = await generateHomeFeed(userId, page);
    await cache.set(cacheKey, feed, 300); // 5 minutes
  }
  
  return feed;
}
```

#### Search Results
```typescript
// Cache search results
async function search(query: string, page: number = 1) {
  const cacheKey = `search:${query}:${page}`;
  
  let results = await cache.get(cacheKey);
  
  if (!results) {
    results = await performSearch(query, page);
    await cache.set(cacheKey, results, 600); // 10 minutes
  }
  
  return results;
}
```

#### User Sessions
```typescript
// Session storage
async function saveSession(sessionId: string, userId: string) {
  await redis.setex(`session:${sessionId}`, 86400, userId); // 24 hours
}

async function getSession(sessionId: string): Promise<string | null> {
  return await redis.get(`session:${sessionId}`);
}
```

#### View Counters (Real-time)
```typescript
// Increment view count (fast)
async function incrementViewCount(videoId: string) {
  await redis.incr(`video:${videoId}:views`);
}

// Get current view count
async function getViewCount(videoId: string): Promise<number> {
  const count = await redis.get(`video:${videoId}:views`);
  return count ? parseInt(count) : 0;
}
```

### Cache Invalidation

```typescript
// Invalidate video cache when updated
async function updateVideo(videoId: string, data: any) {
  await db.video.update({
    where: { id: videoId },
    data
  });
  
  // Invalidate caches
  await cache.del(`video:${videoId}`);
  await cache.del(`video:${videoId}:related`);
  
  // Invalidate CDN cache (via API)
  await invalidateCDN(`/videos/${videoId}/*`);
}
```

## 4. In-Memory Cache (Node.js)

### Hot Counters

```typescript
// In-memory counter aggregation
class CounterCache {
  private counters: Map<string, number> = new Map();
  private flushInterval: NodeJS.Timeout;

  constructor(flushIntervalMs: number = 30000) {
    this.flushInterval = setInterval(() => this.flush(), flushIntervalMs);
  }

  increment(key: string, amount: number = 1) {
    const current = this.counters.get(key) || 0;
    this.counters.set(key, current + amount);
  }

  get(key: string): number {
    return this.counters.get(key) || 0;
  }

  async flush() {
    if (this.counters.size === 0) return;

    // Flush to Redis
    const pipeline = redis.pipeline();
    for (const [key, value] of this.counters.entries()) {
      pipeline.incrby(key, value);
    }
    await pipeline.exec();

    this.counters.clear();
  }
}

export const counterCache = new CounterCache();
```

### LRU Cache for Hot Data

```typescript
import LRU from 'lru-cache';

// Cache for frequently accessed data
const lruCache = new LRU<string, any>({
  max: 10000, // Maximum 10K items
  ttl: 1000 * 60 * 5, // 5 minutes
  updateAgeOnGet: true
});

// Usage
function getCachedVideo(videoId: string) {
  return lruCache.get(`video:${videoId}`);
}

function setCachedVideo(videoId: string, video: any) {
  lruCache.set(`video:${videoId}`, video);
}
```

## 5. Database Query Caching

### Read Replicas

```typescript
// Separate read and write connections
const dbWrite = new PrismaClient({
  datasources: {
    db: { url: process.env.DATABASE_URL } // Primary
  }
});

const dbRead = new PrismaClient({
  datasources: {
    db: { url: process.env.DATABASE_READ_URL } // Replica
  }
});

// Use read replica for queries
async function getVideos() {
  return await dbRead.video.findMany();
}

// Use primary for writes
async function createVideo(data: any) {
  return await dbWrite.video.create({ data });
}
```

### Query Result Caching

```typescript
// Cache expensive queries
async function getTrendingVideos() {
  const cacheKey = 'trending:videos';
  
  let videos = await cache.get(cacheKey);
  
  if (!videos) {
    videos = await dbRead.$queryRaw`
      SELECT * FROM videos
      WHERE created_at > NOW() - INTERVAL '7 days'
      ORDER BY views DESC, likes DESC
      LIMIT 50
    `;
    
    await cache.set(cacheKey, videos, 300); // 5 minutes
  }
  
  return videos;
}
```

## Cache Warming

### Pre-populate Hot Data

```typescript
// Warm up cache on startup
async function warmUpCache() {
  // Cache trending videos
  const trending = await getTrendingVideos();
  await cache.set('trending:videos', trending, 300);
  
  // Cache popular channels
  const channels = await getPopularChannels();
  await cache.set('popular:channels', channels, 600);
  
  // Cache category metadata
  const categories = await getCategories();
  await cache.set('categories', categories, 3600);
}

// Run on app start
warmUpCache();
```

## Monitoring

### Cache Hit Rates

```typescript
// Track cache performance
class CacheMonitor {
  private hits = 0;
  private misses = 0;

  hit() { this.hits++; }
  miss() { this.misses++; }

  getHitRate() {
    const total = this.hits + this.misses;
    return total === 0 ? 0 : (this.hits / total) * 100;
  }

  reset() {
    this.hits = 0;
    this.misses = 0;
  }
}

export const cacheMonitor = new CacheMonitor();
```

### Metrics

```typescript
// Expose cache metrics
app.get('/metrics/cache', (req, res) => {
  res.json({
    hitRate: cacheMonitor.getHitRate(),
    redis: {
      connected: redis.status === 'ready',
      memory: await redis.info('memory')
    }
  });
});
```

## Best Practices

### 1. Cache Key Naming Convention
```
{resource}:{id}:{attribute}
video:123:metadata
video:123:comments
user:456:profile
feed:456:home:1
```

### 2. TTL Strategy
- **Hot data**: 5-15 minutes
- **Metadata**: 1 hour
- **Static content**: 24 hours
- **Rarely changing**: 7 days

### 3. Cache Stampede Prevention
```typescript
// Use locks to prevent cache stampede
async function getCachedWithLock(key: string, fetchFn: () => Promise<any>) {
  const lockKey = `lock:${key}`;
  
  // Try to acquire lock
  const acquired = await redis.set(lockKey, '1', 'EX', 10, 'NX');
  
  if (acquired) {
    try {
      const data = await fetchFn();
      await cache.set(key, data, 3600);
      return data;
    } finally {
      await redis.del(lockKey);
    }
  } else {
    // Wait and retry
    await new Promise(resolve => setTimeout(resolve, 100));
    return await cache.get(key) || await getCachedWithLock(key, fetchFn);
  }
}
```

### 4. Graceful Degradation
```typescript
// If cache fails, continue with DB
async function getVideoWithFallback(videoId: string) {
  try {
    const cached = await cache.get(`video:${videoId}`);
    if (cached) return cached;
  } catch (error) {
    logger.warn('Cache error, falling back to DB', error);
  }
  
  return await db.video.findUnique({ where: { id: videoId } });
}
```

## Performance Impact

### Without Caching
- Database queries: 50-200ms
- API response: 200-500ms
- Load: 10K requests/sec = direct DB hits

### With Multi-Layer Caching
- Cache hit: 1-10ms
- CDN hit: 10-50ms
- Database load: Reduced by 90-95%
- Scalability: 100K+ requests/sec

## Summary

| Layer | Use Case | TTL | Hit Rate Target |
|-------|----------|-----|------------------|
| Browser | Video chunks, static assets | 7 days | 80%+ |
| CDN | Video streams, images | 30 days | 95%+ |
| Redis | Metadata, sessions, feeds | 5min-1hr | 85%+ |
| In-Memory | Hot counters, rate limits | 30sec-5min | 90%+ |
| Database | Source of truth | N/A | Last resort |

This multi-layer approach ensures:
- ⚡ **Low latency** (< 50ms for cached content)
- 🔧 **High scalability** (millions of concurrent users)
- 💰 **Cost efficiency** (reduced infrastructure)
- 🛡️ **Fault tolerance** (graceful degradation)
