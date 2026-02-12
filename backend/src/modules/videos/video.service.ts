import { prisma, cache } from '../../config/db.js';
import type { VideoCategory } from '@prisma/client';
import { AppError } from '../../middleware/errorHandler.js';
import { emitVideoViewed } from '../events/event.producer.js';

// ============================================
// Get Video Feed (Home Page)
// ============================================

export const getVideoFeed = async (
  userId: string | undefined,
  page: number,
  limit: number,
  type?: 'STANDARD' | 'SHORT',
  category?: VideoCategory
) => {
  const skip = (page - 1) * limit;

  // Build cache key
  const cacheKey = `feed:${type || 'all'}:${category || 'all'}:${page}:${limit}`;

  // Try cache first (for non-authenticated requests)
  if (!userId) {
    const cached = await cache.get(cacheKey);
    if (cached) return cached;
  }

  const whereClause: any = {
    status: 'READY',
    isPublic: true,
    isDeleted: false,
    publishedAt: { not: null },
  };

  if (type) {
    whereClause.type = type;
  }

  if (category) {
    whereClause.category = category;
  }

  const [videos, total] = await Promise.all([
    prisma.video.findMany({
      where: whereClause,
      take: limit,
      skip,
      orderBy: [
        { publishedAt: 'desc' },
        { viewsCache: 'desc' },
      ],
      select: {
        id: true,
        title: true,
        description: true,
        thumbnailUrl: true,
        hlsUrl: true,
        duration: true,
        viewsCache: true,
        likesCache: true,
        type: true,
        category: true,
        publishedAt: true,
        stats: {
          select: {
            viewCount: true,
            likeCount: true,
            dislikeCount: true,
            commentCount: true,
          },
        },
        channel: {
          select: {
            id: true,
            name: true,
            handle: true,
            avatarUrl: true,
            verified: true,
            subscriberCount: true,
          },
        },
      },
    }),
    prisma.video.count({ where: whereClause }),
  ]);

  const result = { videos, total };

  // Cache for 2 minutes if not authenticated
  if (!userId) {
    await cache.set(cacheKey, result, 120);
  }

  return result;
};

// ============================================
// Get Video By ID
// ============================================

export const getVideoById = async (videoId: string, userId?: string) => {
  const cacheKey = `video:${videoId}`;
  const cached = await cache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const video = await prisma.video.findUnique({
    where: { id: videoId },
    include: {
      channel: {
        select: {
          id: true,
          name: true,
          handle: true,
          description: true,
          avatarUrl: true,
          bannerUrl: true,
          verified: true,
          subscriberCount: true,
        },
      },
      qualities: {
        select: {
          id: true,
          quality: true,
          resolution: true,
          bitrate: true,
          fps: true,
          fileUrl: true,
        },
        orderBy: { bitrate: 'desc' },
      },
    },
  });

  if (!video) {
    throw new AppError('Video not found', 404);
  }

  // Visibility enforcement (server-side, Rule 13)
  if (!video.isPublic) {
    // Private video — only accessible by the channel owner
    const isOwner = userId
      ? await prisma.channel.findFirst({
          where: { id: video.channelId, userId },
          select: { id: true },
        })
      : null;
    if (!isOwner) {
      throw new AppError('Video not available', 404);
    }
  }

  // Emit view event — counters updated by async worker only (Rule 6)
  // DO NOT increment counters directly here
  if (userId) {
    emitVideoViewed({
      videoId,
      userId,
      watchDuration: 0,
      completed: false,
    }).catch((err: unknown) => console.error('Failed to emit view event:', err));
  }

  // Add watch history if user is authenticated
  if (userId) {
    prisma.watchHistory
      .create({
        data: {
          userId,
          videoId,
          watchDuration: 0,
        },
      })
      .catch((err: unknown) => console.error('Failed to create watch history:', err));
  }

  // Cache for 5 minutes
  await cache.set(cacheKey, video, 300);

  return video;
};

// ============================================
// Upload Video (Metadata Only)
// ============================================

interface UploadVideoData {
  channelId: string;
  title: string;
  description?: string;
  thumbnailUrl: string;
  duration: number;
  type?: 'STANDARD' | 'SHORT';
  category?: VideoCategory;
  isPublic?: boolean;
  allowComments?: boolean;
  ageRestricted?: boolean;
}

