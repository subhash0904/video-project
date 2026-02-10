import { Response, Request } from 'express';
import { body, query, validationResult } from 'express-validator';
import * as videoService from './video.service.js';
import { successResponse, errorResponse, paginatedResponse, getPaginationParams, createPaginationMeta } from '../../utils/response.js';
import { asyncHandler } from '../../middleware/errorHandler.js';
import { AuthRequest } from '../../middleware/auth.js';
import { prisma } from '../../config/db.js';
import type { VideoCategory } from '@prisma/client';
import { uploadVideoWithThumbnail } from '../../middleware/upload.js';
import { extractVideoMetadata, determineVideoType, generateThumbnail, validateVideoFile } from '../../utils/videoMetadata.js';
import { queueVideoForTranscoding } from '../../services/queue.service.js';
import { videoProcessingService } from '../../services/videoProcessing.service.js';
import { emitVideoLiked, emitUserSearched } from '../events/event.producer.js';
import path from 'path';
import fs from 'fs/promises';
import logger from '../../utils/logger.js';

const VIDEO_CATEGORIES = [
  'FILM_ANIMATION',
  'AUTOS_VEHICLES',
  'MUSIC',
  'PETS_ANIMALS',
  'SPORTS',
  'TRAVEL_EVENTS',
  'GAMING',
  'PEOPLE_BLOGS',
  'COMEDY',
  'ENTERTAINMENT',
  'NEWS_POLITICS',
  'HOWTO_STYLE',
  'EDUCATION',
  'SCIENCE_TECH',
  'NONPROFITS_ACTIVISM',
  'KIDS',
  'OTHER',
] as const;

// ============================================
// Validation Rules
// ============================================

export const uploadVideoValidation = [
  body('title').notEmpty().isLength({ max: 100 }),
  body('description').optional().isLength({ max: 5000 }),
  body('thumbnailUrl').notEmpty().isURL(),
  body('duration').isInt({ min: 1 }),
  body('type').optional().isIn(['STANDARD', 'SHORT']),
  body('category').optional().isIn(VIDEO_CATEGORIES),
];

export const updateVideoValidation = [
  body('title').optional().isLength({ max: 100 }),
  body('description').optional().isLength({ max: 5000 }),
  body('thumbnailUrl').optional().isURL(),
  body('isPublic').optional().isBoolean(),
  body('allowComments').optional().isBoolean(),
  body('ageRestricted').optional().isBoolean(),
  body('category').optional().isIn(VIDEO_CATEGORIES),
];

export const searchValidation = [
  query('q').optional().isString().withMessage('Search query must be a string'),
  query('category').optional().isIn(VIDEO_CATEGORIES),
  query('voiceSearch').optional().isBoolean(),
];

// ============================================
// Controllers
// ============================================

/**
 * Get all available video categories
 * GET /api/videos/categories
 */
export const getCategories = asyncHandler(async (req: Request, res: Response) => {
  const categories = VIDEO_CATEGORIES.map(cat => ({
    value: cat,
    label: cat.split('_').map(word => 
      word.charAt(0) + word.slice(1).toLowerCase()
    ).join(' & '),
  }));

  return successResponse(res, categories, 'Categories retrieved successfully');
});

export const getVideoFeed = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { page, limit } = getPaginationParams(
    req.query.page as string,
    req.query.limit as string
  );

  const type = req.query.type as 'STANDARD' | 'SHORT' | undefined;
  const categoryRaw = req.query.category as string | undefined;
  const category = (categoryRaw && VIDEO_CATEGORIES.includes(categoryRaw as any)
    ? categoryRaw
    : undefined) as VideoCategory | undefined;

  const result = await videoService.getVideoFeed(
    req.user?.userId,
    page,
    limit,
    type,
    category
  ) as { videos: any[]; total: number };

  const { videos, total } = result;

  const meta = createPaginationMeta(total, page, limit);

  return paginatedResponse(res, videos, meta, 'Video feed retrieved');
});

