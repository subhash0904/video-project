/**
 * Two-Stage Recommendation Engine
 *
 * Mirrors YouTube's architecture (Diagram 3):
 *   Stage 1 — Candidate Generation: millions → hundreds
 *     Uses user history (watch, likes, subs) to pull a coarse candidate set.
 *
 *   Stage 2 — Ranking: hundreds → dozens
 *     Scores each candidate with a richer feature set (engagement signals,
 *     freshness, channel affinity, category affinity, diversity) to produce
 *     the final ordered list.
 *
 * Feedback Loop (Diagram 4):
 *   Search / Like / Watch → Content → Recommendation → back to User.
 *   Every signal is consumed here to adjust scores.
 */

import { prisma, cache } from '../config/db.js';
import { redis } from '../config/db.js';
import logger from '../utils/logger.js';

// ---------- types ----------

interface VideoCandidate {
  id: string;
  title: string;
  thumbnailUrl: string | null;
  duration: number;
  type: string;
  category: string | null;
  publishedAt: Date | null;
  channelId: string;
  stats: {
    viewCount: bigint;
    likeCount: bigint;
  } | null;
  channel: {
    id: string;
    name: string;
    handle: string;
    avatarUrl: string | null;
    verified: boolean;
  };
}

interface ScoredCandidate extends VideoCandidate {
  score: number;
  reason: string;
}

interface UserSignals {
  watchedVideoIds: string[];
  likedVideoIds: string[];
  subscribedChannelIds: string[];
  watchedCategories: Map<string, number>;
  recentSearchTerms: string[];
}

const toNum = (v: bigint | number): number => typeof v === 'bigint' ? Number(v) : v;

/** Flatten Prisma video result into the shape the frontend expects. */
function normalizeVideo(v: any) {
  return {
    id: v.id,
    title: v.title,
    description: v.description ?? '',
    thumbnailUrl: v.thumbnailUrl,
    duration: v.duration,
    views: toNum(v.stats?.viewCount ?? v.viewsCache ?? 0),
    likes: toNum(v.stats?.likeCount ?? v.likesCache ?? 0),
    dislikes: toNum(v.stats?.dislikeCount ?? 0),
    commentCount: toNum(v.stats?.commentCount ?? 0),
    hlsUrl: v.hlsUrl ?? null,
    type: v.type,
    category: v.category,
    status: v.status,
    publishedAt: v.publishedAt instanceof Date ? v.publishedAt.toISOString() : (v.publishedAt ?? new Date().toISOString()),
    channel: v.channel,
  };
}

const VIDEO_SELECT = {
  id: true,
  title: true,
  thumbnailUrl: true,
  hlsUrl: true,
  duration: true,
  type: true,
  category: true,
  publishedAt: true,
  channelId: true,
  stats: {
    select: {
      viewCount: true,
      likeCount: true,
    },
  },
  channel: {
    select: {
      id: true,
      name: true,
      handle: true,
      avatarUrl: true,
      verified: true,
    },
  },
} as const;

// ============================================
// Stage 0 — Gather User Signals
// ============================================

async function gatherUserSignals(userId: string): Promise<UserSignals> {
  const [watchHistory, likes, subscriptions, analytics] = await Promise.all([
    prisma.watchHistory.findMany({
      where: { userId },
      take: 100,
      orderBy: { watchedAt: 'desc' },
      select: { videoId: true, video: { select: { category: true } } },
    }),
    prisma.like.findMany({
      where: { userId, type: 'LIKE' },
      take: 50,
      orderBy: { createdAt: 'desc' },
      select: { videoId: true },
    }),
    prisma.subscription.findMany({
      where: { userId },
      select: { channelId: true },
    }),
    prisma.analyticsEvent.findMany({
      where: { userId, eventType: 'SEARCH' },
      take: 10,
      orderBy: { timestamp: 'desc' },
      select: { metadata: true },
    }),
  ]);

  const watchedCategories = new Map<string, number>();
  for (const w of watchHistory) {
    const cat = (w as any).video?.category;
    if (cat) watchedCategories.set(cat, (watchedCategories.get(cat) || 0) + 1);
  }

  return {
    watchedVideoIds: watchHistory.map((w) => w.videoId),
    likedVideoIds: likes.map((l) => l.videoId),
    subscribedChannelIds: subscriptions.map((s) => s.channelId),
    watchedCategories,
    recentSearchTerms: analytics
      .map((a) => (a.metadata as any)?.query as string)
      .filter(Boolean),
  };
}

// ============================================
// Stage 1 — Candidate Generation
// ============================================