export const uploadVideo = async (data: UploadVideoData) => {
  const video = await prisma.video.create({
    data: {
      ...data,
      status: 'PROCESSING',
      type: data.type || 'STANDARD',
      isPublic: data.isPublic !== undefined ? data.isPublic : true,
      allowComments: data.allowComments !== undefined ? data.allowComments : true,
      ageRestricted: data.ageRestricted !== undefined ? data.ageRestricted : false,
    },
    include: {
      channel: {
        select: {
          id: true,
          name: true,
          handle: true,
          avatarUrl: true,
        },
      },
    },
  });

  // Channel videoCount will be updated by async worker via video:uploaded event (Rule 6)
  // DO NOT increment channel.videoCount directly

  // Invalidate caches
  await cache.delPattern('feed:*');
  await cache.delPattern(`channel:${data.channelId}:*`);

  return video;
};

// ============================================
// Update Video
// ============================================

interface UpdateVideoData {
  title?: string;
  description?: string;
  thumbnailUrl?: string;
  isPublic?: boolean;
  allowComments?: boolean;
  ageRestricted?: boolean;
  category?: VideoCategory;
  categoryIds?: string[]; // many-to-many Category links
}

export const updateVideo = async (
  videoId: string,
  channelId: string,
  data: UpdateVideoData
) => {
  // Verify ownership
  const video = await prisma.video.findUnique({
    where: { id: videoId },
    select: { channelId: true },
  });

  if (!video) {
    throw new AppError('Video not found', 404);
  }

  if (video.channelId !== channelId) {
    throw new AppError('Unauthorized to update this video', 403);
  }

  // Extract categoryIds before passing to prisma.video.update
  const { categoryIds, ...videoData } = data;

  // Update video
  const updated = await prisma.video.update({
    where: { id: videoId },
    data: videoData,
    include: {
      channel: {
        select: {
          id: true,
          name: true,
          handle: true,
          avatarUrl: true,
        },
      },
    },
  });

  // Sync many-to-many Category links if categoryIds provided
  if (categoryIds && Array.isArray(categoryIds)) {
    // Delete existing links then re-create
    await (prisma as any).videoCategoryLink.deleteMany({ where: { videoId } });
    if (categoryIds.length > 0) {
      await (prisma as any).videoCategoryLink.createMany({
        data: categoryIds.map((categoryId: string) => ({ videoId, categoryId })),
        skipDuplicates: true,
      });
    }
  }

  // Invalidate cache
  await cache.del(`video:${videoId}`);
  await cache.delPattern('feed:*');

  return updated;
};

// ============================================
// Delete Video
// ============================================

export const deleteVideo = async (videoId: string, channelId: string) => {
  // Verify ownership
  const video = await prisma.video.findUnique({
    where: { id: videoId },
    select: { channelId: true },
  });

  if (!video) {
    throw new AppError('Video not found', 404);
  }

  if (video.channelId !== channelId) {
    throw new AppError('Unauthorized to delete this video', 403);
  }

  // Soft delete by updating status
  await prisma.video.update({
    where: { id: videoId },
    data: { status: 'DELETED' },
  });

  // Channel videoCount will be updated by async worker (Rule 6)
  // DO NOT decrement channel.videoCount directly

  // Invalidate cache
  await cache.del(`video:${videoId}`);
  await cache.delPattern('feed:*');
  await cache.delPattern(`channel:${channelId}:*`);

  return { message: 'Video deleted successfully' };
};

// ============================================
// Like/Unlike Video
// ============================================

export const toggleLike = async (
  userId: string,
  videoId: string,
  type: 'LIKE' | 'DISLIKE'
) => {
  // Check if video exists
  const video = await prisma.video.findUnique({
    where: { id: videoId },
    select: { id: true },
  });

  if (!video) {
    throw new AppError('Video not found', 404);
  }

  // Check existing like
  const existingLike = await prisma.like.findUnique({
    where: {
      userId_videoId: {
        userId,
        videoId,
      },
    },
  });

  if (existingLike) {
    if (existingLike.type === type) {
      // Remove like if same type — counter updated by async worker (Rule 6)
      await prisma.like.delete({
        where: { id: existingLike.id },
      });

      await cache.del(`video:${videoId}`);
      return { action: 'removed', type };
    } else {
      // Change like type — counter updated by async worker (Rule 6)
      await prisma.like.update({
        where: { id: existingLike.id },
        data: { type },
      });

      await cache.del(`video:${videoId}`);
      return { action: 'changed', type };
    }
  } else {
    // Create new like — counter updated by async worker (Rule 6)
    await prisma.like.create({
      data: {
        userId,
        videoId,
        type,
      },
    });

    await cache.del(`video:${videoId}`);
    return { action: 'added', type };
  }
};

