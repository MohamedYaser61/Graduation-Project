# Message for Dev 2 - Design Decisions & Conflict Resolution

**To: Dev 2**  
**From: Dev 1**  
**Date: May 6, 2026**  
**Subject: Architecture Alignment - QR Token, Settings, Slots, and Location**

---

## Overview
We reviewed your Dev 2 implementation and identified design conflicts. After analysis, we've standardized the architecture. Please align your code with the decisions below.

---

## ✅ DESIGN DECISIONS (FINAL)

### 1. **QR Token Placement: APPOINTMENT Model** ✓

**Decision:** QR token belongs in `Appointment` model, NOT Donation.

**Rationale:**
- QR is scanned at appointment time/location (physical check-in)
- One QR token per appointment
- Scanning QR confirms/completes the associated Donation
- Simpler data flow: Appointment → Donation

**Implementation:**
```javascript
// src/models/Appointment.model.js
Appointment.schema: {
  qrToken: {
    type: String,
    unique: true,
    sparse: true,
    index: true
  },
  qrScannedAt: Date,
  donationType: { enum: ['Whole Blood', 'Platelets', 'Plasma'] }
}

// DO NOT add qrToken to Donation model
```

**Impact on your code:**
- Remove any `qrToken` or `qrExpires` fields from `Donation.model.js`
- Update `donation.controller.js` - scanQr() should read qrToken from Appointment, not Donation
- Update route: confirm via Appointment QR → creates/updates Donation

---

### 2. **Donor Settings Schema: privacyMode (Boolean)** ✓

**Decision:** Use `privacyMode` (boolean), NOT `privacy` (string).

**Rationale:**
- Consistent with `emergencyAlerts` pattern (all boolean toggles)
- Clearer naming: "privacyMode: true/false" vs "privacy: 'public'/'private'"
- Simplifies validation and UI logic

**Implementation (ALREADY DONE):**
```javascript
// src/models/Donor.model.js
settings: {
  pushNotifications: Boolean,      // ✓ Correct
  emergencyAlerts: Boolean,        // ✓ Correct
  privacyMode: Boolean,            // ✓ Use THIS
  language: 'en' | 'ar'
}

// DO NOT use privacy: 'public'|'private'
```

**Action for Dev 2:**
- If you added `privacy` field, remove it
- Update any controllers/services to use `privacyMode`

---

### 3. **Slot Management: Hourly Capacity Model** ✓

**Decision:** Use hourly slots with per-hour capacity, NOT total daily capacity.

**Rationale:**
- Hospitals enter capacity for each hour (e.g., 9-10am = 5 slots, 10-11am = 6 slots)
- Flexible: different hours can have different capacities
- More granular booking control

**Implementation (ALREADY DONE):**
```javascript
// src/models/Hospital.model.js
Hospital.schema: {
  slotsPerHour: {
    type: Number,
    default: 5,
    min: 1
  },
  workingHoursStart: {
    type: Number,
    default: 9,
    min: 0,
    max: 23
  },
  workingHoursEnd: {
    type: Number,
    default: 17,
    min: 0,
    max: 23
  }
}

// Example: 9am-5pm, 5 slots per hour = 40 total slots/day
// Each hour: 9-10, 10-11, 11-12, etc. has 5 slots
```

**Action for Dev 2:**
- Remove any `capacity` field (total daily)
- Use the three hourly fields above
- Update `getAvailableSlots()` to iterate hours and count bookings per hour

---

### 4. **Hospital Location: Keep lat/long (NO GeoJSON)** ✓

**Decision:** Keep existing `lat` and `long` fields. Do NOT add GeoJSON `location` field.

**Rationale:**
- Backward compatibility with existing code
- Simpler queries (we're not using $near geospatial queries)
- No need for 2dsphere index overhead

**Implementation (ALREADY DONE):**
```javascript
// src/models/Hospital.model.js
Hospital.schema: {
  lat: { type: Number, min: -90, max: 90 },
  long: { type: Number, min: -180, max: 180 }
}

// ✗ DO NOT add:
// location: { type: "Point", coordinates: [...] }
// ✗ DO NOT add: hospitalSchema.index({ location: "2dsphere" })
```

**Action for Dev 2:**
- Remove any `location` GeoJSON field you may have added
- Remove any `2dsphere` indexes
- Use existing lat/long for distance calculations

---

## 📋 Files to Update (Dev 2)

Please review and update these files in your branch:

1. **src/models/Donation.model.js**
   - ✗ Remove `qrToken` field if added
   - ✗ Remove `qrExpires` field if added

2. **src/models/Donor.model.js**
   - ✗ Remove `privacy` field if you added it
   - ✓ Verify `privacyMode` is boolean

3. **src/models/Hospital.model.js**
   - ✗ Remove `location` GeoJSON field if added
   - ✗ Remove `2dsphere` index if added
   - ✓ Verify `slotsPerHour`, `workingHoursStart`, `workingHoursEnd` exist

4. **src/controllers/donation.controller.js**
   - Update `scanQr()` to read qrToken from Appointment
   - Remove dependency on Donation.qrToken

5. **src/controllers/appointment.controller.js**
   - Verify `getAvailableSlots()` uses hourly logic

6. **src/services/appointment.service.js**
   - Verify `bookAppointment()` validates hourly capacity
   - Verify `getAvailableSlots()` returns time slots with per-hour capacity

---

## ✅ Dev 1 Implementation Status

**COMPLETED & TESTED:**
- ✓ Appointment.model.js: qrToken, qrScannedAt, donationType fields
- ✓ Donor.model.js: settings with privacyMode (boolean)
- ✓ Hospital.model.js: slotsPerHour, workingHoursStart/End
- ✓ All 10 unit tests passing
- ✓ seed-demo.js: Demo data seeded with QR tokens and settings

**Ready for integration with your Dev 2 code** (after you update the files above)

---

## 🚦 Next Steps

1. **Review** this message
2. **Update** your 6 files listed above
3. **Test** your changes: `npm test`
4. **Verify** appointments can book within hourly capacity
5. **Merge** Dev 1 + Dev 2 code together

---

## Questions/Clarifications?

If you have questions about any decision:
- QR token endpoint: `/donations/qr/scan` (POST, scans via Appointment.qrToken)
- Available slots: `GET /appointments/available-slots?hospitalId=X&date=Y` (hourly breakdown)
- Donor settings: `GET/PUT /donor/settings` (privacyMode boolean)
- Hospital setup: slotsPerHour = capacity per hour (flexible per hospital)

**Let's sync up once you've updated your files!**

---

**Dev 1**
