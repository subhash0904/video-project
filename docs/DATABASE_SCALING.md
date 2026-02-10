# Database Scaling Strategy

## Overview

This document outlines the database scaling strategy for handling YouTube-scale traffic, including sharding, read/write splitting, and replication.

## Architecture

```
                    ┌─────────────────────┐
                    │   Application       │
                    │   (API Gateway)     │
                    └─────────┬───────────┘
                              │
                ┌─────────────┴─────────────┐
                │                           │
         WRITES │                           │ READS
                │                           │
    ┌───────────▼────────────┐   ┌─────────▼────────────┐
    │   Primary Database     │   │  Read Replicas (3+)  │
    │   (Master - Writes)    │───│  (Slaves - Reads)    │
    │   PostgreSQL Primary   │   │  Load Balanced       │
    └────────────────────────┘   └──────────────────────┘
                │
                │ Replication
                │
    ┌───────────▼─────────────────────────────────────┐
    │                                                  │
    │       Sharded by Entity Type                    │
    │                                                  │
    ├──────────────┬──────────────┬──────────────────┤
    │   Shard 1    │   Shard 2    │    Shard 3       │
    │   (Users)    │   (Videos)   │   (Analytics)    │
    └──────────────┴──────────────┴──────────────────┘
```

## 1. Read/Write Splitting

### Configuration

```typescript
// database.ts
import { PrismaClient } from '@prisma/client';

// Primary database (for writes)
export const dbWrite = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL_PRIMARY
    }
  },
  log: ['error', 'warn']
});

// Read replica pool
export const dbRead1 = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL_REPLICA_1
    }
  }
});

export const dbRead2 = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL_REPLICA_2
    }
  }
});

export const dbRead3 = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL_REPLICA_3
    }
  }
});

// Read replica load balancer
const readReplicas = [dbRead1, dbRead2, dbRead3];
let currentReplicaIndex = 0;

export function getReadClient(): PrismaClient {
  const client = readReplicas[currentReplicaIndex];
  currentReplicaIndex = (currentReplicaIndex + 1) % readReplicas.length;
  return client;
}

export function getWriteClient(): PrismaClient {
  return dbWrite;
}
```

### Usage

```typescript
// Service layer
class VideoService {
  // Read operations use replicas
  async getVideo(id: string) {
    const db = getReadClient();
    return await db.video.findUnique({
      where: { id }
    });
  }

  async getVideos(limit: number = 20) {
    const db = getReadClient();
    return await db.video.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' }
    });
  }

  // Write operations use primary
  async createVideo(data: any) {
    const db = getWriteClient();
    return await db.video.create({
      data
    });
  }

  async updateVideo(id: string, data: any) {
    const db = getWriteClient();
    return await db.video.update({
      where: { id },
      data
    });
  }

  async deleteVideo(id: string) {
    const db = getWriteClient();
    return await db.video.delete({
      where: { id }
    });
  }
}
```

## 2. Database Sharding

### Sharding Strategy

#### Horizontal Sharding by Entity Type

Different entity types go to different database instances:

```
Shard 1 (Users):
- users
- channels
- subscriptions
- sessions

Shard 2 (Videos):
- videos
- comments
- likes
- video_metadata

Shard 3 (Analytics):
- analytics_events
- view_history
- watch_history
- trending_data
```

#### Implementation

```typescript
// shard-router.ts
export enum ShardId {
  USERS = 'users',
  VIDEOS = 'videos',
  ANALYTICS = 'analytics'
}

const shardConnections = {
  [ShardId.USERS]: new PrismaClient({
    datasources: {
      db: { url: process.env.DATABASE_URL_SHARD_USERS }
    }
  }),
  [ShardId.VIDEOS]: new PrismaClient({
    datasources: {
      db: { url: process.env.DATABASE_URL_SHARD_VIDEOS }
    }
  }),
  [ShardId.ANALYTICS]: new PrismaClient({
    datasources: {
      db: { url: process.env.DATABASE_URL_SHARD_ANALYTICS }
    }
  })
};

export function getShardClient(shardId: ShardId): PrismaClient {
  return shardConnections[shardId];
}

// Usage
const userDb = getShardClient(ShardId.USERS);
const videoDb = getShardClient(ShardId.VIDEOS);
const analyticsDb = getShardClient(ShardId.ANALYTICS);
```

### Hash-Based Sharding (for massive scale)

For entities that grow massively (e.g., videos), use hash-based sharding:

```typescript
// Hash-based sharding for videos
function getVideoShard(videoId: string): number {
  // Use consistent hashing
  const hash = hashCode(videoId);
  const shardCount = 10; // 10 video shards
  return Math.abs(hash % shardCount);
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash;
}

// Get correct shard for video
async function getVideo(videoId: string) {
  const shardId = getVideoShard(videoId);
  const db = getVideoShardClient(shardId);
  return await db.video.findUnique({
    where: { id: videoId }
  });
}
```

## 3. Connection Pooling

### Configuration

