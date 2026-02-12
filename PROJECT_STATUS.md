# LifeLink – Project Status & Development Progress

## 1. What's Done ✅

| Area | File(s) | Status |
|------|---------|--------|
| **Config** | `config/env.js`, `config/db.js` | ✅ Complete. Env validation, MongoDB connect/disconnect, dev fallback without DB. |
| **Server** | `server.js`, `app.js` | ✅ Complete. Entry point, CORS, morgan, JSON body, API routes mounted, JSON 404 handler. |
| **User Model** | `models/User.model.js` | ✅ Complete. Schema: fullName, email, password (bcrypt), role (admin/donor/hospital), timestamps. Uses Mongoose discriminators. |
| **Donor Model** | `models/Donor.model.js` | ✅ Complete. Extends User; fields: phoneNumber, bloodType, gender, lastDonationDate, isAvailable, location. |
| **Hospital Model** | `models/Hospital.model.js` | ✅ Complete. Extends User; fields: hospitalName, hospitalId, licenseNumber, address, contactNumber. |
| **Auth Service** | `services/auth.service.js` | ✅ Complete. Implements: register, login, logout, refreshToken, forgotPassword, resetPassword, getMe, verifyEmail, verifyEmailToken. |
| **Auth Controller** | `controllers/auth.controller.js` | ✅ Complete. Handles all auth endpoints with proper error handling using response utilities. |
| **Auth Routes** | `routes/auth.routes.js` | ✅ Complete. All endpoints mounted at `/auth`: POST /signup, /login, /logout, /refresh-token, /forgot-password, /reset-password, GET /me, /verify-email, /verify-email-token. |
| **JWT Utils** | `utils/jwt.js` | ✅ Complete. signToken, signRefreshToken, verifyToken functions. |
| **Response Utils** | `utils/response.js` | ✅ Complete. success() and error() response methods. |
| **Repo** | `.env.example`, `.gitignore`, `README.md`, `PROJECT_STATUS.md` | ✅ Present and maintained. |

---

## 2. What's Incomplete or Needs Work 🟡

### 2.1 Middlewares (Empty – Priority)

| File | Required Functionality |
|------|--------|
| **`middlewares/auth.middleware.js`** | Verify JWT from `Authorization: Bearer <token>` header. Attach `req.user` with decoded payload. Throw 401 if token missing/invalid/expired. |
| **`middlewares/role.middleware.js`** | Check `req.user.role` against allowed roles. Return 403 if user role not permitted. |
| **`middlewares/error.middleware.js`** | Centralized error handler: `(err, req, res, next)` catches all errors, logs them, and returns JSON `{ success: false, message, ... }`. |

### 2.2 Models (Partially Complete)

| File | Status | Notes |
|------|--------|--------|
| **`models/Request.model.js`** | 🔴 Empty | Should include: hospitalId (ref Hospital), type (blood/organ), urgency, status, requiredBy, quantity, priority, etc. |
| **`models/Donation.model.js`** | 🔴 Empty | Should include: donorId (ref Donor), requestId (ref Request), date, status, quantity, result, notes. |
| **`models/Notification.model.js`** | 🔴 Empty | Should include: userId (ref User), type, message, read, createdAt. |

### 2.3 Controllers (Partially Complete)

| File | Status | Notes |
|------|--------|--------|
| **`controllers/donor.controller.js`** | 🔴 Empty | Should implement: getProfile, updateProfile, viewRequests, viewMatches, registerDonation, etc. |
| **`controllers/hospital.controller.js`** | 🔴 Empty | Should implement: getProfile, updateProfile, createRequest, viewRequests, viewDonations, cancelRequest, etc. |
| **`controllers/admin.controller.js`** | 🔴 Empty | Should implement: listUsers, listRequests, listDonations, stats, moderate, ban users, etc. |

### 2.4 Services (Placeholder)

| File | Status | Notes |
|------|--------|--------|
| **`services/matching.service.js`** | 🔴 Empty | Find donors matching a request by blood type, location, availability, eligibility. |
| **`services/donation.service.js`** | 🔴 Empty | Create/update donations, validate donor eligibility, manage donation status. |
| **`services/reward.service.js`** | 🔴 Empty | Award points or badges to donors for successful donations. |
| **`services/notification.service.js`** | 🔴 Empty | Create and send notifications for requests, matches, donations, milestones. |

### 2.5 Routes (Partially Complete)

| File | Status | Notes |
|------|--------|--------|
| **`routes/donor.routes.js`** | 🔴 Empty | Should mount at `/donor` with auth middleware. Endpoints: GET/PUT /profile, GET /requests, GET /matches, POST /donate, etc. |
| **`routes/hospital.routes.js`** | 🔴 Empty | Should mount at `/hospital` with auth middleware. Endpoints: GET/PUT /profile, POST /request, GET /requests, GET /donations, DELETE /request/:id, etc. |
| **`routes/admin.routes.js`** | 🔴 Empty | Should mount at `/admin` with auth + requireRole('admin'). Endpoints for management and moderation. |

