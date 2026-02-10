import { Router } from 'express';
import * as userController from './user.controller.js';
import { authenticate } from '../../middleware/auth.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Profile routes
router.get('/profile', userController.getProfile);
router.get('/profile/:id', userController.getProfile);
router.patch('/profile', userController.updateProfileValidation, userController.updateProfile);
router.post('/change-password', userController.changePasswordValidation, userController.changePassword);

// Watch history routes
router.get('/watch-history', userController.getWatchHistory);
router.delete('/watch-history', userController.clearWatchHistory);

// Liked videos
router.get('/liked-videos', userController.getLikedVideos);

// Subscription routes
router.get('/subscriptions', userController.getSubscriptions);
router.post('/subscriptions/:channelId', userController.subscribe);
router.delete('/subscriptions/:channelId', userController.unsubscribe);
router.get('/subscriptions/:channelId/status', userController.checkSubscription);

export default router;