```typescript
// Optimize connection pool
export const dbWrite = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL_PRIMARY
    }
  },
  // Connection pool settings
  // PostgreSQL max_connections should be set higher on server
  log: ['query', 'error', 'warn'],
  errorFormat: 'minimal'
});

// Set pool size in connection URL
// postgresql://user:pass@host:5432/db?connection_limit=20
```

### Pool Manager

```typescript
class DatabasePoolManager {
  private pools: Map<string, PrismaClient> = new Map();
  private maxPoolSize = 20;

  getPool(url: string): PrismaClient {
    if (!this.pools.has(url)) {
      const client = new PrismaClient({
        datasources: {
          db: {
            url: `${url}?connection_limit=${this.maxPoolSize}`
          }
        }
      });
      this.pools.set(url, client);
    }
    return this.pools.get(url)!;
  }

  async closeAll() {
    for (const client of this.pools.values()) {
      await client.$disconnect();
    }
    this.pools.clear();
  }
}

export const poolManager = new DatabasePoolManager();
```

## 4. Counter Sharding (Hot Rows)

### Problem

High-frequency updates to counters (views, likes) cause row-level locks and contention.

### Solution: Counter Sharding

```sql
-- Instead of single counter
CREATE TABLE video_stats (
  video_id UUID PRIMARY KEY,
  views BIGINT DEFAULT 0,
  likes BIGINT DEFAULT 0
);

-- Use sharded counters
CREATE TABLE video_stats_sharded (
  video_id UUID,
  shard_id INTEGER,  -- 0-99 (100 shards)
  views BIGINT DEFAULT 0,
  likes BIGINT DEFAULT 0,
  PRIMARY KEY (video_id, shard_id)
);

-- Index for aggregation
CREATE INDEX idx_video_stats_video_id ON video_stats_sharded(video_id);
```

### Implementation

```typescript
// Increment with sharding
async function incrementViewCount(videoId: string) {
  // Pick random shard (0-99)
  const shardId = Math.floor(Math.random() * 100);
  
  await db.$executeRaw`
    INSERT INTO video_stats_sharded (video_id, shard_id, views)
    VALUES (${videoId}, ${shardId}, 1)
    ON CONFLICT (video_id, shard_id)
    DO UPDATE SET views = video_stats_sharded.views + 1
  `;
}

// Get total count (aggregate shards)
async function getViewCount(videoId: string): Promise<number> {
  const result = await db.$queryRaw<[{ total: bigint }]>`
    SELECT SUM(views) as total
    FROM video_stats_sharded
    WHERE video_id = ${videoId}
  `;
  
  return Number(result[0]?.total || 0);
}

// Periodic consolidation (background job)
async function consolidateCounters() {
  await db.$executeRaw`
    INSERT INTO video_stats (video_id, views, likes)
    SELECT 
      video_id,
      SUM(views) as views,
      SUM(likes) as likes
    FROM video_stats_sharded
    GROUP BY video_id
    ON CONFLICT (video_id)
    DO UPDATE SET
      views = EXCLUDED.views,
      likes = EXCLUDED.likes
  `;
  
  // Clear sharded table after consolidation
  await db.$executeRaw`TRUNCATE video_stats_sharded`;
}
```

## 5. Partitioning

### Time-Based Partitioning (Analytics)

```sql
-- Partition analytics by month
CREATE TABLE analytics_events (
  id UUID PRIMARY KEY,
  user_id UUID,
  video_id UUID,
  event_type VARCHAR(50),
  created_at TIMESTAMP NOT NULL
) PARTITION BY RANGE (created_at);

-- Create partitions
CREATE TABLE analytics_events_2026_02 PARTITION OF analytics_events
  FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');

CREATE TABLE analytics_events_2026_03 PARTITION OF analytics_events
  FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');

-- Auto-create new partitions (pg_partman extension)
-- Or use cron job to create monthly
```

### Benefits

- Faster queries (scan only relevant partitions)
- Easy archival (drop old partitions)
- Improved maintenance (vacuum, reindex per partition)

## 6. Replication Setup

### PostgreSQL Streaming Replication

#### Primary Configuration

```ini
# postgresql.conf (primary)
wal_level = replica
max_wal_senders = 10
wal_keep_size = 64MB
synchronous_commit = off  # For better write performance
```

#### Replica Configuration

```ini
# postgresql.conf (replica)
hot_standby = on
max_standby_streaming_delay = 30s
wal_receiver_status_interval = 10s
```

#### Connection String

```env
# .env
DATABASE_URL_PRIMARY=postgresql://user:pass@primary:5432/video_platform
DATABASE_URL_REPLICA_1=postgresql://user:pass@replica1:5432/video_platform
DATABASE_URL_REPLICA_2=postgresql://user:pass@replica2:5432/video_platform
DATABASE_URL_REPLICA_3=postgresql://user:pass@replica3:5432/video_platform
```

## 7. Query Optimization

### Indexes

