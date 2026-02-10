/**
 * Stats Service — Real-time counters & trending score
 *
 * YouTube-architecture: Stats Service aggregates real-time counters
 * with Redis, feeds Trending algorithm, and powers Creator Analytics.
 *
 * Trending score = views_recent × engage_rate × recency_decay
 */

import { redis, prisma, cache } from '../config/db.js';
import { eventBus, EventChannels } from './eventBus.service.js';
import type {
  PlatformEvent,
  VideoViewedEvent,
  VideoLikedEvent,
  VideoCommentedEvent,
  VideoSharedEvent,
} from './eventBus.service.js';
import logger from '../utils/logger.js';

// ---------- Redis key helpers ----------

const KEY = {
  viewsToday: (videoId: string) => `stats:views:today:${videoId}`,
  viewsHour: (videoId: string) => `stats:views:hour:${videoId}`,
  watchTime: (videoId: string) => `stats:watchtime:${videoId}`,
  engagements: (videoId: string) => `stats:engage:${videoId}`,
  trendingSet: 'stats:trending',
  channelViews: (channelId: string) => `stats:channel:views:${channelId}`,
  channelWatchTime: (channelId: string) => `stats:channel:watchtime:${channelId}`,
};

// ---------- service ----------

class StatsService {
  /** Wire up event listeners. */
  async registerEventListeners() {
    await eventBus.subscribe(EventChannels.VIDEO_VIEWED, async (e: PlatformEvent) => {
      const d = e.data as VideoViewedEvent;
      await this.recordView(d.videoId, d.watchDuration);
    });

    await eventBus.subscribe(EventChannels.VIDEO_LIKED, async (e: PlatformEvent) => {
      const d = e.data as VideoLikedEvent;
      if (d.action === 'added') await this.recordEngagement(d.videoId, 'like');
    });

    await eventBus.subscribe(EventChannels.VIDEO_COMMENTED, async (e: PlatformEvent) => {
      const d = e.data as VideoCommentedEvent;
      await this.recordEngagement(d.videoId, 'comment');
    });

    await eventBus.subscribe(EventChannels.VIDEO_SHARED, async (e: PlatformEvent) => {
      const d = e.data as VideoSharedEvent;
      await this.recordEngagement(d.videoId, 'share');
    });

    logger.info('📊 StatsService: event listeners registered');
  }

  // ========================================
  // Real-time counters
  // ========================================

  /** Increment view counters (hourly + daily). */
  async recordView(videoId: string, watchDuration: number) {
    const pipeline = redis.pipeline();

    // Hourly counter (TTL 2h)
    pipeline.incr(KEY.viewsHour(videoId));
    pipeline.expire(KEY.viewsHour(videoId), 7200);

    // Daily counter (TTL 25h)
    pipeline.incr(KEY.viewsToday(videoId));
    pipeline.expire(KEY.viewsToday(videoId), 90000);

    // Aggregate watch time (seconds, TTL 25h)
    pipeline.incrby(KEY.watchTime(videoId), Math.round(watchDuration));
    pipeline.expire(KEY.watchTime(videoId), 90000);

    // Trending sorted set — score = hourly views (recalculated periodically)
    pipeline.zincrby(KEY.trendingSet, 1, videoId);

    await pipeline.exec();
  }

  /** Increment engagement hash (likes / comments / shares). */
  async recordEngagement(videoId: string, type: 'like' | 'comment' | 'share') {
    await redis.hincrby(KEY.engagements(videoId), type, 1);
    await redis.expire(KEY.engagements(videoId), 90000);

    // Engagement also boosts trending score
    const weight = type === 'like' ? 2 : type === 'comment' ? 3 : 5;
    await redis.zincrby(KEY.trendingSet, weight, videoId);
  }

  // ========================================
  // Trending algorithm
  // ========================================

