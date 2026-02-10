/**
 * Notification Service
 *
 * YouTube-architecture: creators get real-time notifications for
 * new subscribers, comments, like milestones, video processing.
 * Viewers get notifications for new uploads from subscriptions.
 *
 * Persists to DB + pushes via WebSocket.
 */

import { prisma } from '../config/db.js';
import { cache } from '../config/db.js';

// NOTE: `db.notification` requires `npx prisma generate` after schema update.
// Using typed accessor to avoid compile errors before generate runs.
const db = prisma as any;
import { eventBus, EventChannels } from './eventBus.service.js';
import type {
  VideoUploadedEvent,
  VideoProcessedEvent,
  VideoCommentedEvent,
  VideoLikedEvent,
  UserSubscribedEvent,
  PlatformEvent,
} from './eventBus.service.js';
import logger from '../utils/logger.js';

// ---------- types ----------

export type NotificationType =
  | 'NEW_VIDEO'       // subscribed channel published
  | 'COMMENT'         // someone commented on your video
  | 'COMMENT_REPLY'   // reply to your comment
  | 'LIKE_MILESTONE'  // video hit N likes
  | 'SUBSCRIBER'      // new subscriber
  | 'VIDEO_PROCESSED' // your upload finished transcoding
  | 'SYSTEM';         // generic system notification

export interface CreateNotificationData {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  thumbnailUrl?: string;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
}

// ---------- service ----------

class NotificationService {
  private wsEmitter: ((userId: string, notification: unknown) => void) | null = null;

  /** Hook into a WebSocket broadcast function (from CommentBroadcaster or dedicated ns). */
  setWsEmitter(fn: (userId: string, notification: unknown) => void) {
    this.wsEmitter = fn;
  }

  /** Create a notification + push via WS. */
  async create(data: CreateNotificationData) {
    try {
      const notification = await db.notification.create({
        data: {
          userId: data.userId,
          type: data.type,
          title: data.title,
          body: data.body,
          thumbnailUrl: data.thumbnailUrl,
          actionUrl: data.actionUrl,
          metadata: data.metadata ?? {},
        },
      });

      // Invalidate cache
      await cache.del(`notifications:${data.userId}`);
      await cache.del(`notifications:unread:${data.userId}`);

      // Push real-time via WS
      if (this.wsEmitter) {
        this.wsEmitter(data.userId, notification);
      }

      return notification;
    } catch (err) {
      logger.error('Failed to create notification:', err);
      return null;
    }
  }

  /** Get notifications for a user. */
  async getForUser(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const cacheKey = `notifications:${userId}:${page}:${limit}`;
    const cached = await cache.get<{ notifications: unknown[]; total: number }>(cacheKey);
    if (cached) return cached;

    const [notifications, total] = await Promise.all([
      db.notification.findMany({
        where: { userId },
        take: limit,
        skip,
        orderBy: { createdAt: 'desc' },
      }),
      db.notification.count({ where: { userId } }),
    ]);

    const result = { notifications, total };
    await cache.set(cacheKey, result, 60);
    return result;
  }

  /** Unread count. */
  async getUnreadCount(userId: string): Promise<number> {
    const cacheKey = `notifications:unread:${userId}`;
    const cached = await cache.get<number>(cacheKey);
    if (cached !== null) return cached;

    const count = await db.notification.count({
      where: { userId, read: false },
    });
    await cache.set(cacheKey, count, 30);
    return count;
  }

  /** Mark single as read. */
  async markRead(notificationId: string, userId: string) {
    await db.notification.updateMany({
      where: { id: notificationId, userId },
      data: { read: true, readAt: new Date() },
    });
    await cache.del(`notifications:unread:${userId}`);
    await cache.delPattern(`notifications:${userId}:*`);
  }

  /** Mark all as read. */
  async markAllRead(userId: string) {
    await db.notification.updateMany({
      where: { userId, read: false },
      data: { read: true, readAt: new Date() },
    });
    await cache.del(`notifications:unread:${userId}`);
    await cache.delPattern(`notifications:${userId}:*`);
  }

  /** Delete a notification. */
  async delete(notificationId: string, userId: string) {
    await db.notification.deleteMany({
      where: { id: notificationId, userId },
    });
    await cache.del(`notifications:unread:${userId}`);
    await cache.delPattern(`notifications:${userId}:*`);
  }

  // ========================================
  // Event-driven notification generators
  // ========================================

  /** Wire up EventBus listeners. */
  async registerEventListeners() {
    // When a new video is uploaded → notify subscribers
    await eventBus.subscribe(
      EventChannels.VIDEO_UPLOADED,
      async (event: PlatformEvent) => {
        const data = event.data as VideoUploadedEvent;
        await this.notifySubscribersOfNewVideo(data);
      },
    );

    // When transcoding is done → notify creator
    await eventBus.subscribe(
      EventChannels.VIDEO_PROCESSED,
      async (event: PlatformEvent) => {
        const data = event.data as VideoProcessedEvent;
        await this.notifyVideoProcessed(data);
      },
    );

    // When someone comments → notify video owner
    await eventBus.subscribe(
      EventChannels.VIDEO_COMMENTED,
      async (event: PlatformEvent) => {
        const data = event.data as VideoCommentedEvent;
        await this.notifyNewComment(data);
      },
    );

    // When someone likes → check milestones
    await eventBus.subscribe(
      EventChannels.VIDEO_LIKED,
      async (event: PlatformEvent) => {
        const data = event.data as VideoLikedEvent;
        await this.checkLikeMilestone(data);
      },
    );

    // New subscriber
    await eventBus.subscribe(
      EventChannels.USER_SUBSCRIBED,
      async (event: PlatformEvent) => {
        const data = event.data as UserSubscribedEvent;
        await this.notifyNewSubscriber(data);
      },
    );

    logger.info('🔔 NotificationService: event listeners registered');
  }

