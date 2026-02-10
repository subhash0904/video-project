import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import config from '../config/env.js';
import { AppError } from './errorHandler.js';
import { prisma } from '../config/db.js';

// ============================================
// Types
// ============================================

export interface JwtPayload {
  userId: string;
  email: string;
}

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
  };
}

// ============================================
// Auth Middleware
// ============================================

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('No token provided', 401);
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    let decoded: JwtPayload;
    try {
      decoded = jwt.verify(token, config.jwtSecret) as JwtPayload;
    } catch (error) {
      throw new AppError('Invalid or expired token', 401);
    }

    // Check if user still exists
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true },
    });

    if (!user) {
      throw new AppError('User no longer exists', 401);
    }

    // Attach user to request
    req.user = {
      userId: user.id,
      email: user.email,
    };

    next();
  } catch (error) {
    next(error);
  }
};

// ============================================
// Optional Auth Middleware (for public routes with optional auth)
// ============================================

export const optionalAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7);

    try {
      const decoded = jwt.verify(token, config.jwtSecret) as JwtPayload;

      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, email: true },
      });

      if (user) {
        req.user = {
          userId: user.id,
          email: user.email,
        };
      }
    } catch (error) {
      // Token invalid, but that's okay for optional auth
    }

    next();
  } catch (error) {
    next(error);
  }
};

// ============================================
// Generate JWT Token
// ============================================

export const generateToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn as string | number,
  } as jwt.SignOptions);
};

export const generateRefreshToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, config.refreshTokenSecret, {
    expiresIn: config.refreshTokenExpiresIn as string | number,
  } as jwt.SignOptions);
};

// ============================================
// Verify Refresh Token
// ============================================

export const verifyRefreshToken = (token: string): JwtPayload => {
  try {
    return jwt.verify(token, config.refreshTokenSecret) as JwtPayload;
  } catch (error) {
    throw new AppError('Invalid refresh token', 401);
  }
};
