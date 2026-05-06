import { describe, it, expect, vi } from 'vitest';
import crypto from 'node:crypto';
import { setupTestDB } from '../helpers/db.js';
import { createDonor, createHospital, createRequest } from '../helpers/factories.js';
import * as donationController from '../../src/controllers/donation.controller.js';
import Appointment from '../../src/models/Appointment.model.js';

vi.mock('../../src/services/reward.service.js', () => ({
  onDonationCompleted: vi.fn().mockResolvedValue(null),
}));

vi.mock('../../src/services/activity.service.js', () => ({
  logActivity: vi.fn().mockResolvedValue(null),
}));

vi.mock('../../src/services/eligibility.service.js', () => ({
  canDonate: vi.fn().mockResolvedValue({ eligible: true, reason: 'Donor is eligible' }),
}));

setupTestDB();

describe('Donation Controller', () => {
  it('returns supported donation types', async () => {
    const req = {};
    const res = {
      json: vi.fn().mockReturnThis(),
      status: vi.fn().mockReturnThis(),
    };

    await donationController.getDonationTypes(req, res);

    const payload = res.json.mock.calls[0][0];
    expect(payload.success).toBe(true);
    expect(payload.data).toEqual(['Whole Blood', 'Platelets', 'Plasma']);
  });

  it('validates donation eligibility and blocks duplicate bookings', async () => {
    const donor = await createDonor();
    const hospital = await createHospital();
    const appointmentDate = new Date(Date.now() + 48 * 60 * 60 * 1000);

    await Appointment.create({
      donorId: donor._id,
      hospitalId: hospital._id,
      appointmentDate,
      status: 'pending',
      qrToken: crypto.randomBytes(32).toString('hex'),
    });

    const req = {
      user: { userId: donor._id },
      body: { hospitalId: hospital._id.toString(), date: appointmentDate.toISOString() },
    };
    const res = {
      json: vi.fn().mockReturnThis(),
      status: vi.fn().mockReturnThis(),
    };
    const next = vi.fn();

    await donationController.validateDonationEligibility(req, res, next);

    const payload = res.json.mock.calls[0][0];
    expect(payload.success).toBe(true);
    expect(payload.data.canDonate).toBe(false);
    expect(payload.data.reason).toContain('booking');
  });

  it('confirms a donation by scanning QR token', async () => {
    const donor = await createDonor();
    const hospital = await createHospital();
    const request = await createRequest(hospital._id, { bloodType: donor.bloodType });
    const qrToken = crypto.randomBytes(32).toString('hex');
    const appointmentDate = new Date(Date.now() + 48 * 60 * 60 * 1000);

    const appointment = await Appointment.create({
      donorId: donor._id,
      hospitalId: hospital._id,
      requestId: request._id,
      appointmentDate,
      status: 'confirmed',
      qrToken,
      donationType: 'Whole Blood',
    });

    const req = {
      user: { userId: hospital._id },
      body: { qrToken, units: 1, complications: 'none' },
    };
    const res = {
      json: vi.fn().mockReturnThis(),
      status: vi.fn().mockReturnThis(),
    };
    const next = vi.fn();

    await donationController.scanQr(req, res, next);

    const payload = res.json.mock.calls[0][0];
    expect(payload.success).toBe(true);
    expect(payload.data.donationId).toBeTruthy();
    expect(payload.data.pointsEarned).toBe(100);
    expect(payload.data.donationType).toBe('Whole Blood');

    const updatedAppointment = await Appointment.findById(appointment._id);
    expect(updatedAppointment.status).toBe('completed');
    expect(updatedAppointment.qrScannedAt).toBeTruthy();
  });
});