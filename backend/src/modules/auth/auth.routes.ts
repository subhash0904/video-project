import { Router } from 'express';
import * as authController from './auth.controller.js';
import { authenticate } from '../../middleware/auth.js';

const router = Router();

// Public routes
router.post(
  '/register',
  authController.registerValidation,
  authController.register
);

router.post(
  '/login',
  authController.loginValidation,
  authController.login
);

router.post(
  '/refresh',
  authController.refreshTokenValidation,
  authController.refreshToken
);

router.post(
  '/forgot-password',
  authController.forgotPasswordValidation,
  authController.forgotPassword
);

router.post(
  '/reset-password',
  authController.resetPasswordValidation,
  authController.resetPassword
);

// Protected routes
router.get('/me', authenticate, authController.getCurrentUser);

export default router;
