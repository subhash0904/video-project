/**
 * Notification Routes
 *
 * GET    /api/notifications           – user's notification list
 * GET    /api/notifications/unread     – unread count
 * PATCH  /api/notifications/:id/read  – mark single read
 * PATCH  /api/notifications/read-all  – mark all read
 * DELETE /api/notifications/:id       – delete notification
 */

import { Router, Response } from 'express';
import { authenticate, type AuthRequest } from '../../middleware/auth.js';
import { asyncHandler } from '../../middleware/errorHandler.js';
import {
  successResponse,
  errorResponse,
  paginatedResponse,
  getPaginationParams,
  createPaginationMeta,
} from '../../utils/response.js';
import { notificationService } from '../../services/notification.service.js';

const router = Router();

// List notifications
router.get(
  '/',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.user) return errorResponse(res, 'Unauthorized', 401);

    const { page, limit } = getPaginationParams(
      req.query.page as string,
      req.query.limit as string,
    );

    const { notifications, total } = await notificationService.getForUser(
      req.user.userId,
      page,
      limit,
    );

    const meta = createPaginationMeta(total, page, limit);
    return paginatedResponse(res, notifications, meta, 'Notifications retrieved');
  }),
);

// Unread count
router.get(
  '/unread',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.user) return errorResponse(res, 'Unauthorized', 401);
    const count = await notificationService.getUnreadCount(req.user.userId);
    return successResponse(res, { count }, 'Unread count retrieved');
  }),
);

// Mark single read
router.patch(
  '/:id/read',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.user) return errorResponse(res, 'Unauthorized', 401);
    await notificationService.markRead(req.params.id as string, req.user.userId);
    return successResponse(res, null, 'Notification marked as read');
  }),
);

// Mark all read
router.patch(
  '/read-all',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.user) return errorResponse(res, 'Unauthorized', 401);
    await notificationService.markAllRead(req.user.userId);
    return successResponse(res, null, 'All notifications marked as read');
  }),
);

// Delete notification
router.delete(
  '/:id',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.user) return errorResponse(res, 'Unauthorized', 401);
    await notificationService.delete(req.params.id as string, req.user.userId);
    return successResponse(res, null, 'Notification deleted');
  }),
);

export default router;
