import { Redis } from 'ioredis';
import { logger } from './logger.js';
import { upsertVideoStats, syncVideoCacheCounters, shutdownDb } from './db.js';

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: false
});

redis.on('connect', () => {
  logger.info('Redis connected for event streaming');
});

redis.on('error', (err: Error) => {
  logger.error('Redis error:', err);
});

/**
 * Counter aggregation in memory before flushing to DB
 * Reduces DB load for high-frequency counters (views, likes)
 */
export class CounterAggregator {
  private counters: Map<string, number> = new Map();
  private flushInterval: NodeJS.Timeout;

  constructor(
    private flushIntervalMs: number = parseInt(process.env.COUNTER_FLUSH_INTERVAL || '30000')
  ) {
    this.flushInterval = setInterval(() => this.flush(), this.flushIntervalMs);
    logger.info(`Counter aggregator initialized with ${this.flushIntervalMs}ms flush interval`);
  }

  async increment(key: string, amount: number = 1): Promise<void> {
    const current = this.counters.get(key) || 0;
    this.counters.set(key, current + amount);

    // Also increment in Redis for distributed counting
    await redis.hincrby('counters:aggregated', key, amount);
  }

  async get(key: string): Promise<number> {
    return this.counters.get(key) || 0;
  }

  async flush(): Promise<void> {
    if (this.counters.size === 0) {
      return;
    }

    logger.info(`Flushing ${this.counters.size} counters to storage`);
    
    try {
      const batch = Array.from(this.counters.entries());
      
      // Store in Redis for persistence
      const pipeline = redis.pipeline();
      for (const [key, value] of batch) {
        pipeline.hincrby('counters:persistent', key, value);
      }
      await pipeline.exec();

      // ---- DB write path: persist aggregated deltas to VideoStats ----
      const videoDeltas = new Map<string, { views: number; likes: number; dislikes: number; comments: number }>();
      for (const [key, value] of batch) {
        const parts = key.split(':');
        // keys look like  video:<id>:views | video:<id>:likes | video:<id>:dislikes | video:<id>:comments
        if (parts[0] === 'video' && parts.length >= 3) {
          const videoId = parts[1];
          const stat = parts[2]; // views | likes | dislikes | comments
          if (!videoDeltas.has(videoId)) {
            videoDeltas.set(videoId, { views: 0, likes: 0, dislikes: 0, comments: 0 });
          }
          const d = videoDeltas.get(videoId)!;
          if (stat === 'views') d.views += value;
          else if (stat === 'likes') d.likes += value;
          else if (stat === 'dislikes') d.dislikes += value;
          else if (stat === 'comments') d.comments += value;
        }
      }

      // Batch-upsert into VideoStats + sync Video cache columns
      const dbWrites: Promise<void>[] = [];
      for (const [videoId, d] of videoDeltas) {
        dbWrites.push(
          upsertVideoStats(videoId, {
            viewCount: d.views,
            likeCount: d.likes,
            dislikeCount: d.dislikes,
            commentCount: d.comments,
          }),
        );
        if (d.views || d.likes) {
          dbWrites.push(syncVideoCacheCounters(videoId, d.views, d.likes));
        }
      }
      await Promise.allSettled(dbWrites);

      logger.info(`Flushed ${batch.length} counters successfully (Redis + DB)`);
      
      // Clear local counters after flush
      this.counters.clear();
    } catch (error) {
      logger.error('Failed to flush counters:', error);
    }
  }

  async shutdown(): Promise<void> {
    clearInterval(this.flushInterval);
    await this.flush();
    await shutdownDb();
    await redis.quit();
    logger.info('Counter aggregator shutdown complete');
  }
}

export const counterAggregator = new CounterAggregator();

// Cache for hot data
export async function cacheSet(key: string, value: any, ttl: number = 3600): Promise<void> {
  await redis.setex(key, ttl, JSON.stringify(value));
}

export async function cacheGet(key: string): Promise<any | null> {
  const value = await redis.get(key);
  return value ? JSON.parse(value) : null;
}

export async function cacheDel(key: string): Promise<void> {
  await redis.del(key);
}

// Real-time counter updates (views, likes) - kept in Redis
export async function incrementCounter(key: string, amount: number = 1): Promise<number> {
  return await redis.incrby(key, amount);
}

export async function getCounter(key: string): Promise<number> {
  const value = await redis.get(key);
  return value ? parseInt(value) : 0;
}

export { redis };