/** Pull ~200 diverse candidates from multiple sources. */
async function generateCandidates(
  signals: UserSignals,
  excludeIds: string[],
  targetCount = 200,
): Promise<VideoCandidate[]> {
  const baseWhere = {
    id: { notIn: excludeIds },
    status: 'READY' as const,
    isPublic: true,
    publishedAt: { not: null },
  };

  // Source 1 — Subscription feed (freshest from subs)
  const subVideosP =
    signals.subscribedChannelIds.length > 0
      ? prisma.video.findMany({
          where: { ...baseWhere, channelId: { in: signals.subscribedChannelIds } },
          take: Math.ceil(targetCount * 0.3),
          orderBy: { publishedAt: 'desc' },
          select: VIDEO_SELECT,
        })
      : Promise.resolve([]);

  // Source 2 — Category affinities (videos in categories the user watches)
  const topCategories = [...signals.watchedCategories.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([cat]) => cat);

  const categoryVideosP =
    topCategories.length > 0
      ? prisma.video.findMany({
          where: { ...baseWhere, category: { in: topCategories as any } },
          take: Math.ceil(targetCount * 0.3),
          orderBy: [{ viewsCache: 'desc' }, { publishedAt: 'desc' }],
          select: VIDEO_SELECT,
        })
      : Promise.resolve([]);

  // Source 3 — Trending (high recent engagement)
  const trendingP = prisma.video.findMany({
    where: {
      ...baseWhere,
      publishedAt: { gte: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) },
    },
    take: Math.ceil(targetCount * 0.2),
    orderBy: { viewsCache: 'desc' },
    select: VIDEO_SELECT,
  });

  // Source 4 — Exploration / serendipity (random recent videos)
  const explorationP = prisma.video.findMany({
    where: {
      ...baseWhere,
      publishedAt: { gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) },
    },
    take: Math.ceil(targetCount * 0.2),
    orderBy: { publishedAt: 'desc' },
    select: VIDEO_SELECT,
  });

  const [subVideos, categoryVideos, trending, exploration] = await Promise.all([
    subVideosP,
    categoryVideosP,
    trendingP,
    explorationP,
  ]);

  // Deduplicate
  const seen = new Set<string>();
  const candidates: VideoCandidate[] = [];

  for (const v of [...subVideos, ...categoryVideos, ...trending, ...exploration]) {
    if (!seen.has(v.id)) {
      seen.add(v.id);
      candidates.push(v as unknown as VideoCandidate);
    }
  }

  return candidates.slice(0, targetCount);
}

// ============================================
// Stage 2 — Ranking
// ============================================

/** Score each candidate using a multi-signal ranking function. */
function rankCandidates(
  candidates: VideoCandidate[],
  signals: UserSignals,
): ScoredCandidate[] {
  const now = Date.now();

  return candidates
    .map((v) => {
      let score = 0;
      let reason = 'recommended';

      // --- Engagement signal (log-scaled views + likes) ---
      const views = v.stats ? toNum(v.stats.viewCount) : 0;
      const likes = v.stats ? toNum(v.stats.likeCount) : 0;
      const engagement = Math.log10(Math.max(1, views)) + Math.log10(Math.max(1, likes)) * 2;
      score += engagement * 0.25;

      // --- Freshness boost (exponential decay, half-life 2 days) ---
      const ageHours = v.publishedAt
        ? (now - new Date(v.publishedAt).getTime()) / (1000 * 60 * 60)
        : 999;
      const freshness = Math.exp(-0.014 * ageHours); // ~50% at 48h
      score += freshness * 4;

      // --- Subscription affinity ---
      if (signals.subscribedChannelIds.includes(v.channelId)) {
        score += 6;
        reason = 'from subscription';
      }

      // --- Category affinity ---
      const catCount = v.category ? signals.watchedCategories.get(v.category) || 0 : 0;
      if (catCount > 0) {
        score += Math.min(3, Math.log2(catCount + 1));
        if (reason === 'recommended') reason = 'matches your interests';
      }

      // --- Like ratio proxy ---
      if (views > 0) {
        const likeRatio = likes / views;
        score += likeRatio * 5;
      }

      // --- Verified channel small boost ---
      if (v.channel.verified) {
        score += 0.5;
      }

      // --- Trending boost (from Redis sorted set) ---
      // This is done asynchronously below if available

      return { ...v, score, reason } as ScoredCandidate;
    })
    .sort((a, b) => b.score - a.score);
}

/** Apply trending boosts from the stats service's Redis sorted set. */
async function applyTrendingBoosts(scored: ScoredCandidate[]): Promise<ScoredCandidate[]> {
  try {
    const ids = scored.map((s) => s.id);
    // Batch-fetch trending scores
    const pipeline = redis.pipeline();
    for (const id of ids) {
      pipeline.zscore('stats:trending', id);
    }
    const results = await pipeline.exec();

    if (results) {
      for (let i = 0; i < results.length; i++) {
        const [err, trendScore] = results[i] as [Error | null, string | null];
        if (!err && trendScore) {
          scored[i].score += Math.log10(parseFloat(trendScore) + 1) * 2;
          if (parseFloat(trendScore) > 50) {
            scored[i].reason = 'trending';
          }
        }
      }
    }

    // Re-sort after trending boosts
    scored.sort((a, b) => b.score - a.score);
  } catch {
    // Redis unavailable — continue with existing scores
  }

  return scored;
}

