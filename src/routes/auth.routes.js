import { Router } from 'express';
import AUC from '../controllers/auth.controller.js';
import authMiddleware from '../middlewares/auth.middleware.js';

const router = Router();

router.post('/signup', AUC.register);
router.post('/login', AUC.login);
router.post('/logout', AUC.logout);
router.post('/refresh-token', AUC.refreshToken);
router.post('/forgot-password', AUC.forgotPassword);
router.post('/reset-password', AUC.resetPassword);

router.get('/me', authMiddleware, AUC.getMe);
router.get('/verify-email', AUC.verifyEmail);
router.get('/verify-email-token', AUC.verifyEmailToken);
export default router;
