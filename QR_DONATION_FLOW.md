# QR Donation Confirmation Flow

## Overview
**Confirm Donation**: When a donor arrives at a hospital appointment, they scan the hospital QR code to confirm their blood donation and earn points.

---

## Key Components

### 1. **QR Token Generation** ✅ (Dev 1 - Complete)
```javascript
// When appointment is booked
const qrToken = crypto.randomBytes(32).toString('hex');
// Example: "a3f8b2c9d1e4f6a8b3c5d7e9f1a3b5c7d9e1f3a5b7c9d1e3f5a7b9c1d3e5f7"

// Stored in Appointment model
Appointment: {
  qrToken: String,          // unique, sparse, indexed
  qrScannedAt: Date,        // when QR was scanned
  donationType: String,     // 'Whole Blood', 'Platelets', 'Plasma'
  appointmentDate: Date
}
```

### 2. **QR Scanning Endpoint** 📋 (Dev 2 - Task 6)
```
POST /donations/qr/scan
Content-Type: application/json

Request body:
{
  "qrToken": "a3f8b2c9d1e4f6a8b3c5d7e9f1a3b5c7d9e1f3a5b7c9d1e3f5a7b9c1d3e5f7",
  "units": 1,                    // number of units donated
  "complications": "none"        // optional health notes
}

Response (200 OK):
{
  "success": true,
  "data": {
    "donationId": "507f1f77bcf86cd799439011",
    "qrToken": "a3f8b2c9d1e4f6a8b3c5d7e9f1a3b5c7d9e1f3a5b7c9d1e3f5a7b9c1d3e5f7",
    "donationType": "Whole Blood",
    "units": 1,
    "pointsAwarded": 100,
    "scannedAt": "2026-05-06T20:30:00Z",
    "hospitalName": "Cairo Care Hospital"
  }
}
```

---

## User Journey

### Step 1: Book Appointment (Mobile App)
```
Donor selects hospital and date
         ↓
Backend generates QR token + appends to appointment
         ↓
QR code displayed on appointment confirmation
         ↓
Donor arrives at hospital with appointment
```

### Step 2: Arrive at Hospital
```
Hospital staff scan the appointment QR code
(via app or QR reader)
         ↓
QR token is sent to backend: POST /donations/qr/scan
         ↓
Backend validates:
  - QR token exists and is unique ✓
  - Appointment is not in past ✓
  - Donor not already scanned today ✓
```

### Step 3: Confirm & Record Donation
```
Backend:
  1. Find Appointment with matching qrToken
  2. Create Donation record:
     - donorId: from appointment
     - hospitalId: from appointment
     - donationType: from appointment (Whole Blood/Platelets/Plasma)
     - units: from request
     - status: 'completed'
     - weight/hemoglobin checks (if available)
  3. Update Appointment:
     - qrScannedAt = now()
     - status = 'completed'
  4. Award points:
     - Base 100 points for donation
     - Bonus points if platelets or plasma (120 points)
  5. Create Activity log
  6. Send notification to donor
  7. Update donor stats:
     - totalDonations += 1
     - lastDonationDate = now()
     - suspensionStatus = 'active' (if was suspended, reactivate)

         ↓
Response with:
  - Donation ID
  - Points awarded
  - Hospital name
  - Donation type confirmed
```

### Step 4: Donor Sees Confirmation
```
Mobile app displays:
  "✓ Donation Confirmed"
  "You donated: 1 unit Whole Blood"
  "Points Earned: 100"
  "Hospital: Cairo Care Hospital"
         ↓
Notification sent to donor (optional)
         ↓
Update donor dashboard:
  - Recent activity shows new donation
  - Points updated
  - Statistics refreshed
```

---

## Error Handling

### Invalid QR Token
```json
{
  "success": false,
  "code": "INVALID_QR_TOKEN",
  "message": "QR token not found or expired"
}
// HTTP 404
```

### QR Already Scanned
```json
{
  "success": false,
  "code": "QR_ALREADY_SCANNED",
  "message": "This QR code has already been scanned"
}
// HTTP 409 Conflict
```

### Appointment in Past
```json
{
  "success": false,
  "code": "APPOINTMENT_EXPIRED",
  "message": "Appointment date has passed"
}
// HTTP 400
```

### Donor Not Eligible
```json
{
  "success": false,
  "code": "DONOR_NOT_ELIGIBLE",
  "message": "Donor is suspended or ineligible"
}
// HTTP 403
```

