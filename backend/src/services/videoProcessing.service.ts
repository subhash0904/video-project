/**
 * Video Processing Service — orchestrates the upload → transcode → publish pipeline
 *
 * YouTube-architecture: Video Upload Service → Object Storage → Transcoding → CDN Push
 *
 * This service:
 *  1. Accepts the raw upload  
 *  2. Stores metadata in DB (status=PROCESSING)
 *  3. Queues transcoding job via Redis
 *  4. Emits events through EventBus
 *  5. Handles transcoding completion webhook
 *  6. Pushes processing status via WebSocket
 */

import { prisma, cache } from '../config/db.js';
import { queueVideoForTranscoding } from './queue.service.js';
import {
  emitVideoUploaded,
  emitVideoProcessed,
  type VideoProcessedEvent,
} from './eventBus.service.js';
import logger from '../utils/logger.js';

// ---------- types ----------

export type ProcessingStage =
  | 'QUEUED'
  | 'VALIDATING'
  | 'TRANSCODING'
  | 'GENERATING_THUMBNAILS'
  | 'PUBLISHING'
  | 'READY'
  | 'FAILED';

export interface ProcessingStatus {
  videoId: string;
  stage: ProcessingStage;
  progress: number; // 0-100
  message: string;
  updatedAt: string;
}

// ---------- service ----------

class VideoProcessingService {
  private statusEmitter: ((userId: string, status: ProcessingStatus) => void) | null = null;

  /** Register a WS-based status emitter. */
  setStatusEmitter(fn: (userId: string, status: ProcessingStatus) => void) {
    this.statusEmitter = fn;
  }

  /**
   * Start the processing pipeline for a newly uploaded video.
   */
  async startPipeline(videoId: string, rawFilePath: string, channelId: string) {
    // 1 — mark PROCESSING
    await this.updateStatus(videoId, 'QUEUED', 5, 'Queued for processing');

    // 2 — queue for transcoding
    const queued = await queueVideoForTranscoding({ id: videoId, rawFilePath });
    if (!queued) {
      await this.updateStatus(videoId, 'FAILED', 0, 'Failed to queue for transcoding');
      return false;
    }

    await this.updateStatus(videoId, 'TRANSCODING', 15, 'Starting transcoding...');

    // 3 — emit event (feeds notification service, stats, etc.)
    const video = await prisma.video.findUnique({
      where: { id: videoId },
      select: { title: true, type: true },
    });

    await emitVideoUploaded({
      videoId,
      channelId,
      title: video?.title ?? 'Untitled',
      type: (video?.type as 'STANDARD' | 'SHORT') ?? 'STANDARD',
    });

    return true;
  }

  /**
   * Called by transcoding worker webhook when a video is done.
   */
  async handleTranscodeComplete(
    videoId: string,
    hlsUrl: string,
    status: string,
    variants: number,
  ) {
    if (status === 'READY') {
      // Update DB
      await prisma.video.update({
        where: { id: videoId },
        data: {
          hlsUrl,
          status: 'READY',
          processedAt: new Date(),
          publishedAt: new Date(),
        },
      });

      // Clear caches
      await cache.del(`video:${videoId}`);
      await cache.delPattern('feed:*');

      // Update processing status
      await this.updateStatus(videoId, 'READY', 100, 'Video is live!');

      // Emit processed event
      const event: VideoProcessedEvent = {
        videoId,
        hlsUrl,
        variants,
        durationMs: 0,
      };
      await emitVideoProcessed(event);

      logger.info(`✅ Video ${videoId} processing complete — ${variants} variants`);
    } else {
      await prisma.video.update({
        where: { id: videoId },
        data: { status: 'FAILED' },
      });
      await this.updateStatus(videoId, 'FAILED', 0, 'Transcoding failed');
      logger.error(`❌ Video ${videoId} transcoding failed`);
    }
  }

  /**
   * Get current processing status from Redis.
   */
  async getStatus(videoId: string): Promise<ProcessingStatus | null> {
    const cached = await cache.get<ProcessingStatus>(`processing:${videoId}`);
    return cached;
  }

  // ---------- helpers ----------

  private async updateStatus(
    videoId: string,
    stage: ProcessingStage,
    progress: number,
    message: string,
  ) {
    const status: ProcessingStatus = {
      videoId,
      stage,
      progress,
      message,
      updatedAt: new Date().toISOString(),
    };

    // Persist status in Redis (TTL 24h)
    await cache.set(`processing:${videoId}`, status, 86400);

    // Broadcast via WS to the creator
    if (this.statusEmitter) {
      try {
        const video = await prisma.video.findUnique({
          where: { id: videoId },
          select: { channel: { select: { userId: true } } },
        });
        if (video?.channel?.userId) {
          this.statusEmitter(video.channel.userId, status);
        }
      } catch (err) {
        logger.error('Failed to emit processing status:', err);
      }
    }
  }
}

export const videoProcessingService = new VideoProcessingService();
