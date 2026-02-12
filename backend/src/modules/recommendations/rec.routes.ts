import { Router } from 'express';
import { asyncHandler } from '../../middleware/errorHandler.js';
import { AuthRequest, authenticate, optionalAuth } from '../../middleware/auth.js';
import { successResponse, errorResponse, paginatedResponse, getPaginationParams, createPaginationMeta } from '../../utils/response.js';
import * as recService from './rec.service.js';
import { recommendationEngine, normalizeVideo } from '../../services/recommendation.engine.js';
import { Response } from 'express';

const router = Router();
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

// Get personalized recommendations (requires auth)
router.get(
  '/personalized',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.user) {
      return errorResponse(res, 'Unauthorized', 401);
    }

    const { page, limit } = getPaginationParams(
      req.query.page as string,
      req.query.limit as string
    );

    const videos = await recService.getPersonalizedRecommendations(
      req.user.userId,
      page,
      limit
    );

    return successResponse(res, videos, 'Personalized recommendations retrieved');
  })
);

// Get subscription feed
router.get(
  '/subscriptions',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.user) {
      return errorResponse(res, 'Unauthorized', 401);
    }

    const { page, limit } = getPaginationParams(
      req.query.page as string,
      req.query.limit as string
    );

    const { videos, total } = await recService.getSubscriptionFeed(
      req.user.userId,
      page,
      limit
    );

    const meta = createPaginationMeta(total, page, limit);

    return paginatedResponse(res, videos, meta, 'Subscription feed retrieved');
  })
);

// Get shorts feed (public with optional auth)
router.get(
  '/shorts',
  optionalAuth,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { page, limit } = getPaginationParams(
      req.query.page as string,
      req.query.limit as string
    );

    const categoryRaw = req.query.category as string | undefined;
    const category = categoryRaw && VIDEO_CATEGORIES.includes(categoryRaw as any)
      ? categoryRaw
      : undefined;

    const shorts = await recService.getShortsFeed(
      req.user?.userId,
      page,
      limit,
      category
    );

    return successResponse(res, shorts, 'Shorts feed retrieved');
  })
);

// ============================================
// Two-Stage Recommendation Engine routes
// ============================================

// Advanced personalized recommendations (two-stage pipeline)
router.get(
  '/for-you',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.user) return errorResponse(res, 'Unauthorized', 401);

    const { page, limit } = getPaginationParams(
      req.query.page as string,
      req.query.limit as string,
    );

    const { videos, total } = await recommendationEngine.getRecommendations(
      req.user.userId,
      page,
      limit,
    );

    const meta = createPaginationMeta(total, page, limit);
    return paginatedResponse(res, videos, meta, 'Recommendations retrieved');
  }),
);

// Continue watching feed
router.get(
  '/continue-watching',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.user) return errorResponse(res, 'Unauthorized', 401);

    const limit = parseInt(req.query.limit as string) || 10;
    const videos = await recommendationEngine.getContinueWatching(req.user.userId, limit);

    return successResponse(res, videos, 'Continue watching retrieved');
  }),
);

// Trending feed (public)
router.get(
  '/trending',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const limit = parseInt(req.query.limit as string) || 30;
    const videos = await recommendationEngine.getTrending(limit);

    return successResponse(res, videos, 'Trending videos retrieved');
  }),
);

// Subscription videos section
router.get(
  '/subscription-videos',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.user) return errorResponse(res, 'Unauthorized', 401);

    const limit = parseInt(req.query.limit as string) || 20;
    const videos = await recommendationEngine.getSubscriptionVideos(req.user.userId, limit);

    return successResponse(res, videos, 'Subscription videos retrieved');
  }),
);

// Home feed (combines all sections)
router.get(
  '/home',
  optionalAuth,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user?.userId;
    const sections: Array<{ id: string; title: string; videos: unknown[] }> = [];

    // Trending always available
    const trending = await recommendationEngine.getTrending(12);
    sections.push({ id: 'trending', title: 'Trending', videos: trending.map(normalizeVideo) });

    // Authenticated user gets personalized sections
    if (userId) {
      const [continueWatching, forYou, fromSubs] = await Promise.all([
        recommendationEngine.getContinueWatching(userId, 8),
        recommendationEngine.getRecommendations(userId, 1, 12),
        recommendationEngine.getSubscriptionVideos(userId, 12),
      ]);

      if (continueWatching.length > 0) {
        sections.unshift({ id: 'continue', title: 'Continue Watching', videos: continueWatching.map(normalizeVideo) });
      }
      if (fromSubs.length > 0) {
        sections.splice(1, 0, { id: 'subscriptions', title: 'From Your Subscriptions', videos: fromSubs.map(normalizeVideo) });
      }
      sections.push({ id: 'for-you', title: 'Recommended For You', videos: forYou.videos.map(normalizeVideo) });
    }

    return successResponse(res, { sections }, 'Home feed retrieved');
  }),
);

export default router;
