import { createConsumer } from '../kafka.js';
import { logger } from '../logger.js';
import { counterAggregator, incrementCounter, cacheDel } from '../redis.js';
import { EventType } from '../types.js';

const TOPIC_LIKES = process.env.TOPIC_VIDEO_LIKES || 'video.likes';

export async function startLikeConsumer(): Promise<void> {
  const consumer = await createConsumer('like-processor');

  await consumer.subscribe({
    topic: TOPIC_LIKES,
    fromBeginning: false
  });

  logger.info(`Like consumer started for topic: ${TOPIC_LIKES}`);

  await consumer.run({
    autoCommit: true,
    autoCommitInterval: 5000,
    eachBatch: async ({ batch, resolveOffset, heartbeat }) => {
      const messages = batch.messages;
      
      if (messages.length === 0) return;

      logger.info(`Processing ${messages.length} like events`);

      try {
        for (const message of messages) {
          const event = JSON.parse(message.value!.toString());
          
          // Handle likes
          if (event.type === EventType.VIDEO_LIKE) {
            await counterAggregator.increment(`video:${event.videoId}:likes`, 1);
            await incrementCounter(`video:${event.videoId}:likes`, 1);
            await cacheDel(`video:${event.videoId}`);
          }
          
          // Handle unlikes
          if (event.type === EventType.VIDEO_UNLIKE) {
            await counterAggregator.increment(`video:${event.videoId}:likes`, -1);
            await incrementCounter(`video:${event.videoId}:likes`, -1);
            await cacheDel(`video:${event.videoId}`);
          }
          
          // Handle dislikes
          if (event.type === EventType.VIDEO_DISLIKE) {
            await counterAggregator.increment(`video:${event.videoId}:dislikes`, 1);
            await incrementCounter(`video:${event.videoId}:dislikes`, 1);
            await cacheDel(`video:${event.videoId}`);
          }

          // Update recommendation signals
          if (event.userId && event.videoId) {
            await incrementCounter(`rec:user:${event.userId}:liked`, 1);
          }

          await resolveOffset(message.offset);
          await heartbeat();
        }

        logger.info(`Successfully processed ${messages.length} like events`);
      } catch (error) {
        logger.error('Error processing like events:', error);
        throw error;
      }
    }
  });
}
