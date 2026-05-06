# DonationSession Architecture Implementation Report

**Status**: Detailed breakdown of what needs to be built  
**Current Date**: May 7, 2026  
**Phase**: Planning & Design  

---

## Executive Summary

Your current QR implementation (QR attached to Appointment) is functionally working but **not production-ready** against the new specification. To meet production requirements, we need to implement a **DonationSession entity** that serves as the verification layer between Appointment/UrgentRequest and the Donation record.

**Key Gap**: Current system combines QR scanning + donation creation in one step. New spec requires **3-step flow**: create appointment → scan QR → complete donation.

---

## 1. MODELS TO CREATE OR MODIFY

### 1.1 NEW: DonationSession Model
**File**: `src/models/DonationSession.model.js` (NEW)

**Purpose**: Core verification entity between appointment and donation record

**Fields** (11 total):
```
{
  donorId: ObjectId (ref: User) - REQUIRED
  hospitalId: ObjectId (ref: User) - REQUIRED
  appointmentId: ObjectId (ref: Appointment) - REQUIRED
  sourceType: String (enum: ['normal', 'urgent_request', 'hospital_campaign']) - REQUIRED
  sourceId: ObjectId (ref: Request/Campaign) - Required if sourceType is urgent_request or hospital_campaign
  qrToken: String - REQUIRED, unique, indexed, sparse
  expiresAt: Date - REQUIRED (suggested: 24 hours from creation)
  qrScannedAt: Date - default: null
  verificationMethod: String (enum: ['qr_scan', 'manual', 'rfid']) - default: 'qr_scan'
  scannedByStaffId: ObjectId (ref: User) - default: null (hospital staff who scanned)
  hospitalBranchId: String - default: null (branch-level scoping)
  status: String (enum: ['pending', 'scanned', 'completed', 'cancelled']) - default: 'pending'
  createdAt: Date - auto
  updatedAt: Date - auto
}
```

**Indexes**:
- `{ qrToken: 1 }` (unique, sparse)
- `{ donorId: 1, status: 1 }`
- `{ hospitalId: 1, status: 1 }`
- `{ sourceType: 1, status: 1 }`
- `{ expiresAt: 1 }` (for TTL cleanup)

---

### 1.2 MODIFY: Appointment Model
**File**: `src/models/Appointment.model.js`

**Changes**:
```javascript
// ADD these fields:
{
  // Remove from Appointment (move to DonationSession):
  // - qrToken  ❌ DELETE
  // - qrScannedAt  ❌ DELETE
  
  // Add this reference:
  donationSessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DonationSession',
    default: null,
    index: true,
  },
}
```

**Rationale**: DonationSession now owns QR verification, not Appointment.

---

### 1.3 MODIFY: Donation Model
**File**: `src/models/Donation.model.js`

**Current Fields**: donorId, requestId, status, quantity, scheduledDate, completedDate, notes

**Changes**:
```javascript
{
  // Current fields KEEP:
  donorId, requestId, status, quantity, scheduledDate, completedDate, notes

  // ADD these fields:
  donationSessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DonationSession',
    required: [true, 'DonationSession ID is required'],
    index: true,
  },
  
  sourceType: {
    type: String,
    enum: ['normal', 'urgent_request', 'hospital_campaign'],
    required: [true, 'Source type is required'],
  },
  
  sourceId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null, // Set if sourceType is urgent_request or hospital_campaign
  },
  
  hospitalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Hospital ID is required'],
    index: true,
  },
  
  donationType: {
    type: String,
    enum: ['Whole Blood', 'Platelets', 'Plasma'],
    required: [true, 'Donation type is required'],
  },
  
  units: {
    type: Number,
    required: [true, 'Units is required'],
    min: [1, 'Units must be at least 1'],
  },
  
  hemoglobin: {
    type: Number,
    default: null, // Medical measurement
  },
  
  weight: {
    type: Number,
    default: null, // kg
  },
  
  pointsAwarded: {
    type: Number,
    default: 0,
  },
  
  donatedAt: {
    type: Date,
    required: [true, 'Donation date is required'],
  },
}
```

**Rationale**: Full audit trail and source tracking for points calculation and urgent request management.

---

## 2. SERVICES TO CREATE OR MODIFY

### 2.1 NEW: DonationSession Service
**File**: `src/services/donationSession.service.js` (NEW)

