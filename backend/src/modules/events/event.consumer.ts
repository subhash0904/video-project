/**
 * Event Consumer — initialises all downstream consumers
 *
 * Called once at server startup; each consumer attaches to the EventBus.
 */

import { notificationService } from '../../services/notification.service.js';
import { statsService } from '../../services/stats.service.js';
import logger from '../../utils/logger.js';

export async function startEventConsumers() {
  await notificationService.registerEventListeners();
  await statsService.registerEventListeners();
  logger.info('🚀 All event consumers started');
}