  // ---------- private generators ----------

  private async notifySubscribersOfNewVideo(data: VideoUploadedEvent) {
    try {
      // Find channel owner info
      const channel = await prisma.channel.findUnique({
        where: { id: data.channelId },
        select: { name: true, avatarUrl: true },
      });
      if (!channel) return;

      // Get subscribers (max 1000 at a time for safety)
      const subs = await prisma.subscription.findMany({
        where: { channelId: data.channelId, notificationsOn: true },
        select: { userId: true },
        take: 1000,
      });

      for (const sub of subs) {
        await this.create({
          userId: sub.userId,
          type: 'NEW_VIDEO',
          title: `${channel.name} uploaded a video`,
          body: data.title,
          thumbnailUrl: channel.avatarUrl ?? undefined,
          actionUrl: `/watch?v=${data.videoId}`,
          metadata: { channelId: data.channelId, videoId: data.videoId },
        });
      }
    } catch (err) {
      logger.error('notifySubscribersOfNewVideo error:', err);
    }
  }

  private async notifyVideoProcessed(data: VideoProcessedEvent) {
    try {
      const video = await prisma.video.findUnique({
        where: { id: data.videoId },
        select: { title: true, channel: { select: { userId: true } } },
      });
      if (!video) return;

      await this.create({
        userId: video.channel.userId,
        type: 'VIDEO_PROCESSED',
        title: 'Video published!',
        body: `"${video.title}" is now live.`,
        actionUrl: `/watch?v=${data.videoId}`,
        metadata: { videoId: data.videoId, variants: data.variants },
      });
    } catch (err) {
      logger.error('notifyVideoProcessed error:', err);
    }
  }

  private async notifyNewComment(data: VideoCommentedEvent) {
    try {
      const video = await prisma.video.findUnique({
        where: { id: data.videoId },
        select: { title: true, channel: { select: { userId: true } } },
      });
      if (!video) return;

      // Don't notify the commenter if they own the video
      if (video.channel.userId === data.userId) return;

      const commenter = await prisma.user.findUnique({
        where: { id: data.userId },
        select: { displayName: true, avatarUrl: true },
      });

      await this.create({
        userId: video.channel.userId,
        type: 'COMMENT',
        title: `${commenter?.displayName || 'Someone'} commented`,
        body: data.content.slice(0, 120),
        thumbnailUrl: commenter?.avatarUrl ?? undefined,
        actionUrl: `/watch?v=${data.videoId}`,
        metadata: { videoId: data.videoId, commentId: data.commentId },
      });
    } catch (err) {
      logger.error('notifyNewComment error:', err);
    }
  }

  private async checkLikeMilestone(data: VideoLikedEvent) {
    if (data.action !== 'added' || data.type !== 'LIKE') return;
    try {
      const video = await prisma.video.findUnique({
        where: { id: data.videoId },
        select: { likes: true, title: true, channel: { select: { userId: true } } },
      });
      if (!video) return;

      const milestones = [10, 50, 100, 500, 1000, 5000, 10000, 50000, 100000, 1000000];
      if (milestones.includes(video.likes)) {
        await this.create({
          userId: video.channel.userId,
          type: 'LIKE_MILESTONE',
          title: `🎉 ${video.likes.toLocaleString()} likes!`,
          body: `"${video.title}" reached ${video.likes.toLocaleString()} likes`,
          actionUrl: `/watch?v=${data.videoId}`,
          metadata: { videoId: data.videoId, likes: video.likes },
        });
      }
    } catch (err) {
      logger.error('checkLikeMilestone error:', err);
    }
  }

  private async notifyNewSubscriber(data: UserSubscribedEvent) {
    if (data.action !== 'subscribed') return;
    try {
      const channel = await prisma.channel.findUnique({
        where: { id: data.channelId },
        select: { userId: true, name: true },
      });
      if (!channel) return;

      const subscriber = await prisma.user.findUnique({
        where: { id: data.userId },
        select: { displayName: true, avatarUrl: true },
      });

      await this.create({
        userId: channel.userId,
        type: 'SUBSCRIBER',
        title: 'New subscriber!',
        body: `${subscriber?.displayName || 'Someone'} subscribed to ${channel.name}`,
        thumbnailUrl: subscriber?.avatarUrl ?? undefined,
        actionUrl: `/studio/analytics`,
        metadata: { channelId: data.channelId, subscriberId: data.userId },
      });
    } catch (err) {
      logger.error('notifyNewSubscriber error:', err);
    }
  }
}

export const notificationService = new NotificationService();
