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

  const channel = await channelService.getChannel(identifier);

  return successResponse(res, channel, 'Channel retrieved');
});

export const getChannelVideos = asyncHandler(async (req, res: Response) => {
  const id = req.params.id as string;
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

  return paginatedResponse(res, videos, meta, 'Channel videos retrieved');
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
