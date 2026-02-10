import { prisma, cache } from '../../config/db.js';
import config from '../../config/env.js';

// ============================================
// Get Personalized Recommendations  
// ============================================

export const getPersonalizedRecommendations = async (
  userId: string,
  page: number = 1,
  limit: number = 20
) => {
  const skip = (page - 1) * limit;

  // Try to get from ML service if available
  try {
    const mlResponse = await fetch(
      `${config.mlServiceUrl}/recommendations?userId=${userId}&limit=${limit}`,
      { timeout: 2000 } as any
    );

    if (mlResponse.ok) {
      const data = await mlResponse.json();
      if (data.videoIds && data.videoIds.length > 0) {
        // Get video details
        const videos = await prisma.video.findMany({
          where: {
            id: { in: data.videoIds },
            status: 'READY',
            isPublic: true,
          },
          select: {
            id: true,
            title: true,
            thumbnailUrl: true,
            duration: true,
            viewsCache: true,
            likesCache: true,
            type: true,
            category: true,
            publishedAt: true,
            stats: { select: { viewCount: true, likeCount: true } },
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

        return videos;
      }
    }
  } catch (error) {
    console.log('ML service unavailable, using fallback recommendations');
  }

  // Fallback: Simple collaborative filtering
  return await getFallbackRecommendations(userId, skip, limit);
};

// ============================================
// Fallback Recommendations (when ML service is unavailable)
// ============================================

async function getFallbackRecommendations(
  userId: string,
  skip: number,
  limit: number
) {
  // Get user's watch history and subscriptions
  const [watchHistory, subscriptions] = await Promise.all([
    prisma.watchHistory.findMany({
      where: { userId },
      take: 20,
      orderBy: { watchedAt: 'desc' },
      select: { videoId: true },
    }),
    prisma.subscription.findMany({
      where: { userId },
      select: { channelId: true },
    }),
  ]);

  const watchedVideoIds = watchHistory.map((w: any) => w.videoId);
  const subscribedChannelIds = subscriptions.map((s: any) => s.channelId);

  // Get videos from subscribed channels + similar videos
  const recommendations = await prisma.video.findMany({
    where: {
      id: { notIn: watchedVideoIds },
      status: 'READY',
      isPublic: true,
      publishedAt: { not: null },
      OR: [
        // Videos from subscribed channels
        { channelId: { in: subscribedChannelIds } },
        // Trending videos (high engagement)
        {
          publishedAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
          },
          viewsCache: { gte: 1000 },
        },
      ],
    },
    take: limit,
    skip,
    orderBy: [
      { viewsCache: 'desc' },
      { publishedAt: 'desc' },
    ],
    select: {
      id: true,
      title: true,
      thumbnailUrl: true,
      duration: true,
      viewsCache: true,
      likesCache: true,
      type: true,
      category: true,
      publishedAt: true,
      stats: { select: { viewCount: true, likeCount: true } },
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

  return recommendations;
}

// ============================================
// Get Subscription Feed
// ============================================

export const getSubscriptionFeed = async (
  userId: string,
  page: number = 1,
  limit: number = 20
) => {
  const skip = (page - 1) * limit;

  // Get subscribed channels
  const subscriptions = await prisma.subscription.findMany({
    where: { userId },
    select: { channelId: true },
  });

  const channelIds = subscriptions.map((s: any) => s.channelId);

  if (channelIds.length === 0) {
    return { videos: [], total: 0 };
  }

  // Get latest videos from subscribed channels
  const [videos, total] = await Promise.all([
    prisma.video.findMany({
      where: {
        channelId: { in: channelIds },
        status: 'READY',
        isPublic: true,
        publishedAt: { not: null },
      },
      take: limit,
      skip,
      orderBy: { publishedAt: 'desc' },
      select: {
        id: true,
        title: true,
        thumbnailUrl: true,
        duration: true,
        viewsCache: true,
        likesCache: true,
        type: true,
        category: true,
        publishedAt: true,
        stats: { select: { viewCount: true, likeCount: true } },
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
    }),
    prisma.video.count({
      where: {
        channelId: { in: channelIds },
        status: 'READY',
        isPublic: true,
        publishedAt: { not: null },
      },
    }),
  ]);

  return { videos, total };
};

// ============================================
// Get Shorts Feed (Short-form videos)
// ============================================

export const getShortsFeed = async (
  userId: string | undefined,
  page: number = 1,
  limit: number = 20,
  category?: string
) => {
  const skip = (page - 1) * limit;

  const cacheKey = `shorts:feed:${category || 'all'}:${page}:${limit}`;

  // Try cache for non-authenticated users
  if (!userId) {
    const cached = await cache.get(cacheKey);
    if (cached) return cached;
  }

  const whereClause: any = {
    type: 'SHORT',
    status: 'READY',
    isPublic: true,
    publishedAt: { not: null },
  };

  if (category) {
    whereClause.category = category;
  }

  const shorts = await prisma.video.findMany({
    where: whereClause,
    take: limit,
    skip,
    orderBy: [
      { viewsCache: 'desc' },
      { publishedAt: 'desc' },
    ],
    select: {
      id: true,
      title: true,
      thumbnailUrl: true,
      duration: true,
      viewsCache: true,
      likesCache: true,
      category: true,
      publishedAt: true,
      hlsUrl: true,
      stats: { select: { viewCount: true, likeCount: true } },
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

  // Cache for 2 minutes if not authenticated
  if (!userId) {
    await cache.set(cacheKey, shorts, 120);
  }

  return shorts;
};