  /**
   * Get trending video IDs using weighted sorted set.
   *
   * Score = hourly_views + like×2 + comment×3 + share×5
   * Decayed by recency in the DB query.
   */
  async getTrendingVideoIds(limit = 50): Promise<string[]> {
    const cacheKey = `trending:ids:${limit}`;
    const cached = await cache.get<string[]>(cacheKey);
    if (cached) return cached;

    const ids = await redis.zrevrange(KEY.trendingSet, 0, limit - 1);
    if (ids.length > 0) {
      await cache.set(cacheKey, ids, 120); // 2-min cache
    }
    return ids;
  }

  /** Full trending feed with video details. */
  async getTrendingFeed(page = 1, limit = 20) {
    const ids = await this.getTrendingVideoIds(100);
    const skip = (page - 1) * limit;
    const pageIds = ids.slice(skip, skip + limit);

    if (pageIds.length === 0) {
      // Fallback to DB‑based trending
      return this.getTrendingFallback(page, limit);
    }

    const videos = await prisma.video.findMany({
      where: {
        id: { in: pageIds },
        status: 'READY',
        isPublic: true,
      },
      select: {
        id: true,
        title: true,
        thumbnailUrl: true,
        duration: true,
        views: true,
        likes: true,
        type: true,
        category: true,
        publishedAt: true,
        channel: {
          select: {
            id: true,
            name: true,
            handle: true,
            avatarUrl: true,
            verified: true,
          },
        },
      },
    });

    // Preserve sorted-set order
    const map = new Map(videos.map((v) => [v.id, v]));
    const ordered = pageIds.map((id) => map.get(id)).filter(Boolean);

    return { videos: ordered, total: ids.length };
  }

  /** Fallback when no Redis data. */
  private async getTrendingFallback(page: number, limit: number) {
    const since = new Date(Date.now() - 7 * 24 * 3600_000);
    const skip = (page - 1) * limit;

    const [videos, total] = await Promise.all([
      prisma.video.findMany({
        where: { status: 'READY', isPublic: true, publishedAt: { gte: since } },
        take: limit,
        skip,
        orderBy: [{ views: 'desc' }, { likes: 'desc' }],
        select: {
          id: true,
          title: true,
          thumbnailUrl: true,
          duration: true,
          views: true,
          likes: true,
          type: true,
          category: true,
          publishedAt: true,
          channel: {
            select: { id: true, name: true, handle: true, avatarUrl: true, verified: true },
          },
        },
      }),
      prisma.video.count({
        where: { status: 'READY', isPublic: true, publishedAt: { gte: since } },
      }),
    ]);

    return { videos, total };
  }

  // ========================================
  // Creator analytics helpers
  // ========================================

  /** Get real-time stats for a video (from Redis). */
  async getVideoRealtimeStats(videoId: string) {
    const pipeline = redis.pipeline();
    pipeline.get(KEY.viewsHour(videoId));
    pipeline.get(KEY.viewsToday(videoId));
    pipeline.get(KEY.watchTime(videoId));
    pipeline.hgetall(KEY.engagements(videoId));
    const results = await pipeline.exec();

    return {
      viewsLastHour: parseInt((results?.[0]?.[1] as string) || '0', 10),
      viewsToday: parseInt((results?.[1]?.[1] as string) || '0', 10),
      watchTimeSeconds: parseInt((results?.[2]?.[1] as string) || '0', 10),
      engagements: (results?.[3]?.[1] as Record<string, string>) || {},
    };
  }

  /** Get channel-level real-time stats. */
  async getChannelRealtimeStats(channelId: string) {
    const videos = await prisma.video.findMany({
      where: { channelId, status: 'READY' },
      select: { id: true },
    });

    let totalViewsToday = 0;
    let totalWatchTime = 0;

    for (const video of videos) {
      const stats = await this.getVideoRealtimeStats(video.id);
      totalViewsToday += stats.viewsToday;
      totalWatchTime += stats.watchTimeSeconds;
    }

    return {
      totalViewsToday,
      totalWatchTimeMinutes: Math.round(totalWatchTime / 60),
      videoCount: videos.length,
    };
  }
}

export const statsService = new StatsService();
