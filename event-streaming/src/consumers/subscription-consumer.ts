import { createConsumer } from '../kafka.js';
import { logger } from '../logger.js';
import { incrementCounter, cacheDel } from '../redis.js';
import { EventType } from '../types.js';

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
    eachBatch: async ({ batch, resolveOffset, heartbeat }) => {
      const messages = batch.messages;
      
      if (messages.length === 0) return;

      logger.info(`Processing ${messages.length} subscription events`);

      try {
        for (const message of messages) {
          const event = JSON.parse(message.value!.toString());
          
          if (event.type === EventType.SUBSCRIPTION_CREATE) {
            // Increment subscriber count
            await incrementCounter(`channel:${event.channelId}:subscribers`, 1);
            
            // Invalidate channel cache
            await cacheDel(`channel:${event.channelId}`);
            
            // Track user subscriptions
            if (event.userId) {
              await incrementCounter(`user:${event.userId}:subscriptions`, 1);
            }
          }
          
          if (event.type === EventType.SUBSCRIPTION_DELETE) {
            await incrementCounter(`channel:${event.channelId}:subscribers`, -1);
            await cacheDel(`channel:${event.channelId}`);
            
            if (event.userId) {
              await incrementCounter(`user:${event.userId}:subscriptions`, -1);
            }
          }

          await resolveOffset(message.offset);
          await heartbeat();
        }

        logger.info(`Successfully processed ${messages.length} subscription events`);
      } catch (error) {
        logger.error('Error processing subscription events:', error);
        throw error;
      }
    }
  });
}