**Methods**:

```javascript
/**
 * Create a donation session for normal appointment
 * @param {string} donorId
 * @param {string} hospitalId
 * @param {string} appointmentId
 * @param {string} donationType
 * @returns {object} { donationSessionId, qrToken, expiresAt }
 */
export const createSessionForNormalAppointment = async (
  donorId,
  hospitalId,
  appointmentId,
  donationType
) => {}

/**
 * Create a donation session for urgent request acceptance
 * @param {string} donorId
 * @param {string} hospitalId
 * @param {string} requestId
 * @param {string} appointmentId
 * @returns {object} { donationSessionId, qrToken, expiresAt }
 */
export const createSessionForUrgentRequest = async (
  donorId,
  hospitalId,
  requestId,
  appointmentId
) => {}

/**
 * Validate and scan QR token
 * @param {string} qrToken
 * @param {string} staffId
 * @param {object} options - { verificationMethod, hospitalBranchId }
 * @returns {object} session details
 * @throws Error if invalid, expired, or already scanned
 */
export const validateAndScanQr = async (qrToken, staffId, options = {}) => {
  // 1. Find session by qrToken
  // 2. Check if session exists
  // 3. Check if already scanned (qrScannedAt !== null)
  // 4. Check if expired (expiresAt < now)
  // 5. Check if still pending (status === 'pending')
  // 6. Update: qrScannedAt = now, scannedByStaffId = staffId, status = 'scanned'
  // 7. Return session details
}

/**
 * Complete donation (after successful QR scan)
 * @param {string} donationSessionId
 * @param {object} donationData - { units, hemoglobin, weight, donationType, complications }
 * @returns {object} { donationId, pointsAwarded, status }
 */
export const completeDonation = async (donationSessionId, donationData) => {
  // 1. Find session by donationSessionId
  // 2. Verify session.status === 'scanned'
  // 3. Verify session.qrScannedAt exists
  // 4. Create Donation record with:
  //    - donationSessionId
  //    - sourceType (from session)
  //    - sourceId (from session)
  //    - donatedAt = now
  // 5. Update DonationSession.status = 'completed'
  // 6. Calculate and award points based on:
  //    - Base points (100 for Whole Blood, 120 for Platelets/Plasma)
  //    - Urgent request bonus (+50 if sourceType === 'urgent_request')
  // 7. Call rewardService.onDonationCompleted()
  // 8. Update urgent request progress if applicable
  // 9. Log activity
  // 10. Return donation details
}

/**
 * Get session by QR token (for displaying QR details)
 * @param {string} qrToken
 * @returns {object} session
 */
export const getSessionByQrToken = async (qrToken) => {}

/**
 * Cancel session
 * @param {string} donationSessionId
 * @param {string} reason
 * @returns {object} updated session
 */
export const cancelSession = async (donationSessionId, reason) => {}

/**
 * Get expiring sessions (for cleanup/monitoring)
 * @param {number} minutesUntilExpiry - default: 60
 * @returns {array} sessions
 */
export const getExpiringSessions = async (minutesUntilExpiry = 60) => {}
```

---

### 2.2 MODIFY: Appointment Service
**File**: `src/services/appointment.service.js`

**Changes**:
```javascript
/**
 * EXISTING: bookAppointment
 * Changes:
 * - Remove QR token generation from here
 * - After creating Appointment, call donationSession.createSessionForNormalAppointment()
 * - Return both appointmentId and donationSessionId
 * - Return qrToken from the created session
 */
export const bookAppointment = async (
  donorId,
  hospitalId,
  requestId = null,
  appointmentDate,
  notes = ''
) => {
  // ... existing validation ...
  
  const appointment = await Appointment.create({
    donorId,
    hospitalId,
    requestId,
    appointmentDate,
    notes,
    donationType: 'Whole Blood', // or from request
  });
  
  // NEW: Create donation session
  const session = await donationSessionService.createSessionForNormalAppointment(
    donorId,
    hospitalId,
    appointment._id,
    appointment.donationType
  );
  
  // NEW: Link session to appointment
  appointment.donationSessionId = session.donationSessionId;
  await appointment.save();
  
  return {
    appointmentId: appointment._id,
    donationSessionId: session.donationSessionId,
    qrToken: session.qrToken,
    expiresAt: session.expiresAt,
  };
}

/**
 * REMOVE: qrToken generation logic
 * This is now handled by DonationSession service
 */
```