### 2.6 Utils (Partial)

| File | Status | Notes |
|------|--------|--------|
| **`utils/geo.js`** | 🔴 Empty | Distance calculation for location-based matching. Functions: distanceBetween(lat1, lon1, lat2, lon2), nearbyDonors(location, radius), etc. |

---

## 3. Recommended Next Moves (Priority Order)

### Phase 1 – Middlewares (so protected routes work)

1. **`middlewares/error.middleware.js`** – Central error handler
   - `(err, req, res, next) => { ... }` catches all errors, logs them, and returns `{ success: false, message, ... }`.
   - Add to `app.js` **last** (after 404) so all errors return JSON.
   - Handle specific error types: `JsonWebTokenError`, `TokenExpiredError`, validation errors, etc.

2. **`middlewares/auth.middleware.js`** – Protect routes
   - Extract JWT from `Authorization: Bearer <token>` header.
   - Call `verifyToken(token)` from utils; catch TokenExpiredError and JsonWebTokenError.
   - Attach `req.user` with decoded payload or return 401 with JSON error.
   - Use on `/me`, `/profile`, and all donor/hospital/admin routes.

3. **`middlewares/role.middleware.js`** – Role-based access
   - Factory function: `requireRole('donor' | 'hospital' | 'admin')` returns middleware.
   - Check `req.user.role`; return 403 if not allowed.
   - Use on donor-only, hospital-only, and admin-only routes.

After Phase 1: Protected routes can be built with auth + role checks.

### Phase 2 – Complete Remaining Models

4. **`models/Request.model.js`**
   - Fields: hospitalId (ref Hospital), type, urgency, status, requiredBy, quantity, priority, description, createdAt.

5. **`models/Donation.model.js`**
   - Fields: donorId (ref Donor), requestId (ref Request), date, status, quantity, notes.

6. **`models/Notification.model.js`**
   - Fields: userId (ref User), type, message, read, createdAt.

### Phase 3 – Donor & Hospital Routes & Controllers

7. **`controllers/donor.controller.js` & `routes/donor.routes.js`**
   - Endpoints: GET /profile, PUT /profile, GET /requests, GET /matches, POST /donate.
   - Mount at `/donor` with `authMiddleware`.

8. **`controllers/hospital.controller.js` & `routes/hospital.routes.js`**
   - Endpoints: GET /profile, PUT /profile, POST /request, GET /requests, GET /donations, DELETE /request/:id.
   - Mount at `/hospital` with `authMiddleware`.

### Phase 4 – Services & Admin

9. **`services/matching.service.js`** – Find donors matching requests by blood type, location, availability.

10. **`services/donation.service.js`** – Manage donations: create, validate eligibility, update status.

11. **`services/notification.service.js`** – Create and dispatch notifications for matches, donations, milestones.

12. **`controllers/admin.controller.js` & `routes/admin.routes.js`**
   - Endpoints: GET /users, GET /requests, GET /donations, stats, moderation tools.
   - Mount at `/admin` with `authMiddleware + requireRole('admin')`.

### Phase 5 – Polish

13. **`utils/geo.js`** – Location-based matching functions.

14. **Tests** – Add test suite for auth, routes, services, error handling.

---

## 4. Quick Reference – What's Working Now vs What's Next

### ✅ What's Working Now
- **Auth signup/login/refresh** – Full authentication system with JWT tokens
- **User Models** – User, Donor, Hospital with proper inheritance and validation
- **Consistent API responses** – All responses follow `{ success, message, data? }` format
- **MongoDB integration** – Mongoose ODM with fallback for dev environments
- **Configuration management** – Environment variables validated at startup
- **Error handling foundation** – Response utility functions ready for use

### 🔴 What's Needed FIRST (Priority)

1. **`middlewares/error.middleware.js`** – 15-20 lines. Catches errors and returns JSON.
2. **`middlewares/auth.middleware.js`** – 15-20 lines. Verifies JWT and attaches `req.user`.
3. **`middlewares/role.middleware.js`** – 10 lines. Checks user role (donor/hospital/admin).

Then test by hitting `/me` (protected route) after login.

### After Middlewares
4. Implement Request, Donation, Notification models.
5. Build Donor and Hospital controllers/routes.
6. Implement matching and notification services.
7. Build Admin controller/routes.
8. Add tests.

**Estimated effort to Phase 1 completion: 1-2 hours** (just the 3 middlewares + wiring into app.js).
