import { Router } from 'express';
import * as authController from './auth.controller.js';
import { authenticate } from '../../middleware/auth.js';
import passport from '../../config/passport.js';
import twoFactorRoutes from './twoFactor.routes.js';

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

// Google OAuth routes
router.get(
  '/google',
  passport.authenticate('google', { 
    scope: ['profile', 'email'],
    session: false 
  })
);

router.get(
  '/google/callback',
  passport.authenticate('google', { 
    session: false,
    failureRedirect: '/auth/error'
  }),
  authController.googleCallback
);

// Protected routes
router.get('/me', authenticate, authController.getCurrentUser);

// Two-Factor Authentication routes
router.use('/2fa', twoFactorRoutes);

export default router;