---

### 2.3 NEW: Urgent Request Service Extension
**File**: `src/services/urgentRequest.service.js` (NEW or extend existing)

**New Method**:
```javascript
/**
 * Accept an urgent request (donor action)
 * This creates:
 * 1. Appointment (for urgent request)
 * 2. DonationSession (for QR verification)
 * 3. Links them together
 * 
 * @param {string} donorId
 * @param {string} requestId
 * @returns {object} { appointmentId, donationSessionId, qrToken, expiresAt }
 */
export const acceptUrgentRequest = async (donorId, requestId) => {
  // 1. Validate donor is eligible
  // 2. Validate request exists and is still pending
  // 3. Validate request hospital is valid
  // 4. Create Appointment with:
  //    - donorId, hospitalId (from request)
  //    - appointmentDate = now + 2 hours (urgent)
  //    - requestId reference
  // 5. Create DonationSession with sourceType = 'urgent_request'
  // 6. Link session to appointment
  // 7. Send notifications to donor and hospital
  // 8. Return session details with QR token
}
```

---

### 2.4 MODIFY: Donation Service
**File**: `src/services/donation.service.js`

**Changes**:
```javascript
/**
 * REMOVE: Current scanQr logic
 * This logic moves to donationSession.validateAndScanQr()
 */

/**
 * NEW: completeDonation
 * This is called AFTER QR scan, with donation details
 */
export const completeDonation = async (donationSessionId, donationData) => {
  return donationSessionService.completeDonation(donationSessionId, donationData);
}

/**
 * MODIFY: Points calculation
 * - Whole Blood: 100 points
 * - Platelets: 120 points
 * - Plasma: 120 points
 * - Urgent Request Bonus: +50 points (if sourceType === 'urgent_request')
 */
const calculatePoints = (donationType, sourceType) => {
  const basePoints = {
    'Whole Blood': 100,
    'Platelets': 120,
    'Plasma': 120,
  };
  
  const points = basePoints[donationType] || 100;
  const urgentBonus = sourceType === 'urgent_request' ? 50 : 0;
  
  return points + urgentBonus;
};
```

---

### 2.5 MODIFY: Reward Service
**File**: `src/services/reward.service.js`

**Changes**:
```javascript
/**
 * MODIFY: onDonationCompleted
 * Now receives donation object instead of just donationId
 * Calculate points based on sourceType for urgent request bonus
 */
export const onDonationCompleted = async (donorId, donation, isSelfDonation = false) => {
  // donation = { donationType, sourceType, donationSessionId, ... }
  
  const points = calculatePoints(donation.donationType, donation.sourceType);
  
  // Award points
  // Create badge if applicable
  // etc.
}
```

---

## 3. CONTROLLERS TO CREATE OR MODIFY

### 3.1 NEW: DonationSession Controller
**File**: `src/controllers/donationSession.controller.js` (NEW)

**Endpoints**:

```javascript
/**
 * POST /donations/qr/scan
 * Hospital staff scans QR token
 * 
 * Request body:
 * { qrToken, verificationMethod?, hospitalBranchId? }
 * 
 * Response:
 * {
 *   donationSessionId,
 *   status: 'scanned',
 *   qrScannedAt,
 *   appointmentDetails: { donorId, donationType, ... },
 *   nextStep: 'Please complete donation details'
 * }
 */
export const scanQr = async (req, res, next) => {}

/**
 * GET /donations/sessions/:donationSessionId
 * Get session details by ID
 * 
 * Response:
 * {
 *   donationSessionId,
 *   status,
 *   qrToken (masked),
 *   expiresAt,
 *   qrScannedAt,
 *   sourceType,
 * }
 */
export const getSessionDetails = async (req, res, next) => {}

/**
 * GET /donations/sessions/:donationSessionId/qr
 * Get QR code for session (for display/printing)
 * 
 * Response:
 * {
 *   qrToken,
 *   qrImage? (base64 encoded if qr library used),
 *   expiresAt,
 *   expiresIn: 'HH:mm:ss',
 * }
 */
export const getSessionQrCode = async (req, res, next) => {}
```

---

### 3.2 MODIFY: Donation Controller
**File**: `src/controllers/donation.controller.js`

