import { Router } from 'express';
import response from '../utils/response.js';
import authMiddleware from '../middlewares/auth.middleware.js';
import requireRole from '../middlewares/role.middleware.js';

const router = Router();

router.use(authMiddleware, requireRole('hospital'));

router.get('/profile', (req, res) => {
  return response.success(res, 200, 'Hospital profile route is protected', {
    user: req.user,
  });
});

export default router;
