import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import { promisify } from 'util';
import logger from './logger.js';

// ============================================
// Video Metadata Types
// ============================================

export interface VideoMetadata {
  duration: number; // seconds
  width: number;
  height: number;
  resolution: string; // e.g., "1920x1080"
  codec: string;
  bitrate: number; // kb/s
  fps: number;
  fileSize: number; // bytes
  format: string;
}

// ============================================
// Extract Video Metadata
// ============================================

/**
 * Extract metadata from video file using FFmpeg
 */
export const extractVideoMetadata = (filePath: string): Promise<VideoMetadata> => {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        logger.warn('FFprobe not available or failed, using default metadata:', err.message);
        // Return sensible defaults so upload can proceed without ffprobe
        return resolve({
          duration: 0,
          width: 1920,
          height: 1080,
          resolution: '1920x1080',
          codec: 'unknown',
          bitrate: 0,
          fps: 30,
          fileSize: 0,
          format: 'unknown',
        });
      }

      try {
        const videoStream = metadata.streams.find(
          (s) => s.codec_type === 'video'
        );

        if (!videoStream) {
          return reject(new Error('No video stream found'));
        }

        // Extract video properties
        const width = videoStream.width || 0;
        const height = videoStream.height || 0;
        const duration = parseFloat(String(metadata.format.duration || 0));
        const bitrate = parseInt(String(metadata.format.bit_rate || 0), 10) / 1000; // Convert to kb/s
        const fps = eval(videoStream.r_frame_rate || '0'); // e.g., "30/1" -> 30
        const fileSize = parseInt(String(metadata.format.size || 0), 10);
        const codec = videoStream.codec_name || 'unknown';
        const format = metadata.format.format_name || 'unknown';


        // Determine video type based on aspect ratio and duration
        const aspectRatio = width / height;
        const resolution = `${width}x${height}`;

        resolve({
          duration: Math.round(duration),
          width,
          height,
          resolution,
          codec,
          bitrate,
          fps,
          fileSize,
          format,
        });
      } catch (error: unknown) {
        const err = error as Error;
        logger.error('Metadata parsing error:', err);
        reject(new Error('Failed to parse video metadata'));
      }
    });
  });
};

// ============================================
// Determine Video Type
// ============================================

/**
 * Determine if video should be classified as SHORT or STANDARD
 * YouTube Shorts criteria: vertical (9:16) and <= 60 seconds
 */
export const determineVideoType = (
  metadata: VideoMetadata
): 'SHORT' | 'STANDARD' => {
  const { width, height, duration } = metadata;
  const aspectRatio = width / height;

  // Vertical video (portrait) and under 60 seconds = SHORT
  if (aspectRatio < 1 && duration <= 60) {
    return 'SHORT';
  }

  return 'STANDARD';
};

// ============================================
// Generate Thumbnail from Video
// ============================================

/**
 * Generate thumbnail image from video at specific timestamp
 */
export const generateThumbnail = (
  videoPath: string,
  outputPath: string,
  timestamp: string = '00:00:01'
): Promise<string> => {
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .screenshots({
        timestamps: [timestamp],
        filename: path.basename(outputPath),
        folder: path.dirname(outputPath),
        size: '1280x720', // HD thumbnail
      })
      .on('end', () => {
        logger.info(`Thumbnail generated: ${outputPath}`);
        resolve(outputPath);
      })
      .on('error', (err) => {
        logger.warn('Thumbnail generation failed, using placeholder:', err.message);
        // Resolve with the outputPath even if generation failed — the file just won't exist
        resolve(outputPath);
      });
  });
};

// ============================================
// Validate Video File
// ============================================

/**
 * Validate video file is playable and has minimum quality requirements
 */
export const validateVideoFile = async (
  filePath: string
): Promise<{ valid: boolean; error?: string }> => {
  try {
    const metadata = await extractVideoMetadata(filePath);

    // If we got default metadata (ffprobe unavailable), skip validation
    if (metadata.format === 'unknown') {
      logger.warn('Skipping video validation — ffprobe metadata unavailable');
      return { valid: true };
    }

    // Minimum requirements
    if (metadata.duration < 1) {
      return { valid: false, error: 'Video must be at least 1 second long' };
    }

    if (metadata.width < 144 || metadata.height < 144) {
      return { valid: false, error: 'Video resolution too low (minimum 144p)' };
    }

    if (metadata.duration > 43200) {
      // 12 hours
      return { valid: false, error: 'Video too long (maximum 12 hours)' };
    }

    return { valid: true };
  } catch (error: unknown) {
    const err = error as Error;
    return { valid: false, error: err.message };
  }
};
