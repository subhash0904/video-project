import { Response } from 'express';
import { body, validationResult } from 'express-validator';
import * as analyticsService from './analytics.service.js';
import { successResponse, errorResponse } from '../../utils/response.js';
import { asyncHandler } from '../../middleware/errorHandler.js';
import { AuthRequest } from '../../middleware/auth.js';
import { EventType } from '@prisma/client';
import { prisma } from '../../config/db.js';

// ============================================
// Validation Rules
// ============================================

export const trackViewValidation = [
  body('videoId').notEmpty(),
  body('watchDuration').isInt({ min: 0 }),
  body('completed').isBoolean(),
  body('lastPosition').isInt({ min: 0 }),
];

export const trackEventValidation = [
  body('videoId').optional(),
  body('eventType').isIn(Object.values(EventType)),
  body('metadata').optional().isObject(),
];

// ============================================
// Controllers
// ============================================

export const trackView = asyncHandler(async (req: AuthRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return errorResponse(res, 'Validation failed', 400, errors.array());
  }

  const result = await analyticsService.trackView({
    userId: req.user?.userId,
    videoId: req.body.videoId,
    watchDuration: req.body.watchDuration,
    completed: req.body.completed,
    lastPosition: req.body.lastPosition,
    sessionId: req.body.sessionId,
    userAgent: req.headers['user-agent'],
    ipAddress: req.ip,
  });

  return successResponse(res, result, 'View tracked');
});

export const trackLike = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return errorResponse(res, 'Unauthorized', 401);
  }

  const { videoId, type } = req.body;

  if (!videoId || !type || !['LIKE', 'DISLIKE'].includes(type)) {
    return errorResponse(res, 'Valid videoId and type required', 400);
  }

  const result = await analyticsService.trackLike(req.user.userId, videoId, type);

  return successResponse(res, result, 'Like tracked');
});

export const trackShare = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { videoId, platform } = req.body;

  if (!videoId) {
    return errorResponse(res, 'videoId is required', 400);
  }

  const result = await analyticsService.trackShare(
    req.user?.userId,
    videoId,
    platform
  );

  return successResponse(res, result, 'Share tracked');
});

export const trackEvent = asyncHandler(async (req: AuthRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return errorResponse(res, 'Validation failed', 400, errors.array());
  }

  const result = await analyticsService.trackEvent({
    userId: req.user?.userId,
    videoId: req.body.videoId,
    eventType: req.body.eventType,
    metadata: req.body.metadata,
    sessionId: req.body.sessionId,
    userAgent: req.headers['user-agent'],
    ipAddress: req.ip,
  });

  return successResponse(res, result, 'Event tracked');
});

export const getVideoAnalytics = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return errorResponse(res, 'Unauthorized', 401);
  }

  const videoId = req.params.videoId as string;

  // Get user's channel
  const channel = await prisma.channel.findUnique({
    where: { userId: req.user.userId },
    select: { id: true },
  });

  if (!channel) {
    return errorResponse(res, 'Channel not found', 404);
  }

  const analytics = await analyticsService.getVideoAnalytics(videoId, channel.id);

  return successResponse(res, analytics, 'Video analytics retrieved');
});

export const getTrendingVideos = asyncHandler(async (req, res: Response) => {
  const limit = parseInt(req.query.limit as string, 10) || 20;

  const trending = await analyticsService.getTrendingVideos(limit);

  return successResponse(res, trending, 'Trending videos retrieved');
});
