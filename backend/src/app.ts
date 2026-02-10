import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import config from './config/env.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import logger from './utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import routes
import authRoutes from './modules/auth/auth.routes.js';
import userRoutes from './modules/users/user.routes.js';
import videoRoutes from './modules/videos/video.routes.js';
import channelRoutes from './modules/channels/channel.routes.js';
import analyticsRoutes from './modules/analytics/analytics.routes.js';
import recommendationRoutes from './modules/recommendations/rec.routes.js';
import liveChatRoutes from './modules/videos/live-chat.routes.js';
import notificationRoutes from './modules/notifications/notification.routes.js';
import eventRoutes from './modules/events/event.routes.js';

const app = express();

// ============================================
// Middleware
// ============================================

// CORS
app.use(
  cors({
    origin: config.frontendUrl,
    credentials: true,
  })
);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static file serving for HLS streams and thumbnails
app.use('/hls', express.static(path.join(__dirname, '../../uploads/processed'), {
  setHeaders: (res, filepath) => {
    if (filepath.endsWith('.m3u8')) {
      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    } else if (filepath.endsWith('.ts')) {
      res.setHeader('Content-Type', 'video/mp2t');
    }
  },
}));

app.use('/thumbnails', express.static(path.join(__dirname, '../../uploads/thumbnails')));

// Request logging (development)
if (config.nodeEnv === 'development') {
  app.use((req, _res, next) => {
    logger.info(`${req.method} ${req.path}`);
    next();
  });
}

// ============================================
// Health Check
// ============================================

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
  });
});

app.get('/', (_req, res) => {
  res.json({
    name: 'Video Platform API',
    version: '1.0.0',
    status: 'running',
  });
});

// ============================================
// API Routes
// ============================================

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/live', liveChatRoutes);
app.use('/api/channels', channelRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/events', eventRoutes);

// ============================================
// Error Handling
// ============================================

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
