/**
 * Event Bus Service — Redis Pub/Sub backbone
 *
 * YouTube-architecture: every action emits events that feed
 * Analytics, Recommendations, Notifications, Abuse detection.
 *
 * Channels:
 *   video:uploaded   – new raw file received
 *   video:processed  – transcoding complete
 *   video:viewed     – view recorded
 *   video:liked      – like/dislike
 *   video:commented  – new comment
 *   video:shared     – share action
 *   user:subscribed  – new subscription
 *   user:searched    – search query
 *   creator:notification – notification for creator
 */

import Redis from 'ioredis';
import config from '../config/env.js';
import logger from '../utils/logger.js';

// ---------- types ----------

export interface PlatformEvent<T = unknown> {
  type: string;
  timestamp: string;
  data: T;
}

export interface VideoUploadedEvent {
  videoId: string;
  channelId: string;
  title: string;
  type: 'STANDARD' | 'SHORT';
}

export interface VideoProcessedEvent {
  videoId: string;
  hlsUrl: string;
  variants: number;
  durationMs: number;
}

export interface VideoViewedEvent {
  videoId: string;
  userId?: string;
  watchDuration: number;
  completed: boolean;
  sessionId?: string;
  device?: string;
}

export interface VideoLikedEvent {
  videoId: string;
  userId: string;
  type: 'LIKE' | 'DISLIKE';
  action: 'added' | 'removed' | 'changed';
}

export interface VideoCommentedEvent {
  videoId: string;
  commentId: string;
  userId: string;
  content: string;
  parentId?: string;
}

export interface VideoSharedEvent {
  videoId: string;
  userId?: string;
  platform?: string;
}

export interface UserSubscribedEvent {
  userId: string;
  channelId: string;
  action: 'subscribed' | 'unsubscribed';
}

export interface UserSearchedEvent {
  userId?: string;
  query: string;
  resultsCount: number;
}

// ---------- handler map ----------

type EventHandler = (event: PlatformEvent) => void | Promise<void>;
type ChannelHandlers = Map<string, Set<EventHandler>>;

// ---------- singleton ----------

class EventBusService {
  private publisher: any = null;
  private subscriber: any = null;
  private handlers: ChannelHandlers = new Map();
  private connected = false;

  /** Initialise two dedicated Redis connections (pub + sub). */
  async init() {
    if (this.connected) return;

    const opts = {
      host: config.redisHost,
      port: config.redisPort,
      password: config.redisPassword,
      retryStrategy: (times: number) => Math.min(times * 50, 2000),
      maxRetriesPerRequest: null as unknown as number,
    };

    this.publisher = new (Redis as any)(opts);
    this.subscriber = new (Redis as any)(opts);

    this.subscriber.on('message', (channel: string, message: string) => {
      try {
        const event: PlatformEvent = JSON.parse(message);
        const cbs = this.handlers.get(channel);
        if (cbs) {
          for (const cb of cbs) {
            try {
              cb(event);
            } catch (err) {
              logger.error(`EventBus handler error on ${channel}`, err);
            }
          }
        }
      } catch (err) {
        logger.error('EventBus message parse error', err);
      }
    });

    this.connected = true;
    logger.info('📡 EventBus initialised (Redis pub/sub)');
  }

  /** Publish an event to a channel. */
  async publish<T>(channel: string, data: T): Promise<void> {
    if (!this.publisher) {
      logger.warn('EventBus not initialised — dropping event');
      return;
    }
    const event: PlatformEvent<T> = {
      type: channel,
      timestamp: new Date().toISOString(),
      data,
    };
    await this.publisher.publish(channel, JSON.stringify(event));
  }

  /** Subscribe to a channel with a handler. */
  async subscribe(channel: string, handler: EventHandler): Promise<() => void> {
    if (!this.subscriber) {
      await this.init();
    }

    if (!this.handlers.has(channel)) {
      this.handlers.set(channel, new Set());
      await this.subscriber!.subscribe(channel);
    }
    this.handlers.get(channel)!.add(handler);

    // Return unsubscribe function
    return () => {
      const set = this.handlers.get(channel);
      if (set) {
        set.delete(handler);
        if (set.size === 0) {
          this.subscriber?.unsubscribe(channel);
          this.handlers.delete(channel);
        }
      }
    };
  }

  /** Graceful shutdown. */
  async shutdown() {
    await this.publisher?.quit();
    await this.subscriber?.quit();
    this.connected = false;
  }
}

export const eventBus = new EventBusService();

// ---------- convenience publishers ----------

export const EventChannels = {
  VIDEO_UPLOADED: 'video:uploaded',
  VIDEO_PROCESSED: 'video:processed',
  VIDEO_VIEWED: 'video:viewed',
  VIDEO_LIKED: 'video:liked',
  VIDEO_COMMENTED: 'video:commented',
  VIDEO_SHARED: 'video:shared',
  USER_SUBSCRIBED: 'user:subscribed',
  USER_SEARCHED: 'user:searched',
  CREATOR_NOTIFICATION: 'creator:notification',
} as const;

export async function emitVideoUploaded(data: VideoUploadedEvent) {
  return eventBus.publish(EventChannels.VIDEO_UPLOADED, data);
}

export async function emitVideoProcessed(data: VideoProcessedEvent) {
  return eventBus.publish(EventChannels.VIDEO_PROCESSED, data);
}

export async function emitVideoViewed(data: VideoViewedEvent) {
  return eventBus.publish(EventChannels.VIDEO_VIEWED, data);
}

export async function emitVideoLiked(data: VideoLikedEvent) {
  return eventBus.publish(EventChannels.VIDEO_LIKED, data);
}

export async function emitVideoCommented(data: VideoCommentedEvent) {
  return eventBus.publish(EventChannels.VIDEO_COMMENTED, data);
}

export async function emitVideoShared(data: VideoSharedEvent) {
  return eventBus.publish(EventChannels.VIDEO_SHARED, data);
}

export async function emitUserSubscribed(data: UserSubscribedEvent) {
  return eventBus.publish(EventChannels.USER_SUBSCRIBED, data);
}

export async function emitUserSearched(data: UserSearchedEvent) {
  return eventBus.publish(EventChannels.USER_SEARCHED, data);
}