// ============================================
// Diversity Injection
// ============================================

/** Re-order to inject category diversity (avoid 5 gaming videos in a row). */
function diversify(scored: ScoredCandidate[], windowSize = 3): ScoredCandidate[] {
  const result: ScoredCandidate[] = [];
  const remaining = [...scored];

  while (remaining.length > 0) {
    // Look at category of last `windowSize` items in result
    const recentCategories = result.slice(-windowSize).map((r) => r.category);

    // Find first candidate whose category isn't in recent window
    const diverseIdx = remaining.findIndex(
      (c) => !recentCategories.includes(c.category),
    );

    if (diverseIdx >= 0) {
      result.push(remaining.splice(diverseIdx, 1)[0]);
    } else {
      // All remaining are same category — just take first
      result.push(remaining.shift()!);
    }
  }

  return result;
}

// ============================================
// Public API
// ============================================

export class RecommendationEngine {
  /**
   * Full two-stage pipeline: signals → candidates → ranking → diversity.
   * Returns `limit` recommendations for the given user.
   */
  async getRecommendations(
    userId: string,
    page = 1,
    limit = 20,
  ): Promise<{ videos: ScoredCandidate[]; total: number }> {
    const cacheKey = `rec:engine:${userId}:${page}:${limit}`;
    const cached = await cache.get<{ videos: ScoredCandidate[]; total: number }>(cacheKey);
    if (cached) return cached;

    // Stage 0 — Gather signals
    const signals = await gatherUserSignals(userId);

    // Stage 1 — Candidate generation
    const candidates = await generateCandidates(
      signals,
      signals.watchedVideoIds, // exclude already-watched
      200,
    );

    // Stage 2 — Ranking
    let scored = rankCandidates(candidates, signals);
    scored = await applyTrendingBoosts(scored);

    // Diversity pass
    scored = diversify(scored);

    // Pagination
    const start = (page - 1) * limit;
    const pageResults = scored.slice(start, start + limit);

    const result = { videos: pageResults, total: scored.length };
    await cache.set(cacheKey, result, 120); // cache 2 min
    return result;
  }

  /** "Continue Watching" — partially watched videos. */
  async getContinueWatching(userId: string, limit = 10): Promise<VideoCandidate[]> {
    const cacheKey = `rec:continue:${userId}`;
    const cached = await cache.get<VideoCandidate[]>(cacheKey);
    if (cached) return cached;

    const history = await prisma.watchHistory.findMany({
      where: { userId, completed: false, lastPosition: { gt: 10 } },
      take: limit,
      orderBy: { watchedAt: 'desc' },
      select: {
        video: { select: VIDEO_SELECT },
        lastPosition: true,
      },
    });

    const videos = history.map((h) => h.video as unknown as VideoCandidate);
    await cache.set(cacheKey, videos, 120);
    return videos;
  }

  /** Trending feed (powered by stats service sorted set). */
  async getTrending(limit = 30): Promise<VideoCandidate[]> {
    const cacheKey = `rec:trending:${limit}`;
    const cached = await cache.get<VideoCandidate[]>(cacheKey);
    if (cached) return cached;

    try {
      const ids = await redis.zrevrange('stats:trending', 0, limit - 1);
      if (ids.length > 0) {
        const videos = await prisma.video.findMany({
          where: { id: { in: ids }, status: 'READY', isPublic: true, isDeleted: false },
          select: VIDEO_SELECT,
        });
        // Preserve trending order
        const idMap = new Map(videos.map((v) => [v.id, v]));
        const ordered = ids.map((id: string) => idMap.get(id)).filter(Boolean) as unknown as VideoCandidate[];
        await cache.set(cacheKey, ordered, 60);
        return ordered;
      }
    } catch {
      // Redis unavailable
    }

    // Fallback: DB-based trending
    const videos = await prisma.video.findMany({
      where: {
        status: 'READY',
        isPublic: true,
        isDeleted: false,
        publishedAt: {
          gte: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
          not: null,
        },
      },
      take: limit,
      orderBy: { viewsCache: 'desc' },
      select: VIDEO_SELECT,
    });

    await cache.set(cacheKey, videos, 60);
    return videos as unknown as VideoCandidate[];
  }

  /** "From Your Subscriptions" section. */
  async getSubscriptionVideos(userId: string, limit = 20): Promise<VideoCandidate[]> {
    const subs = await prisma.subscription.findMany({
      where: { userId },
      select: { channelId: true },
    });

    if (subs.length === 0) return [];

    const videos = await prisma.video.findMany({
      where: {
        channelId: { in: subs.map((s) => s.channelId) },
        status: 'READY',
        isPublic: true,
        publishedAt: { not: null },
      },
      take: limit,
      orderBy: { publishedAt: 'desc' },
      select: VIDEO_SELECT,
    });

    return videos as unknown as VideoCandidate[];
  }
}

export const recommendationEngine = new RecommendationEngine();
export { normalizeVideo };
