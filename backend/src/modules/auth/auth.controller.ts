import { Response } from 'express';
import { body, validationResult } from 'express-validator';
import * as authService from './auth.service.js';
import { successResponse, errorResponse } from '../../utils/response.js';
import { asyncHandler } from '../../middleware/errorHandler.js';
import { AuthRequest } from '../../middleware/auth.js';

// ============================================
// Validation Rules
// ============================================

export const registerValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('username')
    .isLength({ min: 3, max: 30 })
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username must be 3-30 characters and contain only letters, numbers, and underscores'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters'),
  body('displayName')
    .isLength({ min: 1, max: 50 })
    .withMessage('Display name is required and must be less than 50 characters'),
];

export const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

export const refreshTokenValidation = [
  body('refreshToken').notEmpty().withMessage('Refresh token is required'),
];

export const forgotPasswordValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
];

export const resetPasswordValidation = [
  body('token').notEmpty().withMessage('Reset token is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters'),
];

// ============================================
// Controllers
// ============================================

export const register = asyncHandler(async (req, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return errorResponse(res, 'Validation failed', 400, errors.array());
  }

  const { email, username, password, displayName } = req.body;

  const result = await authService.register({
    email,
    username,
    password,
    displayName,
  });

  return successResponse(res, result, 'Registration successful', 201);
});

export const login = asyncHandler(async (req, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return errorResponse(res, 'Validation failed', 400, errors.array());
  }

  const { email, password } = req.body;

  const result = await authService.login({ email, password });

  return successResponse(res, result, 'Login successful');
});

export const refreshToken = asyncHandler(async (req, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return errorResponse(res, 'Validation failed', 400, errors.array());
  }

  const { refreshToken } = req.body;

  const result = await authService.refreshAccessToken(refreshToken);

  return successResponse(res, result, 'Token refreshed successfully');
});

export const getCurrentUser = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return errorResponse(res, 'Unauthorized', 401);
  }

  const user = await authService.getCurrentUser(req.user.userId);

  return successResponse(res, user, 'User retrieved successfully');
});

export const forgotPassword = asyncHandler(async (req, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return errorResponse(res, 'Validation failed', 400, errors.array());
  }

  const { email } = req.body;

  const result = await authService.requestPasswordReset(email);

  return successResponse(res, result, 'Password reset instructions sent');
});

export const resetPassword = asyncHandler(async (req, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return errorResponse(res, 'Validation failed', 400, errors.array());
  }

  const { token, newPassword } = req.body;

  const result = await authService.resetPassword(token, newPassword);

  return successResponse(res, result, 'Password reset successful');
});