---

## Implementation Requirements (Dev 2)

### donation.controller.js
```javascript
export const scanQr = async (req, res, next) => {
  try {
    const { qrToken, units, complications } = req.body;
    
    // 1. Find appointment by QR token
    const appointment = await Appointment.findOne({ qrToken })
      .populate('donorId', 'bloodType suspensionStatus')
      .populate('hospitalId', 'fullName');
    
    if (!appointment) {
      return response.error(res, 404, 'QR token not found');
    }
    
    // 2. Validate QR not already scanned
    if (appointment.qrScannedAt) {
      return response.error(res, 409, 'This QR code has already been scanned');
    }
    
    // 3. Validate appointment is future
    if (appointment.appointmentDate < new Date()) {
      return response.error(res, 400, 'Appointment date has passed');
    }
    
    // 4. Validate donor is eligible
    if (appointment.donorId.suspensionStatus === 'suspended') {
      return response.error(res, 403, 'Donor is not eligible');
    }
    
    // 5. Create donation record
    const donation = await Donation.create({
      donorId: appointment.donorId._id,
      hospitalId: appointment.hospitalId._id,
      donationType: appointment.donationType,
      units,
      complications,
      status: 'completed',
      scannedAt: new Date()
    });
    
    // 6. Update appointment
    appointment.qrScannedAt = new Date();
    appointment.status = 'completed';
    await appointment.save();
    
    // 7. Award points
    const pointsAwarded = appointment.donationType === 'Whole Blood' ? 100 : 120;
    await rewardService.addPoints(appointment.donorId._id, pointsAwarded);
    
    // 8. Update donor stats
    await Donor.findByIdAndUpdate(appointment.donorId._id, {
      lastDonationDate: new Date(),
      suspensionStatus: 'active'
    });
    
    return response.success(res, 200, 'Donation confirmed', {
      donationId: donation._id,
      qrToken,
      donationType: appointment.donationType,
      units,
      pointsAwarded,
      scannedAt: appointment.qrScannedAt,
      hospitalName: appointment.hospitalId.fullName
    });
  } catch (error) {
    next(error);
  }
};
```

### Route
```javascript
// routes/donation.routes.js
router.post('/qr/scan', scanQr);
```

---

## Data Flow Diagram

```
Donor Arrives
    ↓
Hospital Staff Scans QR
    ↓
POST /donations/qr/scan
{ qrToken: "...", units: 1 }
    ↓
Backend Validation:
  ✓ QR token exists
  ✓ Not already scanned
  ✓ Appointment future
  ✓ Donor eligible
    ↓
Create Donation ← Appointment.qrToken
Update Appointment (qrScannedAt)
Award Points
Update Donor Stats
Log Activity
    ↓
Send Response + Notification
    ↓
Donor Sees Confirmation
   (Dashboard refreshed)
```

---

## Points Breakdown

| Donation Type | Base Points | Notes |
|---|---|---|
| Whole Blood | 100 | 1 unit |
| Platelets | 120 | Higher value |
| Plasma | 120 | Higher value |
| **Bonus Multipliers** | | |
| First donation | +50 | One-time bonus |
| Consecutive (within 60 days) | +25 | Loyalty bonus |
| High hemoglobin | +10 | Medical achievement |

---

## Security Considerations

1. **QR Token Uniqueness**: Each appointment has ONE unique token (database constraint)
2. **Token Format**: 64-character hex string (impossible to guess)
3. **Scanning Limit**: Once scanned, cannot be re-scanned (qrScannedAt check)
4. **Authorization**: Hospital staff authenticated via Hospital role
5. **Audit Trail**: All scans logged in Activity model

---

## Testing the Flow

```bash
# 1. Create appointment with QR token
POST /appointments/book
{ hospitalId, appointmentDate }
# Response includes qrToken

# 2. Scan QR code
POST /donations/qr/scan
{ qrToken, units: 1 }
# Response: { donationId, pointsAwarded }

# 3. Verify donation created
GET /donor/donations
# Shows new donation in history

# 4. Verify points awarded
GET /donor/settings
# Shows updated points in dashboard
```

---

**Summary**: The QR code scan confirms attendance, creates a donation record, and awards points—all in one API call. The QR token acts as a unique identifier linking the appointment to the physical donation action.
