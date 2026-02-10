import bcrypt from 'bcrypt';
import { prisma } from '../../config/db.js';
import { AppError } from '../../middleware/errorHandler.js';
import {
  generateToken,
  generateRefreshToken,
  verifyRefreshToken,
  JwtPayload,
} from '../../middleware/auth.js';
import config from '../../config/env.js';

// ============================================
// Types
// ============================================

interface RegisterData {
  email: string;
  username: string;
  password: string;
  displayName: string;
}

interface LoginData {
  email: string;
  password: string;
}

// ============================================
// Register User
// ============================================

export const register = async (data: RegisterData) => {
  const { email, username, password, displayName } = data;

  // Check if user already exists
  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [{ email }, { username }],
    },
  });

  if (existingUser) {
    if (existingUser.email === email) {
      throw new AppError('Email already registered', 409);
    }
    if (existingUser.username === username) {
      throw new AppError('Username already taken', 409);
    }
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, config.bcryptRounds);

  // Create user and channel in a transaction
  const user = await prisma.$transaction(async (tx: any) => {
    const newUser = await tx.user.create({
      data: {
        email,
        username,
        passwordHash,
        displayName,
        avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(
          displayName
        )}&size=200&background=random`,
      },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        createdAt: true,
      },
    });

    // Create channel for user
    await tx.channel.create({
      data: {
        userId: newUser.id,
        handle: `@${username}`,
        name: displayName,
        avatarUrl: newUser.avatarUrl,
      },
    });

    return newUser;
  });

  // Generate tokens
  const payload: JwtPayload = { userId: user.id, email: user.email };
  const accessToken = generateToken(payload);
  const refreshToken = generateRefreshToken(payload);

  return {
    user,
    accessToken,
    refreshToken,
  };
};

// ============================================
// Login User
// ============================================

export const login = async (data: LoginData) => {
  const { email, password } = data;

  // Find user
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      username: true,
      displayName: true,
      avatarUrl: true,
      passwordHash: true,
      twoFactorEnabled: true,
      createdAt: true,
    },
  });

  if (!user) {
    throw new AppError('Invalid email or password', 401);
  }

  // Check if user has a password (not OAuth-only)
  if (!user.passwordHash) {
    throw new AppError('Please sign in with Google', 400);
  }

  // Verify password
  const isValidPassword = await bcrypt.compare(password, user.passwordHash);

  if (!isValidPassword) {
    throw new AppError('Invalid email or password', 401);
  }

  // If 2FA is enabled, return partial response
  if (user.twoFactorEnabled) {
    return {
      requiresTwoFactor: true,
      userId: user.id,
      message: 'Two-factor authentication required',
    };
  }

  // Update last login
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  // Generate tokens
  const payload: JwtPayload = { userId: user.id, email: user.email };
  const accessToken = generateToken(payload);
  const refreshToken = generateRefreshToken(payload);

  // Remove password hash from response
  const { passwordHash: _, twoFactorEnabled: __, ...userWithoutPassword } = user;

  return {
    requiresTwoFactor: false,
    user: userWithoutPassword,
    accessToken,
    refreshToken,
  };
};

// ============================================
// Refresh Token
// ============================================

export const refreshAccessToken = async (refreshToken: string) => {
  // Verify refresh token
  const payload = verifyRefreshToken(refreshToken);

  // Check if user exists
  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
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

  // Generate new tokens
  const newPayload: JwtPayload = { userId: user.id, email: user.email };
  const newAccessToken = generateToken(newPayload);
  const newRefreshToken = generateRefreshToken(newPayload);

  return {
    user,
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
  };
};

// ============================================
// Get Current User
// ============================================

export const getCurrentUser = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      username: true,
      displayName: true,
      avatarUrl: true,
      language: true,
      theme: true,
      restrictedMode: true,
      emailVerified: true,
      createdAt: true,
      channel: {
        select: {
          id: true,
          handle: true,
          name: true,
          subscriberCount: true,
          verified: true,
        },
      },
    },
  });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  return user;
};

// ============================================
// Request Password Reset
// ============================================

export const requestPasswordReset = async (email: string) => {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    // Don't reveal if user exists
    return { message: 'If the email exists, a reset link has been sent' };
  }

  // Generate reset token
  const resetToken = generateToken({ userId: user.id, email: user.email });
  const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

  // Save reset token
  await prisma.user.update({
    where: { id: user.id },
    data: {
      resetToken,
      resetTokenExpiry,
    },
  });

  // TODO: Send email with reset token
  // For now, return token (in production, send via email)
  console.log('Password reset token:', resetToken);

  return { message: 'If the email exists, a reset link has been sent' };
};

// ============================================
// Reset Password
// ============================================

export const resetPassword = async (token: string, newPassword: string) => {
  // Verify token
  let payload: JwtPayload;
  try {
    payload = verifyRefreshToken(token);
  } catch (error) {
    throw new AppError('Invalid or expired reset token', 400);
  }

  // Find user with valid reset token
  const user = await prisma.user.findFirst({
    where: {
      id: payload.userId,
      resetToken: token,
      resetTokenExpiry: {
        gt: new Date(),
      },
    },
  });

  if (!user) {
    throw new AppError('Invalid or expired reset token', 400);
  }

  // Hash new password
  const passwordHash = await bcrypt.hash(newPassword, config.bcryptRounds);

  // Update password and clear reset token
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      resetToken: null,
      resetTokenExpiry: null,
    },
  });

  return { message: 'Password reset successful' };
};
