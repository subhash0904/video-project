import { Router, Request, Response } from 'express';
import { rateLimitRedis } from '../middleware/rate-limiter.js';

export const healthCheck = Router();

healthCheck.get('/', async (req: Request, res: Response) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    region: process.env.REGION || 'default',
    services: {
      redis: 'unknown'
    }
  };

  try {
    await rateLimitRedis.ping();
    health.services.redis = 'healthy';
  } catch (error) {
    health.services.redis = 'unhealthy';
    health.status = 'degraded';
  }

  const statusCode = health.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(health);
});
