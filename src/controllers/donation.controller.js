import response from '../utils/response.js';
import * as donationService from '../services/donation.service.js';
import Donation from '../models/Donation.model.js';
import * as rewardService from '../services/reward.service.js';
import * as activityService from '../services/activity.service.js';
import * as notificationService from '../services/notification.service.js';

export const completeDonation = async (req, res, next) => {
  try {
    const donationId = req.body.donationId || req.query.donationId || req.params.donationId;

    if (!donationId) {
      return response.error(res, 400, 'donationId is required');
    }

    const donation = await donationService.updateDonationStatus(donationId, 'completed', {
      completedDate: req.body.completedDate,
      notes: req.body.notes,
    });

    return response.success(res, 200, 'Donation completed successfully', donation);
  } catch (error) {
    if (error.message === 'Donation not found') {
      return response.error(res, 404, error.message);
    }
    if (error.message === 'Invalid donation status') {
      return response.error(res, 400, error.message);
    }
    next(error);
  }
};

// POST /donations/qr/scan
export const scanQr = async (req, res, next) => {
  try {
    const donorId = req.user?.userId;
    const { donationId, token } = req.body;

    if (!donationId || !token) return response.error(res, 400, 'donationId and token are required');

    const donation = await Donation.findById(donationId);
    if (!donation) return response.error(res, 404, 'Donation not found');

    // Ownership
    if (String(donation.donorId) !== String(donorId)) return response.error(res, 403, 'Not authorized for this donation');

    // Prevent duplicate completion
    if (donation.status === 'completed') return response.success(res, 200, 'Donation already completed', donation);

    // Validate QR token and expiry
    if (!donation.qrToken || donation.qrToken !== token) return response.error(res, 400, 'Invalid QR token');
    if (donation.qrExpires && new Date() > new Date(donation.qrExpires)) return response.error(res, 400, 'QR token expired');

    // Mark completed using donation service (handles rewards, activity triggers)
    const updated = await donationService.updateDonationStatus(donationId, 'completed', { completedDate: new Date() });

    // Fire notifications and activities (service already logs activity and triggers rewards)
    // Send confirmation notification to donor
    notificationService.notifyMilestone(donorId, { id: donationId, title: 'Donation Confirmed', message: 'Thank you for completing your donation!' }).catch(() => {});

    return response.success(res, 200, 'Donation confirmed successfully', updated);
  } catch (error) {
    next(error);
  }
};