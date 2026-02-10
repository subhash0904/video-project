import { redis } from '../config/db.js';
import logger from '../utils/logger.js';
import path from 'path';

// ============================================
// Queue Names
// ============================================

export const QUEUE_NAMES = {
  TRANSCODE: 'video:transcode',
  THUMBNAIL: 'video:thumbnail',
};

// ============================================
// Video Transcoding Queue
// ============================================

/**
 * Push video to transcoding queue
 */
export const queueVideoForTranscoding = async (video: {
  id: string;
  rawFilePath: string;
}) => {
  try {
    const job = {
      videoId: video.id,
      inputPath: path.resolve(video.rawFilePath),
      outputDir: path.resolve('uploads', 'processed', video.id),
      timestamp: new Date().toISOString(),
    };

    await redis.rpush(QUEUE_NAMES.TRANSCODE, JSON.stringify(job));
    
    logger.info(`Queued video for transcoding: ${video.id}`);
    
    return true;
  } catch (error) {
    logger.error('Failed to queue video for transcoding:', error);
    return false;
  }
};

/**
 * Get queue length
 */
export const getQueueLength = async (queueName: string) => {
  try {
    return await redis.llen(queueName);
  } catch (error) {
    logger.error(`Failed to get queue length for ${queueName}:`, error);
    return 0;
  }
};

/**
 * Get queue status
 */
export const getQueueStatus = async () => {
  try {
    const [transcodeCount] = await Promise.all([
      redis.llen(QUEUE_NAMES.TRANSCODE),
    ]);

    return {
      transcoding: {
        pending: transcodeCount,
        queueName: QUEUE_NAMES.TRANSCODE,
      },
    };
  } catch (error) {
    logger.error('Failed to get queue status:', error);
    return {
      transcoding: { pending: 0, queueName: QUEUE_NAMES.TRANSCODE },
    };
  }
};
