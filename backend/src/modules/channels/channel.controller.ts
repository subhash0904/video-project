import { Response } from 'express';
import { body, validationResult } from 'express-validator';
import * as channelService from './channel.service.js';
import {
  successResponse,
  errorResponse,
  paginatedResponse,
  getPaginationParams,
  createPaginationMeta,
} from '../../utils/response.js';
import { asyncHandler } from '../../middleware/errorHandler.js';
import { AuthRequest } from '../../middleware/auth.js';
import { normalizeVideo } from '../../services/recommendation.engine.js';
import { prisma } from '../../config/db.js';

// ============================================
// Validation Rules
// ============================================

export const updateChannelValidation = [
  body('name').optional().isLength({ min: 1, max: 100 }),
  body('description').optional().isLength({ max: 1000 }),
  body('bannerUrl').optional().isURL(),
  body('avatarUrl').optional().isURL(),
];

// ============================================
// Controllers
// ============================================

export const getChannel = asyncHandler(async (req, res: Response) => {
  const identifier = req.params.identifier as string; //  Can be ID or @handle

  const channel: any = await channelService.getChannel(identifier);

  // Normalize date fields
  const normalized = {
    ...channel,
    createdAt: channel.createdAt instanceof Date ? channel.createdAt.toISOString() : channel.createdAt,
    updatedAt: channel.updatedAt instanceof Date ? channel.updatedAt.toISOString() : channel.updatedAt,
    user: channel.user ? {
      ...channel.user,
      createdAt: channel.user.createdAt instanceof Date ? channel.user.createdAt.toISOString() : channel.user.createdAt,
    } : channel.user,
  };

  return successResponse(res, normalized, 'Channel retrieved');
});

export const getChannelVideos = asyncHandler(async (req, res: Response) => {
  let id = req.params.id as string;

  // Resolve handle to channel ID
  if (id.startsWith('@')) {
    const channel = await prisma.channel.findUnique({
      where: { handle: id },
      select: { id: true },
    });
    if (!channel) {
      return errorResponse(res, 'Channel not found', 404);
    }
    id = channel.id;
  }

  const { page, limit } = getPaginationParams(
    req.query.page as string,
    req.query.limit as string
  );
  const type = req.query.type as 'STANDARD' | 'SHORT' | undefined;

  const { videos, total } = await channelService.getChannelVideos(
    id,
    page,
    limit,
    type
  );

  const meta = createPaginationMeta(total, page, limit);

  return paginatedResponse(res, videos.map(normalizeVideo), meta, 'Channel videos retrieved');
});

export const updateChannel = asyncHandler(async (req: AuthRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return errorResponse(res, 'Validation failed', 400, errors.array());
  }

  if (!req.user) {
    return errorResponse(res, 'Unauthorized', 401);
  }

  const id = req.params.id as string;

  const channel = await channelService.updateChannel(id, req.user.userId, req.body);

  return successResponse(res, channel, 'Channel updated successfully');
});

export const getChannelAnalytics = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return errorResponse(res, 'Unauthorized', 401);
  }

  const id = req.params.id as string;

  const analytics = await channelService.getChannelAnalytics(id, req.user.userId);

  return successResponse(res, analytics, 'Channel analytics retrieved');
});
