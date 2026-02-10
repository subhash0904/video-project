import { prisma, cache } from '../../config/db.js';
import { AppError } from '../../middleware/errorHandler.js';

// ============================================
// Get Channel By ID or Handle
// ============================================

export const getChannel = async (identifier: string) => {
  const cacheKey = `channel:${identifier}`;
  const cached = await cache.get(cacheKey);
  if (cached) return cached;

  // Check if identifier is handle (starts with @) or ID
  const isHandle = identifier.startsWith('@');

  const channel = await prisma.channel.findUnique({
    where: isHandle ? { handle: identifier } : { id: identifier },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          displayName: true,
          createdAt: true,
        },
      },
    },
  });

  if (!channel) {
    throw new AppError('Channel not found', 404);
  }

  // Cache for 10 minutes
  await cache.set(cacheKey, channel, 600);

  return channel;
};

// ============================================
// Get Channel Videos
// ============================================

export const getChannelVideos = async (
  channelId: string,
  page: number,
  limit: number,
  type?: 'STANDARD' | 'SHORT'
) => {
  const skip = (page - 1) * limit;

  const whereClause: any = {
    channelId,
    status: 'READY',
    isPublic: true,
    publishedAt: { not: null },
  };

  if (type) {
    whereClause.type = type;
  }

  const [videos, total] = await Promise.all([
    prisma.video.findMany({
      where: whereClause,
      take: limit,
      skip,
      orderBy: { publishedAt: 'desc' },
      select: {
        id: true,
        title: true,
        description: true,
        thumbnailUrl: true,
        duration: true,
        views: true,
        likes: true,
        type: true,
        publishedAt: true,
      },
    }),
    prisma.video.count({ where: whereClause }),
  ]);

  return { videos, total };
};

// ============================================
// Update Channel
// ============================================

interface UpdateChannelData {
  name?: string;
  description?: string;
  bannerUrl?: string;
  avatarUrl?: string;
}

export const updateChannel = async (
  channelId: string,
  userId: string,
  data: UpdateChannelData
) => {
  // Verify ownership
  const channel = await prisma.channel.findUnique({
    where: { id: channelId },
    select: { userId: true },
  });

  if (!channel) {
    throw new AppError('Channel not found', 404);
  }

  if (channel.userId !== userId) {
    throw new AppError('Unauthorized to update this channel', 403);
  }

  // Update channel
  const updated = await prisma.channel.update({
    where: { id: channelId },
    data,
  });

  // Invalidate cache
  await cache.delPattern(`channel:${channelId}*`);

  return updated;
};

// ============================================
// Get Channel Analytics
// ============================================

export const getChannelAnalytics = async (channelId: string, userId: string) => {
  // Verify ownership
  const channel = await prisma.channel.findUnique({
    where: { id: channelId },
    select: { userId: true },
  });

  if (!channel) {
    throw new AppError('Channel not found', 404);
  }

  if (channel.userId !== userId) {
    throw new AppError('Unauthorized to view analytics', 403);
  }

  // Get analytics data
  const [
    totalViews,
    totalLikes,
    recentVideos,
    topVideos,
  ] = await Promise.all([
    prisma.video.aggregate({
      where: { channelId },
      _sum: { views: true },
    }),
    prisma.video.aggregate({
      where: { channelId },
      _sum: { likes: true },
    }),
    prisma.video.findMany({
      where: { channelId },
      take: 5,
      orderBy: { publishedAt: 'desc' },
      select: {
        id: true,
        title: true,
        views: true,
        likes: true,
        publishedAt: true,
      },
    }),
    prisma.video.findMany({
      where: { channelId },
      take: 5,
      orderBy: { views: 'desc' },
      select: {
        id: true,
        title: true,
        views: true,
        likes: true,
        publishedAt: true,
      },
    }),
  ]);

  return {
    totalViews: totalViews._sum.views || 0,
    totalLikes: totalLikes._sum.likes || 0,
    recentVideos,
    topVideos,
  };
};