**Changes**:
```javascript
/**
 * EXISTING: getDonationTypes
 * No change needed
 */

/**
 * EXISTING: validateDonationEligibility
 * No change needed
 */

/**
 * REMOVE: scanQr
 * Moved to donationSession.controller.js
 */

/**
 * NEW: completeDonation
 * Called after QR scan
 * 
 * Request body:
 * {
 *   donationSessionId,
 *   units: 1,
 *   hemoglobin: 12.5,
 *   weight: 65,
 *   donationType: 'Whole Blood',
 *   complications?: 'None'
 * }
 * 
 * Response:
 * {
 *   donationId,
 *   pointsAwarded,
 *   status: 'completed',
 *   timestamp,
 *   hospitalName,
 * }
 */
export const completeDonation = async (req, res, next) => {}
```

---

### 3.3 MODIFY: Appointment Controller
**File**: `src/controllers/appointment.controller.js`

**Changes**:
```javascript
/**
 * EXISTING: bookAppointment
 * Changes:
 * - Response now includes donationSessionId and qrToken
 * - Response format:
 *   {
 *     appointmentId,
 *     hospitalId,
 *     appointmentDate,
 *     donationSessionId,
 *     qrToken,
 *     expiresAt,
 *   }
 */
export const bookAppointment = async (req, res, next) => {
  // ... existing logic ...
  
  // Now includes session data in response
}
```

---

### 3.4 NEW: Urgent Request Controller Extension
**File**: `src/controllers/urgentRequest.controller.js` (NEW or extend existing)

**New Endpoint**:
```javascript
/**
 * POST /urgent-requests/:requestId/accept
 * Donor accepts urgent blood request
 * 
 * Request params: requestId
 * Request body: { acceptedAt? }
 * 
 * Response:
 * {
 *   requestId,
 *   appointmentId,
 *   donationSessionId,
 *   qrToken,
 *   expiresAt,
 *   bloodType,
 *   urgency,
 *   hospitalName,
 * }
 */
export const acceptUrgentRequest = async (req, res, next) => {}
```

---

## 4. ROUTES TO CREATE OR MODIFY

### 4.1 MODIFY: Donation Routes
**File**: `src/routes/donation.routes.js`

**Changes**:
```javascript
// KEEP existing
router.get('/types', donationController.getDonationTypes);
router.post('/validate', requireRole('donor'), donationController.validateDonationEligibility);

// MODIFY: Split into two endpoints
// Step 2: QR Scan (move to donationSession controller)
router.post('/qr/scan', 
  requireRole('hospital', 'admin', 'superadmin'),
  donationSessionController.scanQr
);

// NEW: Get session QR code for display/printing
router.get('/sessions/:donationSessionId/qr',
  authMiddleware,
  donationSessionController.getSessionQrCode
);

// NEW: Step 3: Complete donation (after QR scan)
router.post('/complete',
  requireRole('hospital', 'admin', 'superadmin'),
  donationController.completeDonation
);

// NEW: Get session details
router.get('/sessions/:donationSessionId',
  authMiddleware,
  donationSessionController.getSessionDetails
);
```

---

### 4.2 MODIFY: Appointment Routes
**File**: `src/routes/appointment.routes.js`

**Changes**:
```javascript
// MODIFY: Book appointment
router.post(
  '/book-appointment',
  requireRole('donor'),
  appointmentController.bookAppointment
);
// Response now includes donationSessionId and qrToken

// KEEP existing
router.get('/available-slots/:hospitalId', appointmentController.getAvailableSlots);
router.get('/:appointmentId', authMiddleware, appointmentController.getAppointmentDetails);
router.patch('/:appointmentId', requireRole('donor'), appointmentController.updateAppointment);
router.get('/my-appointments', requireRole('donor'), appointmentController.getMyAppointments);
```

---

### 4.3 NEW: Urgent Request Routes Extension
**File**: `src/routes/urgentRequest.routes.js` (NEW or extend existing)

**New Endpoint**:
```javascript
// NEW: Accept urgent request (creates appointment + session + QR)
router.post(
  '/:requestId/accept',
  requireRole('donor'),
  urgentRequestController.acceptUrgentRequest
);
```

---

## 5. VALIDATION & MIDDLEWARE

### 5.1 NEW: Donation Session Validation
**File**: `src/validation/donationSession.validation.js` (NEW)

