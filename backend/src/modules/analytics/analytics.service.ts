import { prisma } from '../../config/db.js';
import { EventType } from '@prisma/client';
import { emitVideoShared } from '../events/event.producer.js';

// ============================================
// Track Analytics Event
// ============================================

interface TrackEventData {
  userId?: string;
  videoId?: string;
  eventType: EventType;
  metadata?: any;
  sessionId?: string;
  userAgent?: string;
  ipAddress?: string;
  country?: string;
  device?: string;
}

export const trackEvent = async (data: TrackEventData) => {
  // Store event asynchronously (fire and forget)
  prisma.analyticsEvent
    .create({
      data: {
        userId: data.userId,
        videoId: data.videoId,
        eventType: data.eventType,
        metadata: data.metadata || {},
        sessionId: data.sessionId,
        userAgent: data.userAgent,
        ipAddress: data.ipAddress,
        country: data.country,
        device: data.device,
      },
    })
    .catch((err: unknown) => console.error('Failed to track event:', err));

  return { success: true };
};

// ============================================
// Track Video View (with watch time)
// ============================================

interface TrackViewData {
  userId?: string;
  videoId: string;
  watchDuration: number;
  completed: boolean;
  lastPosition: number;
  sessionId?: string;
  userAgent?: string;
  ipAddress?: string;
}

export const trackView = async (data: TrackViewData) => {
  try {
    // Create watch history entry
    if (data.userId) {
      await prisma.watchHistory.create({
        data: {
          userId: data.userId,
          videoId: data.videoId,
          watchDuration: data.watchDuration || 0,
          completed: data.completed || false,
          lastPosition: data.lastPosition || 0,
        },
      });
    }

    // Track analytics event
    await trackEvent({
      userId: data.userId,
      videoId: data.videoId,
      eventType: 'VIDEO_VIEW',
      metadata: {
        watchDuration: data.watchDuration,
        completed: data.completed,
        lastPosition: data.lastPosition,
      },
      sessionId: data.sessionId,
      userAgent: data.userAgent,
      ipAddress: data.ipAddress,
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to track view:', error);
    return { success: false };
  }
};

// ============================================
// Track Like/Dislike
// ============================================

export const trackLike = async (
  userId: string,
  videoId: string,
  type: 'LIKE' | 'DISLIKE'
) => {
  await trackEvent({
    userId,
    videoId,
    eventType: type === 'LIKE' ? 'VIDEO_LIKE' : 'VIDEO_DISLIKE',
  });

  return { success: true };
};

// ============================================
// Track Video Share
// ============================================

export const trackShare = async (
  userId: string | undefined,
  videoId: string,
  platform?: string
) => {
  // 1. Create analytics event
  await trackEvent({
    userId,
    videoId,
    eventType: 'VIDEO_SHARE',
    metadata: { platform },
  });

  // 2. Create Share record in the shares table
  await prisma.share.create({
    data: {
      userId: userId ?? null,
      videoId,
      platform: platform ?? null,
    },
  }).catch(() => {}); // non-fatal

  // 3. Increment VideoStats.shareCount
  await prisma.videoStats.upsert({
    where: { videoId },
    create: { videoId, shareCount: 1 },
    update: { shareCount: { increment: 1 } },
  }).catch(() => {}); // non-fatal

  // 4. Emit event for stats/trending pipeline
  emitVideoShared({ videoId, userId, platform }).catch(() => {});

  return { success: true };
};

// ============================================
// Track Search
// ============================================

export const trackSearch = async (
  userId: string | undefined,
  query: string,
  resultsCount: number
) => {
  await trackEvent({
    userId,
    eventType: 'SEARCH',
    metadata: {
      query,
      resultsCount,
    },
  });

  return { success: true };
};

// ============================================
// Get Video Analytics (for creators)
// ============================================

export const getVideoAnalytics = async (videoId: string, channelId: string) => {
  // Verify video belongs to channel
  const video = await prisma.video.findUnique({
    where: { id: videoId },
    select: { channelId: true },
  });

  if (!video || video.channelId !== channelId) {
    throw new Error('Unauthorized or video not found');
  }

  // Get analytics data
  const [
    viewsOverTime,
    totalEngagement,
    demographicsData,
  ] = await Promise.all([
    // Views over last 30 days
    prisma.$queryRaw`
      SELECT 
        DATE(timestamp) as date,
        COUNT(*) as views
      FROM analytics_events
      WHERE video_id = ${videoId}
        AND event_type = 'VIDEO_VIEW'
        AND timestamp >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(timestamp)
      ORDER BY date DESC
    `,
    // Total engagement
    prisma.analyticsEvent.groupBy({
      by: ['eventType'],
      where: {
        videoId,
        eventType: {
          in: ['VIDEO_VIEW', 'VIDEO_LIKE', 'VIDEO_DISLIKE', 'VIDEO_SHARE'],
        },
      },
      _count: true,
    }),
    // Device breakdown
    prisma.analyticsEvent.groupBy({
      by: ['device'],
      where: {
        videoId,
        eventType: 'VIDEO_VIEW',
        device: { not: null },
      },
      _count: true,
    }),
  ]);

  return {
    viewsOverTime,
    totalEngagement,
    demographicsData,
  };
};

// ============================================
// Get Trending Videos
// ============================================

export const getTrendingVideos = async (limit: number = 20) => {
  // Get videos with high engagement in last 7 days
  const since = new Date();
  since.setDate(since.getDate() - 7);

  const trending = await prisma.video.findMany({
    where: {
      status: 'READY',
      isPublic: true,
      publishedAt: {
        gte: since,
      },
    },
    take: limit,
    orderBy: [
      { viewsCache: 'desc' },
      { likesCache: 'desc' },
    ],
    select: {
      id: true,
      title: true,
      thumbnailUrl: true,
      duration: true,
      viewsCache: true,
      likesCache: true,
      type: true,
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

  return trending;
};
