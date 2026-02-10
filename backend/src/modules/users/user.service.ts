import { prisma, cache } from '../../config/db.js';
import { AppError } from '../../middleware/errorHandler.js';
import bcrypt from 'bcrypt';
import config from '../../config/env.js';

// ============================================
// Get User Profile
// ============================================

export const getUserProfile = async (userId: string) => {
  // Try cache first
  const cacheKey = `user:profile:${userId}`;
  const cached = await cache.get(cacheKey);
  if (cached) return cached;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      displayName: true,
      avatarUrl: true,
      createdAt: true,
      channel: {
        select: {
          id: true,
          handle: true,
          name: true,
          description: true,
          bannerUrl: true,
          subscriberCount: true,
          videoCount: true,
          totalViews: true,
          verified: true,
          createdAt: true,
        },
      },
    },
  });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  // Cache for 5 minutes
  await cache.set(cacheKey, user, 300);

  return user;
};

// ============================================
// Update User Profile
// ============================================

interface UpdateProfileData {
  displayName?: string;
  avatarUrl?: string;
  language?: string;
  theme?: string;
  restrictedMode?: boolean;
}

export const updateUserProfile = async (userId: string, data: UpdateProfileData) => {
  const user = await prisma.user.update({
    where: { id: userId },
    data,
    select: {
      id: true,
      email: true,
      username: true,
      displayName: true,
      avatarUrl: true,
      language: true,
      theme: true,
      restrictedMode: true,
    },
  });

  // Invalidate cache
  await cache.del(`user:profile:${userId}`);

  return user;
};

// ============================================
// Change Password
// ============================================

export const changePassword = async (
  userId: string,
  currentPassword: string,
  newPassword: string
) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, passwordHash: true },
  });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  // Check if user has a password (not OAuth-only)
  if (!user.passwordHash) {
    throw new AppError('Cannot change password for OAuth users', 400);
  }

  // Verify current password
  const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isValid) {
    throw new AppError('Current password is incorrect', 400);
  }

  // Hash new password
  const newPasswordHash = await bcrypt.hash(newPassword, config.bcryptRounds);

  // Update password
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: newPasswordHash },
  });

  return { message: 'Password changed successfully' };
};

// ============================================
// Get Watch History
// ============================================

export const getWatchHistory = async (
  userId: string,
  page: number,
  limit: number
) => {
  const skip = (page - 1) * limit;

  const [history, total] = await Promise.all([
    prisma.watchHistory.findMany({
      where: { userId },
      take: limit,
      skip,
      orderBy: { watchedAt: 'desc' },
      include: {
        video: {
          select: {
            id: true,
            title: true,
            thumbnailUrl: true,
            duration: true,
            viewsCache: true,
            type: true,
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
        },
      },
    }),
    prisma.watchHistory.count({ where: { userId } }),
  ]);

  return { history, total };
};

// ============================================
// Clear Watch History
// ============================================

export const clearWatchHistory = async (userId: string) => {
  await prisma.watchHistory.deleteMany({
    where: { userId },
  });

  return { message: 'Watch history cleared' };
};

// ============================================
// Get Liked Videos
// ============================================

export const getLikedVideos = async (
  userId: string,
  page: number,
  limit: number
) => {
  const skip = (page - 1) * limit;

  const [likes, total] = await Promise.all([
    prisma.like.findMany({
      where: {
        userId,
        type: 'LIKE',
      },
      take: limit,
      skip,
      orderBy: { createdAt: 'desc' },
      include: {
        video: {
          select: {
            id: true,
            title: true,
            thumbnailUrl: true,
            duration: true,
            viewsCache: true,
            likesCache: true,
            type: true,
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
        },
      },
    }),
    prisma.like.count({
      where: {
        userId,
        type: 'LIKE',
      },
    }),
  ]);

  return { likes, total };
};

// ============================================
// Get Subscriptions
// ============================================

export const getSubscriptions = async (userId: string) => {
  const subscriptions = await prisma.subscription.findMany({
    where: { userId },
    orderBy: { subscribedAt: 'desc' },
    include: {
      channel: {
        select: {
          id: true,
          handle: true,
          name: true,
          avatarUrl: true,
          subscriberCount: true,
          videoCount: true,
          verified: true,
        },
      },
    },
  });

  return subscriptions;
};

// ============================================
// Subscribe to Channel
// ============================================

export const subscribeToChannel = async (userId: string, channelId: string) => {
  // Check if already subscribed
  const existing = await prisma.subscription.findUnique({
    where: {
      userId_channelId: {
        userId,
        channelId,
      },
    },
  });

  if (existing) {
    throw new AppError('Already subscribed to this channel', 400);
  }

  // Create subscription and increment subscriber count
  await prisma.$transaction([
    prisma.subscription.create({
      data: {
        userId,
        channelId,
      },
    }),
    prisma.channel.update({
      where: { id: channelId },
      data: {
        subscriberCount: {
          increment: 1,
        },
      },
    }),
  ]);

  // Invalidate channel cache
  await cache.delPattern(`channel:${channelId}:*`);

  return { message: 'Subscribed successfully' };
};

// ============================================
// Unsubscribe from Channel
// ============================================

export const unsubscribeFromChannel = async (userId: string, channelId: string) => {
  const subscription = await prisma.subscription.findUnique({
    where: {
      userId_channelId: {
        userId,
        channelId,
      },
    },
  });

  if (!subscription) {
    throw new AppError('Not subscribed to this channel', 400);
  }

  // Delete subscription and decrement subscriber count
  await prisma.$transaction([
    prisma.subscription.delete({
      where: {
        id: subscription.id,
      },
    }),
    prisma.channel.update({
      where: { id: channelId },
      data: {
        subscriberCount: {
          decrement: 1,
        },
      },
    }),
  ]);

  // Invalidate channel cache
  await cache.delPattern(`channel:${channelId}:*`);

  return { message: 'Unsubscribed successfully' };
};

// ============================================
// Check Subscription Status
// ============================================

export const checkSubscription = async (userId: string, channelId: string) => {
  const subscription = await prisma.subscription.findUnique({
    where: {
      userId_channelId: {
        userId,
        channelId,
      },
    },
  });

  return {
    isSubscribed: !!subscription,
    subscription,
  };
};
