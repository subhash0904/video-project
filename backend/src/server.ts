import app from './app.js';
import config from './config/env.js';
import { connectDatabase } from './config/db.js';
import { createServer } from 'http';
import { CommentBroadcaster } from './realtime/commentBroadcaster.js';
import { eventBus } from './services/eventBus.service.js';
import { startEventConsumers } from './modules/events/event.consumer.js';
import { notificationService } from './services/notification.service.js';
import { videoProcessingService } from './services/videoProcessing.service.js';
import logger from './utils/logger.js';

// ============================================
// Start Server with WebSocket Support
// ============================================

async function startServer() {
  try {
    // Connect to database
    await connectDatabase();

    // Create HTTP server for Express + WebSocket
    const httpServer = createServer(app);

    // Initialize real-time comment broadcaster
    const commentBroadcaster = new CommentBroadcaster(httpServer);
    
    // Store in app locals for use in routes
    app.locals.commentBroadcaster = commentBroadcaster;

    // Wire notification service WebSocket push
    notificationService.setWsEmitter((userId: string, notification: unknown) => {
      const io = commentBroadcaster.getIO();
      if (io) {
        io.to(`user-${userId}`).emit('notification', notification);
      }
    });

    // Wire video processing service status emitter
    videoProcessingService.setStatusEmitter((userId: string, status: unknown) => {
      const io = commentBroadcaster.getIO();
      if (io) {
        io.to(`user-${userId}`).emit('processing-status', status);
      }
    });

    // Initialize event bus & consumers (YouTube architecture backbone)
    await eventBus.init();
    await startEventConsumers();
    logger.info('📡 Event-driven architecture initialised');

    // Start server
    httpServer.listen(config.port, () => {
      logger.info(`✅ Server running on ${config.apiUrl}`);
      logger.info(`📊 Environment: ${config.nodeEnv}`);
      logger.info(`🔗 Frontend URL: ${config.frontendUrl}`);
      logger.info(`🔌 WebSocket: ws://localhost:${config.port}`);
      logger.info('\n📋 Available routes:');
      logger.info('   - POST   /api/auth/register');
      logger.info('   - POST   /api/auth/login');
      logger.info('   - GET    /api/auth/me');
      logger.info('   - GET    /api/videos/feed');
      logger.info('   - GET    /api/videos/:id');
      logger.info('   - POST   /api/videos/upload');
      logger.info('   - GET    /api/channels/:id');
      logger.info('   - GET    /api/users/subscriptions');
      logger.info('   - GET    /api/recommendations/personalized');
      logger.info('   - POST   /api/analytics/view');
      logger.info('\n🚀 Backend is ready!\n');
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  logger.error('Unhandled Rejection:', error);
  process.exit(1);
});

startServer();
