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
  user?: Express.User;
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

    // Verify user exists and get full user data
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { 
        id: true, 
        email: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        googleId: true,
        twoFactorEnabled: true,
        twoFactorSecret: true,
        backupCodes: true,
        createdAt: true,
        updatedAt: true,
        channel: {
          select: {
            id: true,
            name: true,
            handle: true,
            avatarUrl: true,
            bannerUrl: true,
            description: true,
            subscriberCount: true,
            videoCount: true,
            totalViews: true,
            verified: true,
            createdAt: true,
            updatedAt: true,
            userId: true,
          },
        },
      },
    });

    if (!user) {
      throw new AppError('User no longer exists', 401);
    }

    // Attach user to request
    req.user = {
      id: user.id,
      userId: user.id,
      email: user.email,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      googleId: user.googleId,
      twoFactorEnabled: user.twoFactorEnabled,
      twoFactorSecret: user.twoFactorSecret,
      backupCodes: user.backupCodes,
      channel: user.channel,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
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
        select: { 
          id: true, 
          email: true,
          username: true,
          displayName: true,
          avatarUrl: true,
          googleId: true,
          twoFactorEnabled: true,
          twoFactorSecret: true,
          backupCodes: true,
          createdAt: true,
          updatedAt: true,
          channel: {
            select: {
              id: true,
              name: true,
              handle: true,
              avatarUrl: true,
              bannerUrl: true,
              description: true,
              subscriberCount: true,
              videoCount: true,
              totalViews: true,
              verified: true,
              createdAt: true,
              updatedAt: true,
              userId: true,
            },
          },
        },
      });

      if (user) {
        req.user = {
          id: user.id,
          userId: user.id,
          email: user.email,
          username: user.username,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
          googleId: user.googleId,
          twoFactorEnabled: user.twoFactorEnabled,
          twoFactorSecret: user.twoFactorSecret,
          backupCodes: user.backupCodes,
          channel: user.channel,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
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
