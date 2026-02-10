import { Kafka, Producer, Consumer, logLevel } from 'kafkajs';
import { logger } from './logger.js';

const kafka = new Kafka({
  clientId: process.env.KAFKA_CLIENT_ID || 'video-platform-events',
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
  logLevel: logLevel.INFO,
  retry: {
    initialRetryTime: 300,
    retries: 10
  }
});

let producer: Producer | null = null;
let consumers: Map<string, Consumer> = new Map();

export async function getProducer(): Promise<Producer> {
  if (!producer) {
    producer = kafka.producer({
      allowAutoTopicCreation: true,
      transactionTimeout: 30000
    });
    
    await producer.connect();
    logger.info('Kafka producer connected');
  }
  
  return producer;
}

export async function createConsumer(groupId: string): Promise<Consumer> {
  if (consumers.has(groupId)) {
    return consumers.get(groupId)!;
  }

  const consumer = kafka.consumer({
    groupId,
    sessionTimeout: 30000,
    heartbeatInterval: 3000
  });

  await consumer.connect();
  logger.info(`Kafka consumer connected: ${groupId}`);
  
  consumers.set(groupId, consumer);
  return consumer;
}

export async function publishEvent(topic: string, message: any): Promise<void> {
  try {
    const producer = await getProducer();
    
    await producer.send({
      topic,
      messages: [
        {
          key: message.key || Date.now().toString(),
          value: JSON.stringify(message),
          timestamp: Date.now().toString()
        }
      ]
    });

    logger.debug(`Published event to ${topic}`, { messageId: message.id });
  } catch (error) {
    logger.error(`Failed to publish event to ${topic}:`, error);
    throw error;
  }
}

export async function publishBatch(topic: string, messages: any[]): Promise<void> {
  try {
    const producer = await getProducer();
    
    await producer.send({
      topic,
      messages: messages.map(msg => ({
        key: msg.key || Date.now().toString(),
        value: JSON.stringify(msg),
        timestamp: Date.now().toString()
      }))
    });

    logger.debug(`Published ${messages.length} events to ${topic}`);
  } catch (error) {
    logger.error(`Failed to publish batch to ${topic}:`, error);
    throw error;
  }
}

export async function shutdown(): Promise<void> {
  logger.info('Shutting down Kafka connections...');
  
  if (producer) {
    await producer.disconnect();
    producer = null;
  }

  for (const [groupId, consumer] of consumers.entries()) {
    await consumer.disconnect();
    logger.info(`Consumer ${groupId} disconnected`);
  }
  
  consumers.clear();
  logger.info('All Kafka connections closed');
}

// Graceful shutdown
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

export { kafka };