```javascript
/**
 * Validate QR scan request
 * - qrToken must be valid hex string
 * - verificationMethod must be one of: qr_scan, manual, rfid
 * - hospitalBranchId optional string
 */
export const validateQrScanRequest = (req, res, next) => {}

/**
 * Validate donation completion request
 * - donationSessionId must be valid ObjectId
 * - units must be number >= 1
 * - hemoglobin optional, must be number
 * - weight optional, must be number
 * - donationType must be one of: Whole Blood, Platelets, Plasma
 */
export const validateDonationCompletionRequest = (req, res, next) => {}

/**
 * Validate urgent request acceptance
 * - requestId must be valid ObjectId
 */
export const validateUrgentRequestAcceptance = (req, res, next) => {}
```

---

## 6. ERROR HANDLING & SECURITY

### 6.1 New Error Cases to Handle

```javascript
// QR Expiration
if (session.expiresAt < new Date()) {
  throw new Error('QR_EXPIRED: This QR code has expired');
}

// Already Scanned
if (session.qrScannedAt !== null) {
  throw new Error('QR_ALREADY_SCANNED: This QR code has already been used');
}

// Session Not Pending
if (session.status !== 'pending') {
  throw new Error('SESSION_INVALID_STATUS: Session is not in pending status');
}

// Hospital Mismatch
if (session.hospitalId.toString() !== req.user._id.toString()) {
  throw new Error('UNAUTHORIZED_HOSPITAL: QR belongs to different hospital');
}

// Missing Completion Data
if (!donationSessionId || !units || !donationType) {
  throw new Error('MISSING_REQUIRED_FIELDS: Donation completion data incomplete');
}

// Session Not Scanned
if (session.status !== 'scanned' || !session.qrScannedAt) {
  throw new Error('SESSION_NOT_SCANNED: QR must be scanned before completion');
}
```

### 6.2 Security Measures

```javascript
// 1. QR Token Generation
const qrToken = crypto.randomBytes(32).toString('hex');
// 32 bytes = 256-bit security

// 2. One-Time Use Prevention
// Check qrScannedAt before scan, prevent re-scan

// 3. Expiration Prevention
// Validate expiresAt on every access, TTL index for cleanup

// 4. Hospital Authorization
// Verify scanning hospital matches session hospital

// 5. Donor Eligibility
// Check before creating session AND before completion

// 6. Audit Trail
// Log: qrToken (masked), scannedByStaffId, hospitalBranchId, timestamp, result
```

---

## 7. DATABASE CHANGES REQUIRED

### 7.1 Collections to Create
- `donationsessions` (new)

### 7.2 Collections to Modify
- `appointments` (add donationSessionId, remove qrToken/qrScannedAt)
- `donations` (add donationSessionId, sourceType, sourceId, hospitalId, donationType, units, hemoglobin, weight, pointsAwarded, donatedAt)

### 7.3 Indexes to Create

**DonationSession**:
```javascript
{ qrToken: 1 } - unique, sparse
{ donorId: 1, status: 1 }
{ hospitalId: 1, status: 1 }
{ sourceType: 1, status: 1 }
{ expiresAt: 1 } - TTL index for cleanup
```

**Appointments**:
```javascript
{ donationSessionId: 1 } - new
// Remove indexes on qrToken
```

**Donations**:
```javascript
{ donationSessionId: 1 } - new
{ sourceType: 1, status: 1 } - new
{ hospitalId: 1, status: 1 } - new (for hospital analytics)
```

---

## 8. INTEGRATION POINTS

### 8.1 With Existing Services

| Service | Impact | Changes |
|---------|--------|---------|
| `eligibility.service` | Used during appointment booking & QR scan | No changes needed |
| `reward.service` | Points calculation | MODIFY: Pass sourceType for bonus calculation |
| `activity.service` | Log donation activities | MODIFY: Include sourceType in metadata |
| `notification.service` | Send QR expiry warnings | NEW: Add session expiry notifications |
| `appointment.service` | Book appointments | MODIFY: Create session after appointment |
| `request.service` | Handle urgent requests | NEW: Mark fulfilled when donation complete |

### 8.2 With Existing Models

