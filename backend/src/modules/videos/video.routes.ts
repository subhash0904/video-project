import { Router } from 'express';
import * as videoController from './video.controller.js';
import { authenticate, optionalAuth } from '../../middleware/auth.js';
import { uploadVideoWithThumbnail, handleUploadError } from '../../middleware/upload.js';
import videoEngagementRoutes from './video-engagement.routes.js';

const router = Router();

// Public routes (with optional auth)
router.get('/feed', optionalAuth, videoController.getVideoFeed);
router.get('/search', optionalAuth, videoController.searchValidation, videoController.searchVideos);
router.get('/:id', optionalAuth, videoController.getVideoById);
router.get('/:id/recommended', optionalAuth, videoController.getRecommendedVideos);

// Protected routes
router.post(
  '/upload',
  authenticate,
  uploadVideoWithThumbnail,
  handleUploadError,
  videoController.uploadVideo
);

router.patch(
  '/:id',
  authenticate,
  videoController.updateVideoValidation,
  videoController.updateVideo
);

router.delete('/:id', authenticate, videoController.deleteVideo);

// Like/dislike routes
router.post('/:id/like', authenticate, videoController.toggleLike);
router.get('/:id/like-status', authenticate, videoController.getLikeStatus);

// Transcoding webhook (called by worker)
router.post('/:id/transcode-complete', videoController.handleTranscodeComplete);

// Engagement routes (comments, likes, views, watch history)
router.use(videoEngagementRoutes);

export default router;
