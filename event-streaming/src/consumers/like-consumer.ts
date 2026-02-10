import { createConsumer } from '../kafka.js';
import { logger } from '../logger.js';
import { counterAggregator, incrementCounter, cacheDel } from '../redis.js';
import { EventType } from '../types.js';
import { processWithDlq } from '../dlq.js';

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
    eachBatch: async ({ batch, resolveOffset, heartbeat }: any) => {
      const messages = batch.messages;
      
      if (messages.length === 0) return;

      logger.info(`Processing ${messages.length} like events`);

      for (const message of messages) {
        await processWithDlq(TOPIC_LIKES, { partition: batch.partition, offset: message.offset, value: message.value }, async (event: any) => {
          if (event.type === EventType.VIDEO_LIKE) {
            await counterAggregator.increment(`video:${event.videoId}:likes`, 1);
            await incrementCounter(`video:${event.videoId}:likes`, 1);
            await cacheDel(`video:${event.videoId}`);
          }
          if (event.type === EventType.VIDEO_UNLIKE) {
            await counterAggregator.increment(`video:${event.videoId}:likes`, -1);
            await incrementCounter(`video:${event.videoId}:likes`, -1);
            await cacheDel(`video:${event.videoId}`);
          }
          if (event.type === EventType.VIDEO_DISLIKE) {
            await counterAggregator.increment(`video:${event.videoId}:dislikes`, 1);
            await incrementCounter(`video:${event.videoId}:dislikes`, 1);
            await cacheDel(`video:${event.videoId}`);
          }
          if (event.userId && event.videoId) {
            await incrementCounter(`rec:user:${event.userId}:liked`, 1);
          }
        });
        await resolveOffset(message.offset);
        await heartbeat();
      }

      logger.info(`Successfully processed ${messages.length} like events`);
    }
  });
}
