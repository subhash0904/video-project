import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import Redis from 'ioredis';
import { logger } from '../utils/logger.js';

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: 3
});

redis.on('error', (err) => {
  logger.error('Redis connection error:', err);
});

redis.on('connect', () => {
  logger.info('Redis connected for rate limiting');
});

// Base rate limiter configuration
export const rateLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    // @ts-ignore - Redis client compatibility
    client: redis,
    prefix: 'rl:',
  }),
  message: {
    success: false,
    message: 'Too many requests, please try again later.'
  },
  // Skip rate limiting for health checks
  skip: (req) => req.path === '/health' || req.path === '/metrics'
});

// Strict rate limiter for authentication endpoints
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    // @ts-ignore
    client: redis,
    prefix: 'rl:auth:',
  }),
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.'
  }
});

// Upload rate limiter
export const uploadRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 uploads per hour
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    // @ts-ignore
    client: redis,
    prefix: 'rl:upload:',
  }),
  message: {
    success: false,
    message: 'Upload limit exceeded, please try again later.'
  }
});

// API key rate limiter (for high-volume clients)
export const apiKeyRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 1000, // 1000 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.headers['x-api-key'] as string || req.ip || 'unknown';
  },
  store: new RedisStore({
    // @ts-ignore
    client: redis,
    prefix: 'rl:apikey:',
  })
});

export { redis as rateLimitRedis };
