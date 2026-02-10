/**
 * Database client for event-streaming service.
 *
 * Flushes aggregated Redis counters into the VideoStats table so that
 * the DB is the persistent source-of-truth, not Redis alone.
 */

import { PrismaClient } from '@prisma/client';
import { logger } from './logger.js';

const prisma = new PrismaClient({
  log: [{ emit: 'event', level: 'error' }],
});

prisma.$on('error' as never, (e: any) => {
  logger.error('Prisma error:', e);
});

/** Ensure the VideoStats row exists (upsert pattern). */
export async function upsertVideoStats(
  videoId: string,
  deltas: {
    viewCount?: number;
    likeCount?: number;
    dislikeCount?: number;
    commentCount?: number;
    shareCount?: number;
  },
): Promise<void> {
  try {
    await prisma.videoStats.upsert({
      where: { videoId },
      create: {
        videoId,
        viewCount: BigInt(Math.max(deltas.viewCount ?? 0, 0)),
        likeCount: BigInt(Math.max(deltas.likeCount ?? 0, 0)),
        dislikeCount: BigInt(Math.max(deltas.dislikeCount ?? 0, 0)),
        commentCount: BigInt(Math.max(deltas.commentCount ?? 0, 0)),
        shareCount: BigInt(Math.max(deltas.shareCount ?? 0, 0)),
      },
      update: {
        ...(deltas.viewCount ? { viewCount: { increment: deltas.viewCount } } : {}),
        ...(deltas.likeCount ? { likeCount: { increment: deltas.likeCount } } : {}),
        ...(deltas.dislikeCount ? { dislikeCount: { increment: deltas.dislikeCount } } : {}),
        ...(deltas.commentCount ? { commentCount: { increment: deltas.commentCount } } : {}),
        ...(deltas.shareCount ? { shareCount: { increment: deltas.shareCount } } : {}),
      },
    });
  } catch (err) {
    logger.error(`Failed to upsert VideoStats for ${videoId}:`, err);
  }
}

/** Update cached counters on Video row so queries stay fast. */
export async function syncVideoCacheCounters(
  videoId: string,
  viewsDelta: number,
  likesDelta: number,
): Promise<void> {
  try {
    await prisma.video.update({
      where: { id: videoId },
      data: {
        ...(viewsDelta ? { viewsCache: { increment: viewsDelta } } : {}),
        ...(likesDelta ? { likesCache: { increment: likesDelta } } : {}),
      },
    });
  } catch (err) {
    // Video may have been deleted — non-fatal
    logger.warn(`syncVideoCacheCounters failed for ${videoId}:`, err);
  }
}

/** Update channel subscriber count. */
export async function incrementChannelSubscribers(
  channelId: string,
  delta: number,
): Promise<void> {
  try {
    await prisma.channel.update({
      where: { id: channelId },
      data: { subscriberCount: { increment: delta } },
    });
  } catch (err) {
    logger.warn(`incrementChannelSubscribers failed for ${channelId}:`, err);
  }
}

export async function shutdownDb(): Promise<void> {
  await prisma.$disconnect();
}

export { prisma };
