import { Router } from 'express';
import * as twoFactorController from './twoFactor.controller.js';
import { authenticate } from '../../middleware/auth.js';

const router = Router();

// All 2FA routes require authentication except verify (used during login)
router.post('/setup', authenticate, twoFactorController.setupTwoFactor);
router.post('/enable', authenticate, twoFactorController.enableTwoFactor);
router.post('/verify', twoFactorController.verifyTwoFactor); // Public - used during login
router.post('/disable', authenticate, twoFactorController.disableTwoFactor);
router.post('/backup-codes', authenticate, twoFactorController.regenerateBackupCodes);
router.get('/status', authenticate, twoFactorController.getTwoFactorStatus);

export default router;