export const getVideoById = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;

  const video = await videoService.getVideoById(id, req.user?.userId);

  return successResponse(res, video, 'Video retrieved');
});
export const uploadVideo = asyncHandler(async (req: AuthRequest, res: Response) => {
  // Validation
  if (!req.user) {
    return errorResponse(res, 'Unauthorized', 401);
  }

  // Check if video file was uploaded
  const files = req.files as { [fieldname: string]: Express.Multer.File[] };
  if (!files || !files.video || files.video.length === 0) {
    return errorResponse(res, 'Video file is required', 400);
  }

  const videoFile = files.video[0];
  const thumbnailFile = files.thumbnail ? files.thumbnail[0] : null;

  try {
    // Get user's channel
    const channel = await prisma.channel.findUnique({
      where: { userId: req.user.userId },
      select: { id: true, name: true },
    });

    if (!channel) {
      // Cleanup uploaded files
      await fs.unlink(videoFile.path);
      if (thumbnailFile) await fs.unlink(thumbnailFile.path);
      return errorResponse(res, 'Channel not found. Please create a channel first', 404);
    }

    // Extract video metadata
    logger.info(`Extracting metadata for video: ${videoFile.path}`);
    const metadata = await extractVideoMetadata(videoFile.path);
    
    // Validate video file
    const validation = await validateVideoFile(videoFile.path);
    if (!validation.valid) {
      await fs.unlink(videoFile.path);
      if (thumbnailFile) await fs.unlink(thumbnailFile.path);
      return errorResponse(res, validation.error || 'Invalid video file', 400);
    }

    // Determine video type (SHORT vs STANDARD)
    const videoType = determineVideoType(metadata);

    // Generate thumbnail if not provided
    let thumbnailPath = '';
    if (thumbnailFile) {
      thumbnailPath = thumbnailFile.path;
    } else {
      // Auto-generate thumbnail from video
      const thumbnailFilename = `thumb-${Date.now()}.jpg`;
      thumbnailPath = path.join('uploads', 'thumbnails', thumbnailFilename);
      await generateThumbnail(videoFile.path, thumbnailPath, '00:00:01');
    }

    // Get form data
    const { title, description, tags, isPublic = true, allowComments = true, category } = req.body;

    if (!title) {
      await fs.unlink(videoFile.path);
      await fs.unlink(thumbnailPath);
      return errorResponse(res, 'Title is required', 400);
    }

    const categoryValue = typeof category === 'string'
      ? category.trim().toUpperCase()
      : 'OTHER';
    const normalizedCategory = (VIDEO_CATEGORIES.includes(categoryValue as any)
      ? categoryValue
      : 'OTHER') as VideoCategory;

    // Create video record in database
    const video = await prisma.video.create({
      data: {
        channelId: channel.id,
        title,
        description: description || '',
        thumbnailUrl: `/uploads/thumbnails/${path.basename(thumbnailPath)}`,
        duration: metadata.duration,
        type: videoType,
        category: normalizedCategory,
        status: 'PROCESSING', // Will be updated by transcoding service
        isPublic: isPublic === 'true' || isPublic === true,
        allowComments: allowComments === 'true' || allowComments === true,
        // Store raw file path temporarily (will be replaced by HLS URL after transcoding)
        hlsUrl: null,
      },
      include: {
        channel: {
          select: {
            id: true,
            name: true,
            handle: true,
            verified: true,
            subscriberCount: true,
          },
        },
      },
    });

    // Start processing pipeline (queue + emit events)
    const pipelineStarted = await videoProcessingService.startPipeline(
      video.id,
      videoFile.path,
      channel.id,
    );
    
    if (!pipelineStarted) {
      logger.warn(`Failed to start pipeline for video ${video.id}, falling back to direct queue`);
      await queueVideoForTranscoding({ id: video.id, rawFilePath: videoFile.path });
    }
    
    logger.info(`Video uploaded successfully: ${video.id}`);
    logger.info(`Raw file: ${videoFile.path}`);
    logger.info(`Duration: ${metadata.duration}s, Resolution: ${metadata.resolution}, Type: ${videoType}`);

    return successResponse(
      res,
      {
        ...video,
        metadata: {
          duration: metadata.duration,
          resolution: metadata.resolution,
          codec: metadata.codec,
          bitrate: metadata.bitrate,
          fps: metadata.fps,
          fileSize: metadata.fileSize,
        },
        rawFilePath: videoFile.path, // Temporary, for transcoding service
      },
      'Video uploaded successfully. Processing will begin shortly.',
      201
    );
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('Upload error:', err);
    
    // Cleanup files on error
    try {
      await fs.unlink(videoFile.path);
      if (thumbnailFile) await fs.unlink(thumbnailFile.path);
    } catch (cleanupError) {
      logger.error('Cleanup error:', cleanupError);
    }
    
    return errorResponse(res, 'Failed to upload video', 500);
  }
});

export const updateVideo = asyncHandler(async (req: AuthRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return errorResponse(res, 'Validation failed', 400, errors.array());
  }

  if (!req.user) {
    return errorResponse(res, 'Unauthorized', 401);
  }

  const videoId = req.params.id as string;

  // Get user's channel
  const channel = await prisma.channel.findUnique({
    where: { userId: req.user.userId },
    select: { id: true },
  });

  if (!channel) {
    return errorResponse(res, 'Channel not found', 404);
  }

  const video = await videoService.updateVideo(videoId, channel.id, req.body);

  return successResponse(res, video, 'Video updated successfully');
});

