import dotenv from 'dotenv';
import http from 'http';
import { logger } from './logger.js';
import { getProducer } from './kafka.js';
import { counterAggregator } from './redis.js';

dotenv.config();

const HEALTH_PORT = parseInt(process.env.HEALTH_PORT || '4200');

async function main() {
  logger.info('🎬 Event Streaming Service starting...');

  try {
    // Initialize Kafka producer
    await getProducer();
    logger.info('✅ Kafka producer initialized');

    // Counter aggregator is already initialized
    logger.info('✅ Counter aggregator initialized');

    // Minimal HTTP server for container health checks
    http.createServer((_req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('ok');
    }).listen(HEALTH_PORT, () => {
      logger.info(`✅ Health endpoint listening on :${HEALTH_PORT}/`);
    });

    logger.info('✅ Event Streaming Service ready');
    logger.info('💡 To start consumers, run: pnpm consumer');
  } catch (error) {
    logger.error('Failed to start event streaming service:', error);
    process.exit(1);
  }
}

// Graceful shutdown
async function shutdown() {
  logger.info('Shutting down event streaming service...');
  await counterAggregator.shutdown();
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

main();
