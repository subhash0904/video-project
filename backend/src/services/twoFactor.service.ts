import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import crypto from 'crypto';
import { prisma } from '../config/db.js';
import { AppError } from '../middleware/errorHandler.js';
import { encrypt, decrypt, hashData, compareHash } from '../utils/encryption.js';
import config from '../config/env.js';

// ============================================
// TOTP Configuration
// ============================================

// Configure OTP library
authenticator.options = {
  window: 1, // Allow 1 time step before/after current
  step: 30,  // 30 second time step
};

// ============================================
// Types
// ============================================

interface TwoFactorSetupResponse {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
}

// ============================================
// Two-Factor Authentication Service
// ============================================

/**
 * Generate 2FA secret and QR code for user
 */
export async function generateTwoFactorSecret(userId: string): Promise<TwoFactorSetupResponse> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, twoFactorEnabled: true },
  });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  if (user.twoFactorEnabled) {
    throw new AppError('Two-factor authentication is already enabled', 400);
  }

  // Generate secret
  const secret = authenticator.generateSecret();

  // Generate OTP auth URL
  const otpauthUrl = authenticator.keyuri(
    user.email,
    config.appName || 'Video Platform',
    secret
  );

  // Generate QR code
  const qrCodeUrl = await QRCode.toDataURL(otpauthUrl);

  // Generate backup codes
  const backupCodes = generateBackupCodes(10);

  // Store encrypted secret and backup codes (not enabled yet)
  const encryptedSecret = encrypt(secret);
  const hashedBackupCodes = backupCodes.map(code => hashData(code));
  const encryptedBackupCodes = encrypt(JSON.stringify(hashedBackupCodes));

  await prisma.user.update({
    where: { id: userId },
    data: {
      twoFactorSecret: encryptedSecret,
      backupCodes: encryptedBackupCodes,
      twoFactorEnabled: false, // Not enabled until verified
    },
  });

  return {
    secret,
    qrCodeUrl,
    backupCodes,
  };
}

/**
 * Verify TOTP token and enable 2FA
 */
export async function enableTwoFactor(userId: string, token: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { twoFactorSecret: true, twoFactorEnabled: true },
  });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  if (user.twoFactorEnabled) {
    throw new AppError('Two-factor authentication is already enabled', 400);
  }

  if (!user.twoFactorSecret) {
    throw new AppError('Two-factor secret not found. Please generate a new secret.', 400);
  }

  // Decrypt and verify token
  const secret = decrypt(user.twoFactorSecret);
  const isValid = authenticator.verify({ token, secret });

  if (!isValid) {
    throw new AppError('Invalid verification code', 400);
  }

  // Enable 2FA
  await prisma.user.update({
    where: { id: userId },
    data: { twoFactorEnabled: true },
  });

  return true;
}

/**
 * Verify TOTP token during login
 */
export async function verifyTwoFactorToken(userId: string, token: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { 
      twoFactorSecret: true, 
      twoFactorEnabled: true,
      backupCodes: true,
    },
  });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  if (!user.twoFactorEnabled || !user.twoFactorSecret) {
    throw new AppError('Two-factor authentication is not enabled', 400);
  }

  // Decrypt secret
  const secret = decrypt(user.twoFactorSecret);

  // Verify TOTP token
  const isValidTOTP = authenticator.verify({ token, secret });

  if (isValidTOTP) {
    return true;
  }

  // If TOTP fails, try backup codes
  if (user.backupCodes) {
    const hashedBackupCodes = JSON.parse(decrypt(user.backupCodes)) as string[];
    
    // Check if token matches any backup code
    const matchIndex = hashedBackupCodes.findIndex(hashedCode => 
      compareHash(token, hashedCode)
    );

    if (matchIndex !== -1) {
      // Remove used backup code
      hashedBackupCodes.splice(matchIndex, 1);
      
      await prisma.user.update({
        where: { id: userId },
        data: {
          backupCodes: encrypt(JSON.stringify(hashedBackupCodes)),
        },
      });

      return true;
    }
  }

  return false;
}

/**
 * Disable 2FA for user
 */
export async function disableTwoFactor(userId: string, token: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { twoFactorSecret: true, twoFactorEnabled: true },
  });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  if (!user.twoFactorEnabled) {
    throw new AppError('Two-factor authentication is not enabled', 400);
  }

  if (!user.twoFactorSecret) {
    throw new AppError('Two-factor secret not found', 400);
  }

  // Verify token before disabling
  const secret = decrypt(user.twoFactorSecret);
  const isValid = authenticator.verify({ token, secret });

  if (!isValid) {
    throw new AppError('Invalid verification code', 400);
  }

  // Disable 2FA and remove secrets
  await prisma.user.update({
    where: { id: userId },
    data: {
      twoFactorEnabled: false,
      twoFactorSecret: null,
      backupCodes: null,
    },
  });

  return true;
}

/**
 * Generate new backup codes
 */
export async function regenerateBackupCodes(userId: string, token: string): Promise<string[]> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { twoFactorSecret: true, twoFactorEnabled: true },
  });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  if (!user.twoFactorEnabled || !user.twoFactorSecret) {
    throw new AppError('Two-factor authentication is not enabled', 400);
  }

  // Verify token
  const secret = decrypt(user.twoFactorSecret);
  const isValid = authenticator.verify({ token, secret });

  if (!isValid) {
    throw new AppError('Invalid verification code', 400);
  }

  // Generate new backup codes
  const backupCodes = generateBackupCodes(10);
  const hashedBackupCodes = backupCodes.map(code => hashData(code));
  const encryptedBackupCodes = encrypt(JSON.stringify(hashedBackupCodes));

  await prisma.user.update({
    where: { id: userId },
    data: { backupCodes: encryptedBackupCodes },
  });

  return backupCodes;
}

/**
 * Check if user has 2FA enabled
 */
export async function isTwoFactorEnabled(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { twoFactorEnabled: true },
  });

  return user?.twoFactorEnabled || false;
}

/**
 * Get 2FA status for user
 */
export async function getTwoFactorStatus(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      twoFactorEnabled: true,
      backupCodes: true,
    },
  });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  let remainingBackupCodes = 0;
  if (user.backupCodes) {
    try {
      const codes = JSON.parse(decrypt(user.backupCodes)) as string[];
      remainingBackupCodes = codes.length;
    } catch (error) {
      remainingBackupCodes = 0;
    }
  }

  return {
    enabled: user.twoFactorEnabled,
    remainingBackupCodes,
  };
}

// ============================================
// Helper Functions
// ============================================

/**
 * Generate backup codes
 */
function generateBackupCodes(count: number = 10): string[] {
  const codes: string[] = [];
  
  for (let i = 0; i < count; i++) {
    // Generate 8-character alphanumeric code
    const code = crypto.randomBytes(4).toString('hex').toUpperCase();
    codes.push(code);
  }

  return codes;
}
