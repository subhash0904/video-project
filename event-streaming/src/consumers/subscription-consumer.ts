import { createConsumer } from '../kafka.js';
import { logger } from '../logger.js';
import { incrementCounter, cacheDel } from '../redis.js';
import { EventType } from '../types.js';
import { processWithDlq } from '../dlq.js';
import { incrementChannelSubscribers } from '../db.js';

const TOPIC_SUBSCRIPTIONS = process.env.TOPIC_SUBSCRIPTIONS || 'channel.subscriptions';

export async function startSubscriptionConsumer(): Promise<void> {
  const consumer = await createConsumer('subscription-processor');

  await consumer.subscribe({
    topic: TOPIC_SUBSCRIPTIONS,
    fromBeginning: false
  });

  logger.info(`Subscription consumer started for topic: ${TOPIC_SUBSCRIPTIONS}`);

  await consumer.run({
    autoCommit: true,
    autoCommitInterval: 5000,
    eachBatch: async ({ batch, resolveOffset, heartbeat }: any) => {
      const messages = batch.messages;
      
      if (messages.length === 0) return;

      logger.info(`Processing ${messages.length} subscription events`);

      for (const message of messages) {
        await processWithDlq(TOPIC_SUBSCRIPTIONS, { partition: batch.partition, offset: message.offset, value: message.value }, async (event: any) => {
          if (event.type === EventType.SUBSCRIPTION_CREATE) {
            await incrementCounter(`channel:${event.channelId}:subscribers`, 1);
            await cacheDel(`channel:${event.channelId}`);
            await incrementChannelSubscribers(event.channelId, 1);
            if (event.userId) {
              await incrementCounter(`user:${event.userId}:subscriptions`, 1);
            }
          }
          if (event.type === EventType.SUBSCRIPTION_DELETE) {
            await incrementCounter(`channel:${event.channelId}:subscribers`, -1);
            await cacheDel(`channel:${event.channelId}`);
            await incrementChannelSubscribers(event.channelId, -1);
            if (event.userId) {
              await incrementCounter(`user:${event.userId}:subscriptions`, -1);
            }
          }
        });
        await resolveOffset(message.offset);
        await heartbeat();
      }

      logger.info(`Successfully processed ${messages.length} subscription events`);
    }
  });
}
