import { Router } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { authenticate, optionalAuth } from '../middleware/auth.js';
import { authRateLimiter, uploadRateLimiter } from '../middleware/rate-limiter.js';
import { getCircuitBreaker } from '../middleware/circuit-breaker.js';
import { logger } from '../utils/logger.js';

export const router = Router();

// Service URLs from environment
const services = {
  user: process.env.USER_SERVICE_URL || 'http://backend:4000',
  video: process.env.VIDEO_SERVICE_URL || 'http://backend:4000',
  recommendation: process.env.RECOMMENDATION_SERVICE_URL || 'http://backend:4000',
  comment: process.env.COMMENT_SERVICE_URL || 'http://backend:4000',
  like: process.env.LIKE_SERVICE_URL || 'http://backend:4000',
  subscription: process.env.SUBSCRIPTION_SERVICE_URL || 'http://backend:4000',
  analytics: process.env.ANALYTICS_SERVICE_URL || 'http://backend:4000'
};

// Helper to create proxy with circuit breaker
const createServiceProxy = (serviceName: string, serviceUrl: string, pathRewrite?: any) => {
  const circuitBreaker = getCircuitBreaker(serviceName);
  
  return createProxyMiddleware({
    target: serviceUrl,
    changeOrigin: true,
    pathRewrite: pathRewrite || undefined,
    on: {
      proxyReq: (proxyReq: any, req: any) => {
        // Forward user info if authenticated
        if (req.user) {
          proxyReq.setHeader('X-User-Id', req.user.id);
          proxyReq.setHeader('X-User-Email', req.user.email);
          if (req.user.role) {
            proxyReq.setHeader('X-User-Role', req.user.role);
          }
        }

        // Forward original IP
        proxyReq.setHeader('X-Forwarded-For', req.ip);
        proxyReq.setHeader('X-Gateway-Region', process.env.REGION || 'default');
      },
      error: (err: any, req: any, res: any) => {
        logger.error(`Proxy error for ${serviceName}:`, err);
        
        if (!res.headersSent) {
          res.status(503).json({
            success: false,
            message: `${serviceName} service unavailable`,
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
          });
        }
      }
    }
  });
};

// ======================
// Authentication Routes
// ======================
router.use('/auth/register', authRateLimiter);
router.use('/auth/login', authRateLimiter);
router.use('/auth', createServiceProxy('user', services.user, { '^/auth': '/api/auth' }));

// ======================
// User Routes
// ======================
router.use('/users/:id/profile', optionalAuth);
router.use('/users', authenticate);
router.use('/users', createServiceProxy('user', services.user, { '^/users': '/api/users' }));

// ======================
// Video Routes
// ======================
router.get('/videos/feed', optionalAuth, createServiceProxy('video', services.video, { '^/videos': '/api/videos' }));
router.get('/videos/search', optionalAuth, createServiceProxy('video', services.video, { '^/videos': '/api/videos' }));
router.get('/videos/categories', optionalAuth, createServiceProxy('video', services.video, { '^/videos': '/api/videos' }));
router.get('/videos/:id', optionalAuth, createServiceProxy('video', services.video, { '^/videos': '/api/videos' }));
router.get('/videos/:id/recommended', optionalAuth, createServiceProxy('video', services.video, { '^/videos': '/api/videos' }));
router.get('/videos', optionalAuth, createServiceProxy('video', services.video, { '^/videos': '/api/videos' }));
router.post('/videos', authenticate, uploadRateLimiter, createServiceProxy('video', services.video, { '^/videos': '/api/videos' }));
router.post('/videos/:id/view', optionalAuth, createServiceProxy('video', services.video, { '^/videos': '/api/videos' }));
router.post('/videos/:id/watch', optionalAuth, createServiceProxy('video', services.video, { '^/videos': '/api/videos' }));
router.patch('/videos/:id', authenticate, createServiceProxy('video', services.video, { '^/videos': '/api/videos' }));
router.delete('/videos/:id', authenticate, createServiceProxy('video', services.video, { '^/videos': '/api/videos' }));

