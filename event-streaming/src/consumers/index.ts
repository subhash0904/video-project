import dotenv from 'dotenv';
import http from 'http';
import { logger } from '../logger.js';
import { startViewConsumer } from './view-consumer.js';
import { startLikeConsumer } from './like-consumer.js';
import { startCommentConsumer } from './comment-consumer.js';
import { startSubscriptionConsumer } from './subscription-consumer.js';
import { counterAggregator } from '../redis.js';
import { shutdown as shutdownKafka } from '../kafka.js';

dotenv.config();

const HEALTH_PORT = parseInt(process.env.HEALTH_PORT || '4200');

async function startAllConsumers() {
  logger.info('🚀 Starting all event consumers...');

  try {
    // Start all consumers in parallel
    await Promise.all([
      startViewConsumer(),
      startLikeConsumer(),
      startCommentConsumer(),
      startSubscriptionConsumer()
    ]);

    // Start health endpoint for Docker health checks
    http.createServer((_req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('ok');
    }).listen(HEALTH_PORT, () => {
      logger.info(`✅ Health endpoint listening on :${HEALTH_PORT}/`);
    });

    logger.info('✅ All event consumers started successfully');
  } catch (error) {
    logger.error('Failed to start consumers:', error);
    process.exit(1);
  }
}

// Graceful shutdown
async function gracefulShutdown() {
  logger.info('Received shutdown signal, closing consumers...');

  try {
    await counterAggregator.shutdown();
    await shutdownKafka();
    logger.info('All consumers shutdown gracefully');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
}

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Start consumers
startAllConsumers().catch((error) => {
  logger.error('Fatal error:', error);
  process.exit(1);
});