| Model | Impact | Integration |
|-------|--------|-------------|
| `User` | Donor & Hospital refs | No changes, normal FK |
| `Appointment` | Linked to session | Add donationSessionId FK |
| `Donation` | Linked to session | Add donationSessionId FK |
| `Request` | Urgent request ref | Linked via sourceId |
| `Donor` | Stats updates | Update after completion |
| `Activity` | Audit logging | Log QR scan & completion |

---

## 9. THREE-STEP DONATION FLOW

### Step 1: Create Appointment → Auto-Create Session
```
POST /appointments/book-appointment
├─ Create Appointment
├─ Auto-create DonationSession
├─ Generate qrToken
├─ Set expiresAt = now + 24h
└─ Return { appointmentId, qrToken, expiresAt }
```

### Step 2: QR Scan
```
POST /donations/qr/scan
├─ Validate qrToken
├─ Check not expired (expiresAt > now)
├─ Check not scanned (qrScannedAt === null)
├─ Check status === 'pending'
├─ Verify donor eligible
├─ Update qrScannedAt, scannedByStaffId, status = 'scanned'
└─ Return { status: 'scanned', nextStep: 'complete donation' }
```

### Step 3: Complete Donation
```
POST /donations/complete
├─ Get DonationSession by ID
├─ Verify status === 'scanned'
├─ Verify qrScannedAt exists
├─ Create Donation record
│  └─ Include sourceType, sourceId, hospitalId, donationType
├─ Calculate points (base + urgent bonus if applicable)
├─ Award points to donor
├─ Update Donor stats (totalDonations, totalPoints, lastDonationDate)
├─ Update DonationSession status = 'completed'
├─ Update Appointment status = 'completed'
├─ Log activity
├─ Send notifications
└─ Return { donationId, pointsAwarded, status: 'completed' }
```

---

## 10. URGENT REQUEST SPECIAL FLOW

### Current Flow (Normal Donation)
```
Donor books appointment → QR generated → Hospital scans → Donation completed
```

### New Flow (Urgent Request)
```
Hospital creates urgent request
↓
Donor sees request & clicks "I Will Donate"
↓
POST /urgent-requests/:requestId/accept (DONOR)
  ├─ Backend verifies donor eligible
  ├─ Creates Appointment (urgent, appointment date = now + 2h)
  ├─ Creates DonationSession with sourceType = 'urgent_request'
  ├─ Links sourceId = requestId
  └─ Returns { appointmentId, qrToken, expiresAt }
↓
Frontend shows QR code
↓
Hospital staff scans QR
↓
POST /donations/qr/scan (HOSPITAL STAFF)
  └─ Validates QR, marks session as scanned
↓
Hospital staff enters donation details
↓
POST /donations/complete (HOSPITAL STAFF)
  ├─ Creates Donation with sourceType = 'urgent_request'
  ├─ Calculates points = base + 50 bonus
  ├─ Updates Request progress (fulfilledUnits++)
  ├─ If fulfilledUnits >= requiredUnits, marks request as 'completed'
  └─ Returns { donationId, pointsAwarded: base + 50, ... }
```

---

## 11. POINTS CALCULATION MATRIX

| Scenario | Base Points | Urgent Bonus | Total |
|----------|-------------|--------------|-------|
| Normal - Whole Blood | 100 | 0 | **100** |
| Normal - Platelets | 120 | 0 | **120** |
| Normal - Plasma | 120 | 0 | **120** |
| Urgent - Whole Blood | 100 | 50 | **150** |
| Urgent - Platelets | 120 | 50 | **170** |
| Urgent - Plasma | 120 | 50 | **170** |

---

## 12. IMPLEMENTATION PRIORITY MATRIX

### Priority 1: FOUNDATION (Must Do)
- [ ] Create DonationSession model
- [ ] Modify Appointment model (add donationSessionId, remove qrToken fields)
- [ ] Modify Donation model (add new fields for tracking)
- [ ] Create DonationSession service (createSession, validateAndScanQr, completeDonation)
- [ ] Create DonationSession controller (scanQr, getSessionDetails, getSessionQrCode)
- [ ] Update Donation routes (POST /donations/qr/scan, POST /donations/complete)

### Priority 2: INTEGRATION (Critical)
- [ ] Modify Appointment service (create session on booking)
- [ ] Modify Appointment controller (return session data)
- [ ] Modify Donation service (completeDonation method)
- [ ] Modify Donation controller (completeDonation endpoint)
- [ ] Modify Reward service (calculate points with urgent bonus)
- [ ] Update Activity logging (include sourceType)

