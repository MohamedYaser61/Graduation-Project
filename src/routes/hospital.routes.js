import { Router } from 'express';
import authMiddleware from '../middlewares/auth.middleware.js';
import requireRole from '../middlewares/role.middleware.js';
import * as hospitalController from '../controllers/hospital.controller.js';

const router = Router();

// Apply auth and role middleware to all hospital routes
router.use(authMiddleware, requireRole('hospital'));

// Profile routes
router.get('/profile', hospitalController.getProfile);
router.put('/profile', hospitalController.updateProfile);

// Request management routes
router.post('/request', hospitalController.createRequest);
router.get('/requests', hospitalController.getRequests);
router.get('/requests/:requestId', hospitalController.getRequestDetails);
router.put('/requests/:requestId', hospitalController.updateRequest);
router.delete('/requests/:requestId', hospitalController.deleteRequest);

// Donation tracking
router.get('/donations', hospitalController.getDonations);

export default router;