```sql
-- Essential indexes
CREATE INDEX idx_videos_user_id ON videos(user_id);
CREATE INDEX idx_videos_created_at ON videos(created_at DESC);
CREATE INDEX idx_videos_views ON videos(views DESC);
CREATE INDEX idx_comments_video_id ON comments(video_id);
CREATE INDEX idx_likes_user_video ON likes(user_id, video_id);

-- Composite indexes for common queries
CREATE INDEX idx_videos_status_created ON videos(status, created_at DESC);
CREATE INDEX idx_videos_category_views ON videos(category, views DESC);

-- Full-text search
CREATE INDEX idx_videos_title_search ON videos USING gin(to_tsvector('english', title));
CREATE INDEX idx_videos_description_search ON videos USING gin(to_tsvector('english', description));
```

### Query Patterns

```typescript
// Use select to fetch only needed fields
async function getVideos() {
  return await db.video.findMany({
    select: {
      id: true,
      title: true,
      thumbnail: true,
      views: true,
      createdAt: true
    }
  });
}

// Use cursor-based pagination for large datasets
async function getVideosPaginated(cursor?: string, limit: number = 20) {
  return await db.video.findMany({
    take: limit,
    skip: cursor ? 1 : 0,
    cursor: cursor ? { id: cursor } : undefined,
    orderBy: { createdAt: 'desc' }
  });
}

// Use aggregations efficiently
async function getChannelStats(channelId: string) {
  return await db.video.aggregate({
    where: { channelId },
    _count: { id: true },
    _sum: { views: true, likes: true }
  });
}
```

## 8. Monitoring & Maintenance

### Metrics to Track

```typescript
// Database health check
async function checkDatabaseHealth() {
  const checks = await Promise.all([
    // Connection test
    dbWrite.$queryRaw`SELECT 1`,
    
    // Replication lag
    dbRead1.$queryRaw`
      SELECT EXTRACT(EPOCH FROM (now() - pg_last_xact_replay_timestamp())) AS lag_seconds
    `,
    
    // Connection count
    dbWrite.$queryRaw`
      SELECT count(*) FROM pg_stat_activity
    `,
    
    // Cache hit rate
    dbWrite.$queryRaw`
      SELECT 
        sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)) AS cache_hit_ratio
      FROM pg_statio_user_tables
    `
  ]);

  return {
    primary: 'healthy',
    replicationLag: checks[1][0].lag_seconds,
    connections: checks[2][0].count,
    cacheHitRatio: checks[3][0].cache_hit_ratio
  };
}
```

### Vacuum and Maintenance

```sql
-- Auto-vacuum configuration
ALTER TABLE videos SET (autovacuum_vacuum_scale_factor = 0.05);
ALTER TABLE comments SET (autovacuum_vacuum_scale_factor = 0.05);

-- Manual vacuum (scheduled during low traffic)
VACUUM ANALYZE videos;
REINDEX TABLE videos;
```

## Environment Variables

```env
# Primary (writes)
DATABASE_URL_PRIMARY=postgresql://video_user:password@db-primary:5432/video_platform?connection_limit=50

# Read replicas
DATABASE_URL_REPLICA_1=postgresql://video_user:password@db-replica-1:5432/video_platform?connection_limit=100
DATABASE_URL_REPLICA_2=postgresql://video_user:password@db-replica-2:5432/video_platform?connection_limit=100
DATABASE_URL_REPLICA_3=postgresql://video_user:password@db-replica-3:5432/video_platform?connection_limit=100

# Shards
DATABASE_URL_SHARD_USERS=postgresql://video_user:password@db-shard-users:5432/video_platform_users
DATABASE_URL_SHARD_VIDEOS=postgresql://video_user:password@db-shard-videos:5432/video_platform_videos
DATABASE_URL_SHARD_ANALYTICS=postgresql://video_user:password@db-shard-analytics:5432/video_platform_analytics
```

## Performance Metrics

### Before Optimization
- Queries: 50-200ms average
- Peak load: 5K QPS
- Database CPU: 80-95%
- Write bottleneck: Yes

### After Optimization
- Queries: 5-20ms average (cached), 20-50ms (DB)
- Peak load: 50K+ QPS
- Database CPU: 20-40%
- Write bottleneck: Eliminated

## Migration Strategy

### Step 1: Add Read Replicas
1. Set up streaming replication
2. Update application to use read replicas for queries
3. Monitor replication lag

### Step 2: Implement Sharding
1. Create separate databases for each shard
2. Migrate data by entity type
3. Update application routing logic

### Step 3: Implement Counter Sharding
1. Create sharded counter tables
2. Migrate existing counters
3. Set up consolidation jobs

### Step 4: Add Partitioning
1. Create partitioned tables
2. Migrate existing data
3. Set up auto-partition creation

## Summary

| Strategy | Purpose | Impact |
|----------|---------|--------|
| Read/Write Split | Distribute load | 5-10x read capacity |
| Sharding | Horizontal scaling | Unlimited scaling |
| Counter Sharding | Eliminate hot rows | 100x write capacity for counters |
| Partitioning | Query optimization | 10-50x faster queries |
| Connection Pooling | Resource efficiency | 3-5x better resource usage |
| Replication | High availability | 99.99% uptime |

This comprehensive strategy enables the platform to scale to YouTube levels while maintaining performance and reliability.
