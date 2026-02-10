import { createConsumer } from '../kafka.js';
import { logger } from '../logger.js';
import { counterAggregator, incrementCounter, cacheSet, cacheDel } from '../redis.js';
import { EventType } from '../types.js';
import { processWithDlq } from '../dlq.js';

const TOPIC_VIEWS = process.env.TOPIC_VIDEO_VIEWS || 'video.views';
const BATCH_SIZE = parseInt(process.env.BATCH_SIZE || '100');
const BATCH_TIMEOUT = parseInt(process.env.BATCH_TIMEOUT || '5000');

export async function startViewConsumer(): Promise<void> {
  const consumer = await createConsumer('view-processor');

  await consumer.subscribe({
    topic: TOPIC_VIEWS,
    fromBeginning: false
  });

  logger.info(`View consumer started for topic: ${TOPIC_VIEWS}`);

  await consumer.run({
    autoCommit: true,
    autoCommitInterval: 5000,
    eachBatchAutoResolve: true,
    eachBatch: async ({ batch, resolveOffset, heartbeat }: any) => {
      const messages = batch.messages;
      
      if (messages.length === 0) return;

      logger.info(`Processing ${messages.length} view events`);

      for (const message of messages) {
        await processWithDlq(TOPIC_VIEWS, { partition: batch.partition, offset: message.offset, value: message.value }, async (event: any) => {
          if (event.type === EventType.VIDEO_VIEW) {
            await counterAggregator.increment(`video:${event.videoId}:views`, 1);
            await incrementCounter(`video:${event.videoId}:views`, 1);
            const today = new Date().toISOString().split('T')[0];
            await incrementCounter(`video:${event.videoId}:views:${today}`, 1);
            await cacheDel(`video:${event.videoId}`);
            if (event.userId) {
              await incrementCounter(`user:${event.userId}:watched`, 1);
            }
          }
        });
        await resolveOffset(message.offset);
        await heartbeat();
      }

      logger.info(`Successfully processed ${messages.length} view events`);
    }
  });
}
