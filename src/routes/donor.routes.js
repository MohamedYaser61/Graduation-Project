import { Router } from 'express';
import authMiddleware from '../middlewares/auth.middleware.js';
import requireRole from '../middlewares/role.middleware.js';
import * as donorController from '../controllers/donor.controller.js';

const router = Router();

// Apply auth and role middleware to all donor routes
router.use(authMiddleware, requireRole('donor'));

// Profile routes
router.get('/profile', donorController.getProfile);
router.put('/profile', donorController.updateProfile);

// Request and matching routes
router.get('/requests', donorController.getRequests);
router.get('/matches', donorController.getMatches);

// Donation response route
router.post('/respond/:requestId', donorController.respondToRequest);

// Donation history
router.get('/history', donorController.getDonationHistory);

// Availability management
router.put('/availability', donorController.updateAvailability);

export default router;
