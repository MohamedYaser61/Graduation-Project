import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setupTestDB } from '../helpers/db.js';
import { createDonor, createHospital } from '../helpers/factories.js';
import * as donorController from '../../src/controllers/donor.controller.js';
import Donor from '../../src/models/Donor.model.js';
import Appointment from '../../src/models/Appointment.model.js';

// Mock services
vi.mock('../../src/models/Notification.model.js', () => ({ default: { create: vi.fn().mockResolvedValue(null) } }));
vi.mock('../../src/services/activity.service.js', () => ({
  getLatestActivities: vi.fn().mockResolvedValue([]),
}));
vi.mock('../../src/services/donation.service.js', () => ({
  getDonorStats: vi.fn().mockResolvedValue({ totalDonations: 3 }),
  getDonationHistory: vi.fn().mockResolvedValue([]),
}));
vi.mock('../../src/services/reward.service.js', () => ({
  getPointsSummary: vi.fn().mockResolvedValue({ totalPoints: 600 }),
  getDonorBadges: vi.fn().mockResolvedValue([]),
  getPointsHistory: vi.fn().mockResolvedValue([]),
}));

setupTestDB();

describe('Donor Controller', () => {
  describe('Dev 1: Task 1 — getDashboard', () => {
    it('returns dashboard with new shape (userInfo, stats, recentActivity)', async () => {
      const donor = await createDonor({ fullName: 'Ahmed Test', bloodType: 'O+' });

      const res = {
        json: vi.fn(),
        status: vi.fn(),
      };
      res.status.mockReturnValue(res);
      const req = { user: { userId: donor._id } };
      const next = vi.fn();

      await donorController.getDashboard(req, res, next);

      if (next.mock.calls.length > 0) {
        console.error('Error passed to next:', next.mock.calls[0][0]);
      }

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalled();
      const jsonArgs = res.json.mock.calls[0][0];
      expect(jsonArgs.data).toHaveProperty('userInfo');
      expect(jsonArgs.data).toHaveProperty('stats');
      expect(jsonArgs.data).toHaveProperty('recentActivity');
      expect(jsonArgs.data).toHaveProperty('badges');
    });

    it('includes correct fields in userInfo', async () => {
      const donor = await createDonor({ fullName: 'Fatima Test', bloodType: 'A-' });

      const res = {
        json: vi.fn(),
        status: vi.fn(),
      };
      res.status.mockReturnValue(res);
      const req = { user: { userId: donor._id } };
      const next = vi.fn();

      await donorController.getDashboard(req, res, next);

      expect(res.json).toHaveBeenCalled();
      const jsonArgs = res.json.mock.calls[0][0];
      expect(jsonArgs.data.userInfo).toHaveProperty('fullName');
      expect(jsonArgs.data.userInfo).toHaveProperty('bloodType');
      expect(jsonArgs.data.userInfo).toHaveProperty('donationStatus');
      expect(jsonArgs.data.userInfo.fullName).toBe('Fatima Test');
      expect(jsonArgs.data.userInfo.bloodType).toBe('A-');
    });

    it('computes donationStatus as eligible when no pending appointments', async () => {
      const donor = await createDonor();

      const res = {
        json: vi.fn(),
        status: vi.fn(),
      };
      res.status.mockReturnValue(res);
      const req = { user: { userId: donor._id } };
      const next = vi.fn();

      await donorController.getDashboard(req, res, next);

      expect(res.json).toHaveBeenCalled();
      const jsonArgs = res.json.mock.calls[0][0];
      expect(jsonArgs.data.userInfo.donationStatus).toBe('eligible');
    });

    it('computes donationStatus as pending when appointment exists', async () => {
      const donor = await createDonor();
      const hospital = await createHospital();
      const futureDate = new Date(Date.now() + 48 * 60 * 60 * 1000);

      await Appointment.create({
        donorId: donor._id,
        hospitalId: hospital._id,
        appointmentDate: futureDate,
        status: 'pending',
      });

      const res = {
        json: vi.fn(),
        status: vi.fn(),
      };
      res.status.mockReturnValue(res);
      const req = { user: { userId: donor._id } };
      const next = vi.fn();

      await donorController.getDashboard(req, res, next);

      expect(res.json).toHaveBeenCalled();
      const jsonArgs = res.json.mock.calls[0][0];
      expect(jsonArgs.data.userInfo.donationStatus).toBe('pending');
    });

    it('includes stats with totalDonations, points, and livesSaved', async () => {
      const donor = await createDonor();

      const res = {
        json: vi.fn(),
        status: vi.fn(),
      };
      res.status.mockReturnValue(res);
      const req = { user: { userId: donor._id } };
      const next = vi.fn();

      await donorController.getDashboard(req, res, next);

      expect(res.json).toHaveBeenCalled();
      const jsonArgs = res.json.mock.calls[0][0];
      expect(jsonArgs.data.stats).toHaveProperty('totalDonations');
      expect(jsonArgs.data.stats).toHaveProperty('points');
      expect(jsonArgs.data.stats).toHaveProperty('livesSaved');
      expect(jsonArgs.data.stats.totalDonations).toBe(3);
      expect(jsonArgs.data.stats.points).toBe(600);
    });
  });

  describe('Dev 1: Task 5 — getSettings', () => {
    it('returns donor settings with defaults', async () => {
      const donor = await createDonor();

      const req = { user: { userId: donor._id } };
      const res = {
        json: vi.fn().mockReturnThis(),
        status: vi.fn().mockReturnThis(),
      };
      const next = vi.fn();

      await donorController.getSettings(req, res, next);

      expect(res.json).toHaveBeenCalled();
      const callArgs = res.json.mock.calls[0][0];
      expect(callArgs.data.settings).toBeTruthy();
      expect(callArgs.data.settings.pushNotifications).toBe(true);
      expect(callArgs.data.settings.emergencyAlerts).toBe(true);
      expect(callArgs.data.settings.privacyMode).toBe(false);
      expect(callArgs.data.settings.language).toBe('en');
    });

    it('returns error when donor not found', async () => {
      const req = { user: { userId: '507f1f77bcf86cd799439011' } };
      const res = {
        json: vi.fn().mockReturnThis(),
        status: vi.fn().mockReturnThis(),
      };
      const next = vi.fn();

      await donorController.getSettings(req, res, next);

      expect(res.json).toHaveBeenCalled();
      const callArgs = res.json.mock.calls[0][0];
      expect(callArgs.success).toBe(false);
    });
  });

  describe('Dev 1: Task 5 — updateSettings', () => {
    it('updates donor settings', async () => {
      const donor = await createDonor();

      const req = {
        user: { userId: donor._id },
        body: {
          pushNotifications: false,
          language: 'ar',
        },
      };
      const res = {
        json: vi.fn().mockReturnThis(),
        status: vi.fn().mockReturnThis(),
      };
      const next = vi.fn();

      await donorController.updateSettings(req, res, next);

      expect(res.json).toHaveBeenCalled();
      const callArgs = res.json.mock.calls[0][0];
      expect(callArgs.data.settings.pushNotifications).toBe(false);
      expect(callArgs.data.settings.language).toBe('ar');
      expect(callArgs.data.settings.emergencyAlerts).toBe(true); // unchanged
    });

    it('rejects invalid language', async () => {
      const donor = await createDonor();

      const req = {
        user: { userId: donor._id },
        body: {
          language: 'fr', // invalid
        },
      };
      const res = {
        json: vi.fn().mockReturnThis(),
        status: vi.fn().mockReturnThis(),
      };
      const next = vi.fn();

      await donorController.updateSettings(req, res, next);

      expect(res.json).toHaveBeenCalled();
      const callArgs = res.json.mock.calls[0][0];
      expect(callArgs.success).toBe(false);
    });

    it('partially updates settings without affecting others', async () => {
      const donor = await createDonor();

      const req = {
        user: { userId: donor._id },
        body: {
          privacyMode: true,
        },
      };
      const res = {
        json: vi.fn().mockReturnThis(),
        status: vi.fn().mockReturnThis(),
      };
      const next = vi.fn();

      await donorController.updateSettings(req, res, next);

      expect(res.json).toHaveBeenCalled();
      const callArgs = res.json.mock.calls[0][0];
      expect(callArgs.data.settings.privacyMode).toBe(true);
      expect(callArgs.data.settings.pushNotifications).toBe(true); // unchanged
      expect(callArgs.data.settings.emergencyAlerts).toBe(true); // unchanged
      expect(callArgs.data.settings.language).toBe('en'); // unchanged
    });

    it('returns error when donor not found', async () => {
      const req = {
        user: { userId: '507f1f77bcf86cd799439011' },
        body: { language: 'ar' },
      };
      const res = {
        json: vi.fn().mockReturnThis(),
        status: vi.fn().mockReturnThis(),
      };
      const next = vi.fn();

      await donorController.updateSettings(req, res, next);

      expect(res.json).toHaveBeenCalled();
      const callArgs = res.json.mock.calls[0][0];
      expect(callArgs.success).toBe(false);
    });
  });

  describe('Donor Model: Settings Subdocument', () => {
    it('creates donor with default settings', async () => {
      const donor = await createDonor();

      const retrieved = await Donor.findById(donor._id);

      expect(retrieved.settings).toBeTruthy();
      expect(retrieved.settings.pushNotifications).toBe(true);
      expect(retrieved.settings.emergencyAlerts).toBe(true);
      expect(retrieved.settings.privacyMode).toBe(false);
      expect(retrieved.settings.language).toBe('en');
    });

    it('allows updating individual settings fields', async () => {
      const donor = await createDonor();

      const updated = await Donor.findByIdAndUpdate(
        donor._id,
        {
          'settings.pushNotifications': false,
          'settings.language': 'ar',
        },
        { new: true }
      );

      expect(updated.settings.pushNotifications).toBe(false);
      expect(updated.settings.language).toBe('ar');
      expect(updated.settings.emergencyAlerts).toBe(true);
      expect(updated.settings.privacyMode).toBe(false);
    });

    it('validates language enum', async () => {
      const donor = await createDonor();

      await expect(
        Donor.findByIdAndUpdate(donor._id, { 'settings.language': 'fr' }, { runValidators: true })
      ).rejects.toThrow();
    });
  });
});
