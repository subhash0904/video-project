import { Router } from 'express';
import * as analyticsController from './analytics.controller.js';
import { authenticate, optionalAuth } from '../../middleware/auth.js';

const router = Router();

// Public/optional auth routes
router.post(
  '/view',
  optionalAuth,
  analyticsController.trackViewValidation,
  analyticsController.trackView
);

router.post('/share', optionalAuth, analyticsController.trackShare);

router.post(
  '/event',
  optionalAuth,
  analyticsController.trackEventValidation,
  analyticsController.trackEvent
);

router.get('/trending', optionalAuth, analyticsController.getTrendingVideos);

// Protected routes
router.post('/like', authenticate, analyticsController.trackLike);

router.get('/video/:videoId', authenticate, analyticsController.getVideoAnalytics);

export default router;
