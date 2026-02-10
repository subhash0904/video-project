import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';

export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  logger.error('API Gateway Error:', {
    message: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method
  });

  // Circuit breaker open
  if (error.message.includes('Circuit breaker is OPEN')) {
    res.status(503).json({
      success: false,
      message: 'Service temporarily unavailable',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
    return;
  }

  // Timeout errors
  if (error.message.includes('Timeout')) {
    res.status(504).json({
      success: false,
      message: 'Service timeout',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
    return;
  }

  // Default error
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
};
