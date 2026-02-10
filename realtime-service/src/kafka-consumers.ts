import { Server } from 'socket.io';
import { Kafka, logLevel } from 'kafkajs';
import { logger } from './logger.js';
import { emitVideoUpdate } from './handlers/video-handlers.js';
import { emitChatMessage } from './handlers/chat-handlers.js';
import { sendNotification } from './handlers/notification-handlers.js';

const kafka = new Kafka({
  clientId: process.env.KAFKA_CLIENT_ID || 'realtime-service',
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
  logLevel: logLevel.ERROR
});

export async function startKafkaConsumers(io: Server): Promise<void> {
  logger.info('Starting Kafka consumers for real-time updates...');

  // View counter updates
  const viewConsumer = kafka.consumer({
    groupId: `${process.env.KAFKA_GROUP_ID || 'realtime-consumers'}-views`
  });

  await viewConsumer.connect();
  await viewConsumer.subscribe({
    topic: process.env.TOPIC_VIDEO_VIEWS || 'video.views',
    fromBeginning: false
  });

  viewConsumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      try {
        const event = JSON.parse(message.value!.toString());
        
        if (event.videoId) {
          // Emit live view count update to video room
          emitVideoUpdate(io, event.videoId, 'view', {
            videoId: event.videoId,
            timestamp: event.timestamp
          });
        }
      } catch (error) {
        logger.error('Error processing view event:', error);
      }
    }
  });

  // Like/dislike updates
  const likeConsumer = kafka.consumer({
    groupId: `${process.env.KAFKA_GROUP_ID || 'realtime-consumers'}-likes`
  });

  await likeConsumer.connect();
  await likeConsumer.subscribe({
    topic: process.env.TOPIC_VIDEO_LIKES || 'video.likes',
    fromBeginning: false
  });

  likeConsumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      try {
        const event = JSON.parse(message.value!.toString());
        
        if (event.videoId) {
          emitVideoUpdate(io, event.videoId, 'like', {
            videoId: event.videoId,
            type: event.type,
            timestamp: event.timestamp
          });
        }
      } catch (error) {
        logger.error('Error processing like event:', error);
      }
    }
  });

  // Comment updates
  const commentConsumer = kafka.consumer({
    groupId: `${process.env.KAFKA_GROUP_ID || 'realtime-consumers'}-comments`
  });

  await commentConsumer.connect();
  await commentConsumer.subscribe({
    topic: process.env.TOPIC_COMMENTS || 'video.comments',
    fromBeginning: false
  });

  commentConsumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      try {
        const event = JSON.parse(message.value!.toString());
        
        if (event.videoId) {
          emitVideoUpdate(io, event.videoId, 'comment', {
            videoId: event.videoId,
            commentId: event.commentId,
            type: event.type,
            timestamp: event.timestamp
          });
        }
      } catch (error) {
        logger.error('Error processing comment event:', error);
      }
    }
  });

  // Live chat consumer (if separate from comments)
  const chatConsumer = kafka.consumer({
    groupId: `${process.env.KAFKA_GROUP_ID || 'realtime-consumers'}-chat`
  });

  await chatConsumer.connect();
  await chatConsumer.subscribe({
    topic: process.env.TOPIC_LIVE_CHAT || 'live.chat',
    fromBeginning: false
  });

  chatConsumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      try {
        const chatMessage = JSON.parse(message.value!.toString());
        
        if (chatMessage.videoId) {
          emitChatMessage(io, chatMessage.videoId, chatMessage);
        }
      } catch (error) {
        logger.error('Error processing chat message:', error);
      }
    }
  });

  logger.info('✅ All Kafka consumers started for real-time updates');
}
