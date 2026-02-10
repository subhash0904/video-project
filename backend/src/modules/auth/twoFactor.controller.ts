import { Request, Response, NextFunction } from 'express';
import * as twoFactorService from '../../services/twoFactor.service.js';
import { AppError } from '../../middleware/errorHandler.js';
import type { JwtPayload } from '../../middleware/auth.js';

// ============================================
// Two-Factor Authentication Controllers
// ============================================

/**
 * Setup 2FA - Generate secret and QR code
 * POST /api/auth/2fa/setup
 */
export async function setupTwoFactor(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      throw new AppError('Authentication required', 401);
    }

    const result = await twoFactorService.generateTwoFactorSecret(userId);

    res.json({
      success: true,
      data: {
        qrCodeUrl: result.qrCodeUrl,
        secret: result.secret,
        backupCodes: result.backupCodes,
      },
      message: 'Scan the QR code with your authenticator app, then verify with a code to enable 2FA',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Enable 2FA - Verify token and activate
 * POST /api/auth/2fa/enable
 */
export async function enableTwoFactor(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    const { token } = req.body;

    if (!userId) {
      throw new AppError('Authentication required', 401);
    }

    if (!token) {
      throw new AppError('Verification token is required', 400);
    }

    await twoFactorService.enableTwoFactor(userId, token);

    res.json({
      success: true,
      message: 'Two-factor authentication has been enabled successfully',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Verify 2FA token during login and issue tokens
 * POST /api/auth/2fa/verify
 */
export async function verifyTwoFactor(req: Request, res: Response, next: NextFunction) {
  try {
    const { userId, token } = req.body;

    if (!userId || !token) {
      throw new AppError('User ID and token are required', 400);
    }

    const isValid = await twoFactorService.verifyTwoFactorToken(userId, token);

    if (!isValid) {
      throw new AppError('Invalid verification code', 400);
    }

    // Get user for token generation
    const { prisma } = await import('../../config/db.js');
    const { generateToken, generateRefreshToken } = await import('../../middleware/auth.js');
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        avatarUrl: true,
      },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Update last login
    await prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    });

    // Generate tokens
    const payload: JwtPayload = { userId: user.id, email: user.email };
    const accessToken = generateToken(payload);
    const refreshToken = generateRefreshToken(payload);

    res.json({
      success: true,
      data: {
        user,
        accessToken,
        refreshToken,
      },
      message: 'Verification successful',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Disable 2FA
 * POST /api/auth/2fa/disable
 */
export async function disableTwoFactor(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    const { token } = req.body;

    if (!userId) {
      throw new AppError('Authentication required', 401);
    }

    if (!token) {
      throw new AppError('Verification token is required', 400);
    }

    await twoFactorService.disableTwoFactor(userId, token);

    res.json({
      success: true,
      message: 'Two-factor authentication has been disabled',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Regenerate backup codes
 * POST /api/auth/2fa/backup-codes
 */
export async function regenerateBackupCodes(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    const { token } = req.body;

    if (!userId) {
      throw new AppError('Authentication required', 401);
    }

    if (!token) {
      throw new AppError('Verification token is required', 400);
    }

    const backupCodes = await twoFactorService.regenerateBackupCodes(userId, token);

    res.json({
      success: true,
      data: { backupCodes },
      message: 'New backup codes generated. Save these codes in a secure location.',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get 2FA status
 * GET /api/auth/2fa/status
 */
export async function getTwoFactorStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      throw new AppError('Authentication required', 401);
    }

    const status = await twoFactorService.getTwoFactorStatus(userId);

    res.json({
      success: true,
      data: status,
    });
  } catch (error) {
    next(error);
  }
}
