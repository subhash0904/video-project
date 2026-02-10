import { Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { logger } from '../logger.js';

export interface AuthenticatedSocket extends Socket {
  data: {
    userId?: string;
    email?: string;
    role?: string;
  };
}

export const authenticateSocket = (socket: Socket, next: (err?: Error) => void) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

    if (!token) {
      // Allow anonymous connections (for public content)
      socket.data = {};
      return next();
    }

    const secret = process.env.JWT_SECRET || 'secret';

    try {
      const decoded = jwt.verify(token, secret) as {
        userId: string;
        email: string;
        role?: string;
      };

      socket.data = {
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role
      };

      logger.debug(`Socket authenticated: ${socket.id}`, { userId: decoded.userId });
      next();
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        logger.warn(`Expired token for socket: ${socket.id}`);
        socket.data = {};
        next(); // Allow connection but mark as unauthenticated
      } else if (error instanceof jwt.JsonWebTokenError) {
        logger.warn(`Invalid token for socket: ${socket.id}`);
        socket.data = {};
        next();
      } else {
        throw error;
      }
    }
  } catch (error) {
    logger.error('Socket authentication error:', error);
    next(new Error('Authentication failed'));
  }
};