export const deleteVideo = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return errorResponse(res, 'Unauthorized', 401);
  }

  const videoId = req.params.id as string;

  // Get user's channel
  const channel = await prisma.channel.findUnique({
    where: { userId: req.user.userId },
    select: { id: true },
  });

  if (!channel) {
    return errorResponse(res, 'Channel not found', 404);
  }

  const result = await videoService.deleteVideo(videoId, channel.id);

  return successResponse(res, result, 'Video deleted successfully');
});

export const toggleLike = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return errorResponse(res, 'Unauthorized', 401);
  }

  const rawVideoId = (req.params.id ?? (req.params as any).videoId) as string | undefined;
  const videoId = typeof rawVideoId === 'string' ? rawVideoId.trim() : '';
  const { type } = req.body; // 'LIKE' or 'DISLIKE'

  if (!videoId) {
    return errorResponse(res, 'Video ID is required', 400);
  }

  if (!type || !['LIKE', 'DISLIKE'].includes(type)) {
    return errorResponse(res, 'Valid type (LIKE or DISLIKE) is required', 400);
  }

  const result = await videoService.toggleLike(req.user.userId, videoId, type);

  // Emit like event for stats & notifications
  emitVideoLiked({
    videoId,
    userId: req.user.userId,
    type: type as 'LIKE' | 'DISLIKE',
    action: (result?.action || 'added') as 'added' | 'removed' | 'changed',
  }).catch(() => {});

  return successResponse(res, result, 'Like status updated');
});

export const getLikeStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return errorResponse(res, 'Unauthorized', 401);
  }

  const rawVideoId = (req.params.id ?? (req.params as any).videoId) as string | undefined;
  const videoId = typeof rawVideoId === 'string' ? rawVideoId.trim() : '';

  if (!videoId) {
    return errorResponse(res, 'Video ID is required', 400);
  }

  const status = await videoService.getLikeStatus(req.user.userId, videoId);

  return successResponse(res, status, 'Like status retrieved');
});
// ============================================
// Transcoding Webhook
// ============================================

/**
 * Webhook endpoint called by transcoding worker when video processing is complete
 */
export const handleTranscodeComplete = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const { hlsUrl, status, variants } = req.body;

  if (!hlsUrl || !status) {
    return errorResponse(res, 'Missing required fields: hlsUrl, status', 400);
  }

  // Use videoProcessingService for proper event emission & cache invalidation
  await videoProcessingService.handleTranscodeComplete(
    id,
    hlsUrl,
    status,
    variants || 0,
  );

  logger.info(`Video ${id} transcoding complete: ${variants} variants generated`);

  return successResponse(res, { id, status }, 'Transcoding status updated');
});
export const searchVideos = asyncHandler(async (req: AuthRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return errorResponse(res, 'Validation failed', 400, errors.array());
  }

  const query = (req.query.q as string) || '';
  const { page, limit } = getPaginationParams(
    req.query.page as string,
    req.query.limit as string
  );

  const categoryRaw = req.query.category as string | undefined;
  const category = (categoryRaw && VIDEO_CATEGORIES.includes(categoryRaw as any)
    ? categoryRaw
    : undefined) as VideoCategory | undefined;

  const filters = {
    type: req.query.type as 'STANDARD' | 'SHORT' | undefined,
    category,
    duration: req.query.duration as 'short' | 'medium' | 'long' | undefined,
    uploadDate: req.query.uploadDate as 'hour' | 'today' | 'week' | 'month' | 'year' | undefined,
    sortBy: req.query.sortBy as 'relevance' | 'date' | 'views' | 'rating' | undefined,
  };

  const { videos, total } = await videoService.searchVideos(
    query,
    page,
    limit,
    filters
  );

  // Emit search event for analytics
  emitUserSearched({
    userId: req.user?.userId,
    query,
    resultsCount: total,
  }).catch(() => {});

  const meta = createPaginationMeta(total, page, limit);

  return paginatedResponse(res, videos, meta, 'Search results');
});

export const getRecommendedVideos = asyncHandler(async (req: AuthRequest, res: Response) => {
  const videoId = req.params.id as string;
  const limit = parseInt(req.query.limit as string, 10) || 10;

  const videos = await videoService.getRecommendedVideos(
    videoId,
    req.user?.userId,
    limit
  );

  return successResponse(res, videos, 'Recommended videos retrieved');
});