// ======================
// Recommendations Routes
// ======================
router.get('/recommendations', optionalAuth, createServiceProxy('recommendation', services.recommendation, { '^/recommendations': '/api/recommendations' }));
router.get('/recommendations/personalized', authenticate, createServiceProxy('recommendation', services.recommendation, { '^/recommendations': '/api/recommendations' }));

// ======================
// Comment Routes
// ======================
router.get('/videos/:videoId/comments', optionalAuth, createServiceProxy('comment', services.comment, { '^/videos': '/api/videos' }));
router.post('/videos/:videoId/comments', authenticate, createServiceProxy('comment', services.comment, { '^/videos': '/api/videos' }));
router.patch('/comments/:id', authenticate, createServiceProxy('comment', services.comment, { '^/comments': '/api/comments' }));
router.delete('/comments/:id', authenticate, createServiceProxy('comment', services.comment, { '^/comments': '/api/comments' }));

// ======================
// Like/Dislike Routes
// ======================
router.post('/videos/:videoId/like', authenticate, createServiceProxy('like', services.like, { '^/videos': '/api/videos' }));
router.delete('/videos/:videoId/like', authenticate, createServiceProxy('like', services.like, { '^/videos': '/api/videos' }));
router.post('/videos/:videoId/dislike', authenticate, createServiceProxy('like', services.like, { '^/videos': '/api/videos' }));
router.post('/comments/:commentId/like', authenticate, createServiceProxy('like', services.like, { '^/comments': '/api/comments' }));

// ======================
// Subscription Routes
// ======================
router.post('/channels/:channelId/subscribe', authenticate, createServiceProxy('subscription', services.subscription, { '^/channels': '/api/channels' }));
router.delete('/channels/:channelId/subscribe', authenticate, createServiceProxy('subscription', services.subscription, { '^/channels': '/api/channels' }));
router.get('/subscriptions', authenticate, createServiceProxy('subscription', services.subscription, { '^/subscriptions': '/api/subscriptions' }));

// ======================
// Channel Routes
// ======================
router.get('/channels/:id', optionalAuth, createServiceProxy('user', services.user, { '^/channels': '/api/channels' }));
router.patch('/channels/:id', authenticate, createServiceProxy('user', services.user, { '^/channels': '/api/channels' }));

// ======================
// Analytics Routes
// ======================
router.post('/analytics/view', optionalAuth, createServiceProxy('analytics', services.analytics, { '^/analytics': '/api/analytics' }));
router.post('/analytics/event', optionalAuth, createServiceProxy('analytics', services.analytics, { '^/analytics': '/api/analytics' }));
router.get('/analytics/dashboard', authenticate, createServiceProxy('analytics', services.analytics, { '^/analytics': '/api/analytics' }));

// ======================
// Search Routes
// ======================
router.get('/search', optionalAuth, createServiceProxy('video', services.video, { '^/search': '/api/videos/search' }));

// ======================
// Notification Routes
// ======================
router.get('/notifications', authenticate, createServiceProxy('user', services.user, { '^/notifications': '/api/notifications' }));
router.get('/notifications/unread', authenticate, createServiceProxy('user', services.user, { '^/notifications': '/api/notifications' }));
router.patch('/notifications/:id/read', authenticate, createServiceProxy('user', services.user, { '^/notifications': '/api/notifications' }));
router.patch('/notifications/read-all', authenticate, createServiceProxy('user', services.user, { '^/notifications': '/api/notifications' }));
router.delete('/notifications/:id', authenticate, createServiceProxy('user', services.user, { '^/notifications': '/api/notifications' }));
router.get('/notifications/preferences/:channelId', authenticate, createServiceProxy('user', services.user, { '^/notifications': '/api/notifications' }));
router.put('/notifications/preferences/:channelId', authenticate, createServiceProxy('user', services.user, { '^/notifications': '/api/notifications' }));

// ======================
// Event Routes
// ======================
router.use('/events', createServiceProxy('user', services.user, { '^/events': '/api/events' }));

// ======================
// Live Chat Routes
// ======================
router.get('/live/:videoId/chat', optionalAuth, createServiceProxy('user', services.user, { '^/api/live': '/api/live' }));
router.post('/live/:videoId/chat', authenticate, createServiceProxy('user', services.user, { '^/api/live': '/api/live' }));

logger.info('API Gateway routes configured');