### Priority 3: URGENT REQUEST FLOW (Enhanced)
- [ ] Create/modify Urgent Request service (acceptUrgentRequest method)
- [ ] Create/modify Urgent Request controller (acceptUrgentRequest endpoint)
- [ ] Add Urgent Request routes (POST /urgent-requests/:id/accept)
- [ ] Update Request model (add fulfilledUnits tracking if not exists)

### Priority 4: VALIDATION & SECURITY (Important)
- [ ] Create validation middleware for QR scan requests
- [ ] Create validation middleware for donation completion
- [ ] Add error handling for all 9 error cases
- [ ] Add QR expiration checks
- [ ] Add hospital authorization checks

### Priority 5: TESTING & DEPLOYMENT (Support)
- [ ] Create unit tests for DonationSession service
- [ ] Create integration tests for 3-step flow
- [ ] Create urgent request acceptance tests
- [ ] Test points calculation with urgent bonus
- [ ] Test database migrations
- [ ] Update API documentation

---

## 13. FILE CHECKLIST

### New Files to Create
- [ ] `src/models/DonationSession.model.js`
- [ ] `src/services/donationSession.service.js`
- [ ] `src/controllers/donationSession.controller.js`
- [ ] `src/validation/donationSession.validation.js`
- [ ] `src/services/urgentRequest.service.js` (if new)
- [ ] `src/controllers/urgentRequest.controller.js` (if new)

### Files to Modify
- [ ] `src/models/Appointment.model.js`
- [ ] `src/models/Donation.model.js`
- [ ] `src/services/appointment.service.js`
- [ ] `src/services/donation.service.js`
- [ ] `src/services/reward.service.js`
- [ ] `src/controllers/appointment.controller.js`
- [ ] `src/controllers/donation.controller.js`
- [ ] `src/routes/donation.routes.js`
- [ ] `src/routes/appointment.routes.js`
- [ ] `src/app.js` (if new routes added)
- [ ] `src/services/activity.service.js` (for sourceType logging)

### Documentation to Update
- [ ] OpenAPI/Swagger specs for new endpoints
- [ ] API_QUICK_REFERENCE_AUDIT.md
- [ ] Implementation examples in docs/

---

## 14. ESTIMATED EFFORT

| Component | Complexity | Effort | Priority |
|-----------|------------|--------|----------|
| DonationSession model | Low | 1h | P1 |
| Model modifications | Medium | 2h | P1 |
| DonationSession service | High | 3h | P1 |
| DonationSession controller | Medium | 2h | P1 |
| Appointment service changes | Medium | 2h | P2 |
| Donation service changes | Medium | 2h | P2 |
| Reward service changes | Low | 1h | P2 |
| Routes & integration | Medium | 2h | P2 |
| Urgent request flow | High | 3h | P3 |
| Validation & error handling | Medium | 2h | P4 |
| Testing (unit + integration) | High | 4h | P5 |
| Documentation & API specs | Low | 1h | P5 |
| **TOTAL** | | **~25h** | |

---

## 15. BACKWARD COMPATIBILITY NOTES

### Breaking Changes
- QR tokens no longer stored on Appointment model
- QR scan no longer completes donation in single step
- Points calculation now includes urgent request bonus

### Migration Strategy
```sql
-- Backup existing data
db.appointments.find({ qrToken: { $exists: true } }).toArray()

-- For each existing appointment with qrToken:
--   1. Create DonationSession
--   2. Link to appointment via donationSessionId
--   3. Update appointment to remove qrToken/qrScannedAt
--   4. Backfill donations with donationSessionId references

-- Recommend: Run migration before deployment
-- Provide rollback: Keep backup of old qrToken values for 30 days
```

---

## 16. NEXT STEPS

1. **Review** this report and confirm architecture alignment
2. **Identify gaps** specific to your use case
3. **Begin Priority 1** implementation (foundation models & services)
4. **Test locally** before moving to Priority 2
5. **Run migrations** on staging database
6. **Deploy in phases** (foundation → integration → urgent flow → testing)

---

**Report Generated**: May 7, 2026  
**Status**: Ready for Implementation  
**Approval**: Awaiting user confirmation on architecture and priorities