// ============================================
// Get Like Status
// ============================================

export const getLikeStatus = async (userId: string, videoId: string) => {
  const like = await prisma.like.findUnique({
    where: {
      userId_videoId: {
        userId,
        videoId,
      },
    },
  });

  return {
    isLiked: like?.type === 'LIKE',
    isDisliked: like?.type === 'DISLIKE',
    type: like?.type || null,
  };
};

// ============================================
// Search Videos
// ============================================

export const searchVideos = async (
  query: string,
  page: number,
  limit: number,
  filters?: {
    type?: 'STANDARD' | 'SHORT';
    duration?: 'short' | 'medium' | 'long';
    uploadDate?: 'hour' | 'today' | 'week' | 'month' | 'year';
    sortBy?: 'relevance' | 'date' | 'views' | 'rating';
    category?: VideoCategory;
  }
) => {
  const skip = (page - 1) * limit;

  const whereClause: any = {
    status: 'READY',
    isPublic: true,
    isDeleted: false,
    publishedAt: { not: null },
    OR: [
      {
        title: {
          contains: query,
          mode: 'insensitive',
        },
      },
      {
        description: {
          contains: query,
          mode: 'insensitive',
        },
      },
      {
        channel: {
          name: {
            contains: query,
            mode: 'insensitive',
          },
        },
      },
      {
        channel: {
          handle: {
            contains: query,
            mode: 'insensitive',
          },
        },
      },
    ],
  };

  // Apply filters
  if (filters?.type) {
    whereClause.type = filters.type;
  }

  if (filters?.duration) {
    const durationMap = {
      short: { lt: 240 }, // < 4 minutes
      medium: { gte: 240, lt: 1200 }, // 4-20 minutes
      long: { gte: 1200 }, // > 20 minutes
    };
    whereClause.duration = durationMap[filters.duration];
  }

  if (filters?.category) {
    whereClause.category = filters.category;
  }

  if (filters?.uploadDate) {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dateMap: Record<string, Date> = {
      hour: new Date(now.getTime() - 3600000),
      today: todayStart,
      week: new Date(now.getTime() - 7 * 24 * 3600000),
      month: new Date(now.getTime() - 30 * 24 * 3600000),
      year: new Date(now.getTime() - 365 * 24 * 3600000),
    };
    whereClause.publishedAt = { gte: dateMap[filters.uploadDate] };
  }

  // Determine sort order
  let orderBy: any = { publishedAt: 'desc' };
  if (filters?.sortBy === 'views') {
    orderBy = { viewsCache: 'desc' };
  } else if (filters?.sortBy === 'rating') {
    orderBy = { likesCache: 'desc' };
  }

  const [videos, total] = await Promise.all([
    prisma.video.findMany({
      where: whereClause,
      take: limit,
      skip,
      orderBy,
      select: {
        id: true,
        title: true,
        description: true,
        thumbnailUrl: true,
        hlsUrl: true,
        duration: true,
        viewsCache: true,
        likesCache: true,
        type: true,
        category: true,
        publishedAt: true,
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
      },
    }),
    prisma.video.count({ where: whereClause }),
  ]);

  return { videos, total };
};

// ============================================
// Get Recommended Videos (Simple - later integrate ML)
// ============================================

export const getRecommendedVideos = async (
  videoId: string,
  userId: string | undefined,
  limit: number = 10
) => {
  // Simple recommendation: same channel + trending
  const currentVideo = await prisma.video.findUnique({
    where: { id: videoId },
    select: { channelId: true, type: true, category: true },
  });

  if (!currentVideo) {
    throw new AppError('Video not found', 404);
  }

  const videos = await prisma.video.findMany({
    where: {
      id: { not: videoId },
      status: 'READY',
      isPublic: true,
      isDeleted: false,
      publishedAt: { not: null },
      OR: [
        { channelId: currentVideo.channelId },
        { type: currentVideo.type },
        { category: currentVideo.category },
      ],
    },
    take: limit,
    orderBy: [
      { viewsCache: 'desc' },
      { publishedAt: 'desc' },
    ],
    select: {
      id: true,
      title: true,
      thumbnailUrl: true,
      hlsUrl: true,
      duration: true,
      viewsCache: true,
      likesCache: true,
      type: true,
      category: true,
      publishedAt: true,
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
    },
  });

  return videos;
};
