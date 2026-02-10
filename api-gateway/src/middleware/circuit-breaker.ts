import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';

interface CircuitBreakerOptions {
  timeout: number;
  errorThreshold: number;
  resetTimeout: number;
}

enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN'
}

class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private successCount: number = 0;
  private lastFailureTime: number = 0;
  private nextAttemptTime: number = 0;

  constructor(
    private serviceName: string,
    private options: CircuitBreakerOptions
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (Date.now() < this.nextAttemptTime) {
        throw new Error(`Circuit breaker is OPEN for ${this.serviceName}`);
      }
      this.state = CircuitState.HALF_OPEN;
      logger.info(`Circuit breaker entering HALF_OPEN state for ${this.serviceName}`);
    }

    try {
      const result = await Promise.race([
        fn(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), this.options.timeout)
        )
      ]);

      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;

    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= 2) {
        this.state = CircuitState.CLOSED;
        this.successCount = 0;
        logger.info(`Circuit breaker CLOSED for ${this.serviceName}`);
      }
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === CircuitState.HALF_OPEN) {
      this.state = CircuitState.OPEN;
      this.nextAttemptTime = Date.now() + this.options.resetTimeout;
      logger.warn(`Circuit breaker reopened for ${this.serviceName}`);
      return;
    }

    const errorRate = (this.failureCount / (this.failureCount + this.successCount)) * 100;

    if (errorRate >= this.options.errorThreshold) {
      this.state = CircuitState.OPEN;
      this.nextAttemptTime = Date.now() + this.options.resetTimeout;
      logger.error(`Circuit breaker OPEN for ${this.serviceName} (error rate: ${errorRate.toFixed(2)}%)`);
    }
  }

  getState(): CircuitState {
    return this.state;
  }

  getStats() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime
    };
  }
}

// Circuit breakers for each service
const circuitBreakers = new Map<string, CircuitBreaker>();

const defaultOptions: CircuitBreakerOptions = {
  timeout: parseInt(process.env.CIRCUIT_BREAKER_TIMEOUT || '3000'),
  errorThreshold: parseInt(process.env.CIRCUIT_BREAKER_ERROR_THRESHOLD || '50'),
  resetTimeout: parseInt(process.env.CIRCUIT_BREAKER_RESET_TIMEOUT || '30000')
};

export function getCircuitBreaker(serviceName: string): CircuitBreaker {
  if (!circuitBreakers.has(serviceName)) {
    circuitBreakers.set(
      serviceName,
      new CircuitBreaker(serviceName, defaultOptions)
    );
  }
  return circuitBreakers.get(serviceName)!;
}

export function getAllCircuitBreakerStats() {
  const stats: Record<string, any> = {};
  circuitBreakers.forEach((breaker, name) => {
    stats[name] = breaker.getStats();
  });
  return stats;
}

// Middleware to add circuit breaker to request
export const circuitBreakerMiddleware = (serviceName: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    req.circuitBreaker = getCircuitBreaker(serviceName);
    next();
  };
};

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      circuitBreaker?: CircuitBreaker;
    }
  }
}
