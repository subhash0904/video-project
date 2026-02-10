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
router.use('/auth', createServiceProxy('user', services.user, { '^/api/auth': '/api/auth' }));

// ======================
// User Routes
// ======================
router.use('/users/:id/profile', optionalAuth);
router.use('/users', authenticate);
router.use('/users', createServiceProxy('user', services.user, { '^/api/users': '/api/users' }));

// ======================
// Video Routes
// ======================
router.get('/videos/:id', optionalAuth, createServiceProxy('video', services.video, { '^/api/videos': '/api/videos' }));
router.get('/videos', optionalAuth, createServiceProxy('video', services.video, { '^/api/videos': '/api/videos' }));
router.post('/videos', authenticate, uploadRateLimiter, createServiceProxy('video', services.video, { '^/api/videos': '/api/videos' }));
router.patch('/videos/:id', authenticate, createServiceProxy('video', services.video, { '^/api/videos': '/api/videos' }));
router.delete('/videos/:id', authenticate, createServiceProxy('video', services.video, { '^/api/videos': '/api/videos' }));

// ======================
// Recommendations Routes
// ======================
router.get('/recommendations', optionalAuth, createServiceProxy('recommendation', services.recommendation, { '^/api/recommendations': '/api/recommendations' }));
router.get('/recommendations/personalized', authenticate, createServiceProxy('recommendation', services.recommendation, { '^/api/recommendations': '/api/recommendations' }));

// ======================
// Comment Routes
// ======================
router.get('/videos/:videoId/comments', optionalAuth, createServiceProxy('comment', services.comment, { '^/api': '/api' }));
router.post('/videos/:videoId/comments', authenticate, createServiceProxy('comment', services.comment, { '^/api': '/api' }));
router.patch('/comments/:id', authenticate, createServiceProxy('comment', services.comment, { '^/api/comments': '/api/comments' }));
router.delete('/comments/:id', authenticate, createServiceProxy('comment', services.comment, { '^/api/comments': '/api/comments' }));

// ======================
// Like/Dislike Routes
// ======================
router.post('/videos/:videoId/like', authenticate, createServiceProxy('like', services.like, { '^/api': '/api' }));
router.delete('/videos/:videoId/like', authenticate, createServiceProxy('like', services.like, { '^/api': '/api' }));
router.post('/videos/:videoId/dislike', authenticate, createServiceProxy('like', services.like, { '^/api': '/api' }));
router.post('/comments/:commentId/like', authenticate, createServiceProxy('like', services.like, { '^/api': '/api' }));

// ======================
// Subscription Routes
// ======================
router.post('/channels/:channelId/subscribe', authenticate, createServiceProxy('subscription', services.subscription, { '^/api': '/api' }));
router.delete('/channels/:channelId/subscribe', authenticate, createServiceProxy('subscription', services.subscription, { '^/api': '/api' }));
router.get('/subscriptions', authenticate, createServiceProxy('subscription', services.subscription, { '^/api/subscriptions': '/api/subscriptions' }));

// ======================
// Channel Routes
// ======================
router.get('/channels/:id', optionalAuth, createServiceProxy('user', services.user, { '^/api/channels': '/api/channels' }));
router.patch('/channels/:id', authenticate, createServiceProxy('user', services.user, { '^/api/channels': '/api/channels' }));

// ======================
// Analytics Routes
// ======================
router.post('/analytics/view', optionalAuth, createServiceProxy('analytics', services.analytics, { '^/api/analytics': '/api/analytics' }));
router.post('/analytics/event', optionalAuth, createServiceProxy('analytics', services.analytics, { '^/api/analytics': '/api/analytics' }));
router.get('/analytics/dashboard', authenticate, createServiceProxy('analytics', services.analytics, { '^/api/analytics': '/api/analytics' }));

// ======================
// Search Routes
// ======================
router.get('/search', optionalAuth, createServiceProxy('video', services.video, { '^/api/search': '/api/search' }));

// ======================
// Notification Routes
// ======================
router.get('/notifications', authenticate, createServiceProxy('user', services.user, { '^/api/notifications': '/api/notifications' }));
router.get('/notifications/unread', authenticate, createServiceProxy('user', services.user, { '^/api/notifications': '/api/notifications' }));
router.patch('/notifications/:id/read', authenticate, createServiceProxy('user', services.user, { '^/api/notifications': '/api/notifications' }));
router.patch('/notifications/read-all', authenticate, createServiceProxy('user', services.user, { '^/api/notifications': '/api/notifications' }));
router.delete('/notifications/:id', authenticate, createServiceProxy('user', services.user, { '^/api/notifications': '/api/notifications' }));
router.get('/notifications/preferences/:channelId', authenticate, createServiceProxy('user', services.user, { '^/api/notifications': '/api/notifications' }));
router.put('/notifications/preferences/:channelId', authenticate, createServiceProxy('user', services.user, { '^/api/notifications': '/api/notifications' }));

// ======================
// Event Routes
// ======================
router.use('/events', createServiceProxy('user', services.user, { '^/api/events': '/api/events' }));

// ======================
// Live Chat Routes
// ======================
router.get('/live/:videoId/chat', optionalAuth, createServiceProxy('user', services.user, { '^/api/live': '/api/live' }));
router.post('/live/:videoId/chat', authenticate, createServiceProxy('user', services.user, { '^/api/live': '/api/live' }));

logger.info('API Gateway routes configured');
