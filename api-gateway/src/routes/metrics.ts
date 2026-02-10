import { Router, Request, Response } from 'express';
import { getAllCircuitBreakerStats } from '../middleware/circuit-breaker.js';

export const metricsRouter = Router();

metricsRouter.get('/', (req: Request, res: Response) => {
  const metrics = {
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    region: process.env.REGION || 'default',
    circuitBreakers: getAllCircuitBreakerStats()
  };

  res.json(metrics);
});
