import { Router } from 'express';

const router = Router();

router.post('/signup', signup);
router.post('/login', login);
router.post('/logout', logout);
router.post('/refresh-token', refreshToken);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

router.get('/me', getMe);
router.get('/verify-email', verifyEmail);
router.get('/verify-email-token', verifyEmailToken);
router.get('/verify-email-token', verifyEmailToken);
export default router;