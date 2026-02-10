/**
 * Event Routes — Server-Sent Events (SSE) endpoint for frontend telemetry
 *
 * GET /api/events/stream   – SSE stream of real-time events for authenticated user
 * POST /api/events/track   – batch event tracking from client telemetry
 */

import { Router, Response } from 'express';
import { authenticate, optionalAuth, type AuthRequest } from '../../middleware/auth.js';
import { asyncHandler } from '../../middleware/errorHandler.js';
import { successResponse, errorResponse } from '../../utils/response.js';
import { trackEvent } from '../analytics/analytics.service.js';
import type { EventType } from '@prisma/client';

const router = Router();

// SSE stream for real-time notifications
router.get(
  '/stream',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.user) return errorResponse(res, 'Unauthorized', 401);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    // Send heartbeat every 30 s
    const heartbeat = setInterval(() => {
      res.write(': heartbeat\n\n');
    }, 30_000);

    req.on('close', () => {
      clearInterval(heartbeat);
    });

    // Initial ping
    res.write('data: {"type":"connected"}\n\n');
  }),
);

// Batch event ingestion from client telemetry
router.post(
  '/track',
  optionalAuth,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { events } = req.body as {
      events: Array<{
        eventType: string;
        videoId?: string;
        metadata?: any;
        timestamp?: string;
      }>;
    };

    if (!Array.isArray(events) || events.length === 0) {
      return errorResponse(res, 'events array required', 400);
    }

    // Cap at 50 events per batch
    const batch = events.slice(0, 50);

    const validTypes: EventType[] = [
      'VIDEO_VIEW', 'VIDEO_LIKE', 'VIDEO_DISLIKE', 'VIDEO_SHARE',
      'CHANNEL_VIEW', 'SEARCH', 'VIDEO_QUALITY_CHANGE', 'PLAYBACK_ERROR',
    ];

    for (const evt of batch) {
      if (!validTypes.includes(evt.eventType as EventType)) continue;
      await trackEvent({
        userId: req.user?.userId,
        videoId: evt.videoId,
        eventType: evt.eventType as EventType,
        metadata: evt.metadata,
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip,
      });
    }

    return successResponse(res, { accepted: batch.length }, 'Events tracked');
  }),
);

export default router;
