/**
 * Event Producer — convenience functions called from route handlers
 *
 * Every user action goes through here → EventBus → consumers
 */

import {
  emitVideoViewed,
  emitVideoLiked,
  emitVideoCommented,
  emitVideoShared,
  emitUserSubscribed,
  emitUserSearched,
} from '../../services/eventBus.service.js';

export { emitVideoViewed, emitVideoLiked, emitVideoCommented, emitVideoShared, emitUserSubscribed, emitUserSearched };
