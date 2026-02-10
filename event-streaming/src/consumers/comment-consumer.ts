import { createConsumer } from '../kafka.js';
import { logger } from '../logger.js';
import { counterAggregator, incrementCounter, cacheDel } from '../redis.js';
import { EventType } from '../types.js';
import { processWithDlq } from '../dlq.js';

const TOPIC_COMMENTS = process.env.TOPIC_COMMENTS || 'video.comments';

export async function startCommentConsumer(): Promise<void> {
  const consumer = await createConsumer('comment-processor');

  await consumer.subscribe({
    topic: TOPIC_COMMENTS,
    fromBeginning: false
  });

  logger.info(`Comment consumer started for topic: ${TOPIC_COMMENTS}`);

  await consumer.run({
    autoCommit: true,
    autoCommitInterval: 5000,
    eachBatch: async ({ batch, resolveOffset, heartbeat }: any) => {
      const messages = batch.messages;
      
      if (messages.length === 0) return;

      logger.info(`Processing ${messages.length} comment events`);

      for (const message of messages) {
        await processWithDlq(TOPIC_COMMENTS, { partition: batch.partition, offset: message.offset, value: message.value }, async (event: any) => {
          if (event.type === EventType.COMMENT_CREATE) {
            await counterAggregator.increment(`video:${event.videoId}:comments`, 1);
            await incrementCounter(`video:${event.videoId}:comments`, 1);
            await cacheDel(`video:${event.videoId}`);
            await cacheDel(`video:${event.videoId}:comments`);
            if (event.userId) {
              await incrementCounter(`user:${event.userId}:comments`, 1);
            }
          }
          if (event.type === EventType.COMMENT_DELETE) {
            await counterAggregator.increment(`video:${event.videoId}:comments`, -1);
            await incrementCounter(`video:${event.videoId}:comments`, -1);
            await cacheDel(`video:${event.videoId}:comments`);
          }
          if (event.type === EventType.COMMENT_LIKE) {
            await incrementCounter(`comment:${event.commentId}:likes`, 1);
          }
        });
        await resolveOffset(message.offset);
        await heartbeat();
      }

      logger.info(`Successfully processed ${messages.length} comment events`);
    }
  });
}
