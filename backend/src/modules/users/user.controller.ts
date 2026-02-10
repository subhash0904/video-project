import { Response } from 'express';
import { body, validationResult } from 'express-validator';
import * as userService from './user.service.js';
import { successResponse, errorResponse, paginatedResponse, getPaginationParams, createPaginationMeta } from '../../utils/response.js';
import { asyncHandler } from '../../middleware/errorHandler.js';
import { AuthRequest } from '../../middleware/auth.js';

// ============================================
// Validation Rules
// ============================================

export const updateProfileValidation = [
  body('displayName').optional().isLength({ min: 1, max: 50 }),
  body('avatarUrl').optional().isURL(),
  body('language').optional().isString(),
  body('theme').optional().isIn(['light', 'dark']),
  body('restrictedMode').optional().isBoolean(),
];

export const changePasswordValidation = [
  body('currentPassword').notEmpty(),
  body('newPassword').isLength({ min: 8 }),
];

// ============================================
// Controllers
// ============================================

export const getProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = (req.params.id as string) || req.user?.userId;

  if (!userId) {
    return errorResponse(res, 'User ID required', 400);
  }

  const user = await userService.getUserProfile(userId);
  return successResponse(res, user, 'User profile retrieved');
});

export const updateProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return errorResponse(res, 'Validation failed', 400, errors.array());
  }

  if (!req.user) {
    return errorResponse(res, 'Unauthorized', 401);
  }

  const user = await userService.updateUserProfile(req.user.userId, req.body);
  return successResponse(res, user, 'Profile updated successfully');
});

export const changePassword = asyncHandler(async (req: AuthRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return errorResponse(res, 'Validation failed', 400, errors.array());
  }

  if (!req.user) {
    return errorResponse(res, 'Unauthorized', 401);
  }

  const { currentPassword, newPassword } = req.body;

  const result = await userService.changePassword(
    req.user.userId,
    currentPassword,
    newPassword
  );

  return successResponse(res, result, 'Password changed successfully');
});

export const getWatchHistory = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return errorResponse(res, 'Unauthorized', 401);
  }

  const { page, limit } = getPaginationParams(
    req.query.page as string,
    req.query.limit as string
  );

  const { history, total } = await userService.getWatchHistory(
    req.user.userId,
    page,
    limit
  );

  const meta = createPaginationMeta(total, page, limit);

  return paginatedResponse(res, history, meta, 'Watch history retrieved');
});

export const clearWatchHistory = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return errorResponse(res, 'Unauthorized', 401);
  }

  const result = await userService.clearWatchHistory(req.user.userId);
  return successResponse(res, result, 'Watch history cleared');
});

export const getLikedVideos = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return errorResponse(res, 'Unauthorized', 401);
  }

  const { page, limit } = getPaginationParams(
    req.query.page as string,
    req.query.limit as string
  );

  const { likes, total } = await userService.getLikedVideos(
    req.user.userId,
    page,
    limit
  );

  const meta = createPaginationMeta(total, page, limit);

  return paginatedResponse(res, likes, meta, 'Liked videos retrieved');
});

export const getSubscriptions = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return errorResponse(res, 'Unauthorized', 401);
  }

  const subscriptions = await userService.getSubscriptions(req.user.userId);
  return successResponse(res, subscriptions, 'Subscriptions retrieved');
});

export const subscribe = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return errorResponse(res, 'Unauthorized', 401);
  }

  const channelId = req.params.channelId as string;

  const result = await userService.subscribeToChannel(req.user.userId, channelId);
  return successResponse(res, result, 'Subscribed successfully');
});

export const unsubscribe = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return errorResponse(res, 'Unauthorized', 401);
  }

  const channelId = req.params.channelId as string;

  const result = await userService.unsubscribeFromChannel(req.user.userId, channelId);
  return successResponse(res, result, 'Unsubscribed successfully');
});

export const checkSubscription = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return errorResponse(res, 'Unauthorized', 401);
  }

  const channelId = req.params.channelId as string;

  const result = await userService.checkSubscription(req.user.userId, channelId);
  return successResponse(res, result, 'Subscription status retrieved');
});
