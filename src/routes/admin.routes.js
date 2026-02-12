import { Router } from 'express';
import response from '../utils/response.js';
import authMiddleware from '../middlewares/auth.middleware.js';
import requireRole from '../middlewares/role.middleware.js';

const router = Router();

router.use(authMiddleware, requireRole('admin'));

router.get('/profile', (req, res) => {
  return response.success(res, 200, 'Admin profile route is protected', {
    user: req.user,
  });
});

export default router;
