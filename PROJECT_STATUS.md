# LifeLink – Project Analysis & Next Moves

## 1. What’s Done ✅

| Area | File(s) | Status |
|------|---------|--------|
| **Config** | `config/env.js`, `config/db.js` | Complete. Env validation, MongoDB connect/disconnect, dev fallback without DB. |
| **Server** | `server.js`, `app.js` | Complete. Entry point, CORS, morgan, JSON body, `/` and `/test`, JSON 404 handler. |
| **User model** | `models/User.js` | Complete. Schema: name, email, password, role (admin/donor/hospital), timestamps. |
| **Repo** | `.env.example`, `.gitignore`, `README.md` | Present. |

---

## 2. What’s Missing or Broken 🔴

### 2.1 Broken (will error if used)

| File | Issue |
|------|--------|
| **`routes/auth.routes.js`** | Uses `signup`, `login`, `logout`, `refreshToken`, `forgotPassword`, `resetPassword`, `getMe`, `verifyEmail`, `verifyEmailToken` but **none are imported**. File will throw `ReferenceError` if loaded. Controllers are empty, so handlers don’t exist yet. |

### 2.2 Empty (placeholders only)

| Layer | Files | Notes |
|-------|--------|--------|
| **Models** | `Donor.js`, `Hospital.js`, `Request.js`, `Donation.js`, `Notification.js` | No schemas. Need to define and link to `User` where relevant. |
| **Controllers** | `auth.controller.js`, `donor.controller.js`, `hospital.controller.js`, `admin.controller.js` | No functions. Auth routes expect handlers from auth.controller. |
| **Services** | `auth.service.js`, `matching.service.js`, `donation.service.js`, `reward.service.js`, `notification.service.js` | No logic. |
| **Routes** | `donor.routes.js`, `hospital.routes.js`, `admin.routes.js` | Empty. Auth routes exist but aren’t mounted in `app.js`. |
| **Middlewares** | `auth.middleware.js`, `role.middleware.js`, `error.middleware.js` | No implementation. No global error handler in `app.js`. |
| **Utils** | `jwt.js`, `response.js`, `geo.js` | No helpers. JWT and response utils are needed for auth and API consistency. |

### 2.3 Not wired in app

- **API prefix** – `env.API_PREFIX` (`/api`) is not used; no `app.use(env.API_PREFIX, ...)`.
- **Auth routes** – Not mounted (and would crash if mounted due to missing handlers).
- **Error middleware** – No `app.use(errorHandler)` at the end to catch errors and send JSON.

---

## 3. Recommended Next Moves (in order)

### Phase 1 – Auth (so the app doesn’t crash and login/signup work)

1. **Utils**
   - **`utils/jwt.js`** – Implement `sign(payload)`, `verify(token)` using `env.JWT_SECRET` / `env.JWT_EXPIRES_IN`.
   - **`utils/response.js`** – Implement helpers e.g. `success(res, data, status)`, `error(res, message, status)` for consistent JSON responses.

2. **Auth service** – **`services/auth.service.js`**
   - `register(name, email, password, role)` – hash password (bcrypt), create User, return user (no password) + tokens.
   - `login(email, password)` – find user, compare password, return user + tokens.
   - `refreshToken(refreshToken)` – verify and issue new access token.
   - Optionally: `logout` (e.g. blacklist or nothing if stateless), `forgotPassword`, `resetPassword`, `getMe`, `verifyEmail` (can be stubs or later).

3. **Auth controller** – **`controllers/auth.controller.js`**
   - Implement `signup`, `login`, `logout`, `refreshToken`, `forgotPassword`, `resetPassword`, `getMe`, `verifyEmail`, `verifyEmailToken`.
   - Each calls auth.service and uses `utils/response.js` to send JSON.

4. **Auth routes**
   - In **`routes/auth.routes.js`**: import handlers from auth.controller and fix duplicate `verifyEmailToken` route.
   - In **`app.js`**: mount auth router:  
     `app.use(env.API_PREFIX + '/auth', authRoutes)`  
   - Ensure auth routes are registered **before** the 404 handler.

5. **Error middleware** – **`middlewares/error.middleware.js`**
   - Central handler: `(err, req, res, next) => { ... res.status(err.status || 500).json({ error: err.message }) }`.
   - In **`app.js`**: add this middleware **last** (after 404) so all errors return JSON.

6. **Auth middleware** – **`middlewares/auth.middleware.js`**
   - Verify JWT from `Authorization: Bearer <token>` or cookie, attach `req.user`, call `next()` or 401.
   - Use for protected routes (e.g. `/me`, donor/hospital/admin routes later).

7. **User model**
   - Add `select: false` to the password field so it’s not returned by default; explicitly select when checking password.

After this: signup and login work, `/api/auth/*` is under API prefix, errors are JSON, and protected routes can use `auth.middleware`.

---

### Phase 2 – Donor & Hospital models and APIs

8. **Models**
   - **Donor** – e.g. `userId` (ref User), bloodType, lastDonation, location/geo, eligibility, etc.
   - **Hospital** – e.g. `userId` (ref User), name, address, location, contact, etc.
   - **Request** – e.g. hospital, type (blood/organ), urgency, status, requiredBy, etc.
   - **Donation** – e.g. donor, request, date, status.
   - **Notification** – e.g. user, type, message, read, createdAt.

9. **Utils**
   - **`utils/geo.js`** – e.g. `distanceBetween(lat1, lon1, lat2, lon2)` for matching by distance.

10. **Donor/Hospital routes and controllers**
    - Implement donor and hospital controllers/services and routes; mount under `/api/donor` and `/api/hospital` with auth (and optionally role) middleware.

11. **Role middleware** – **`middlewares/role.middleware.js`**
    - `requireRole('donor' | 'hospital' | 'admin')` – check `req.user.role`, 403 if not allowed.
    - Use on donor-only, hospital-only, and admin-only routes.

---

### Phase 3 – Matching, donations, rewards, notifications

12. **Matching service** – **`services/matching.service.js`**
    - Find donors matching a request (e.g. blood type, location, eligibility) using Request + Donor + geo.

13. **Donation & reward services**
    - **donation.service.js** – create/update donations, link to request and donor.
    - **reward.service.js** – e.g. points or badges for donors (optional).

14. **Notification service** – **`notification.service.js`**
    - Create/send notifications when requests match, donations completed, etc.

15. **Admin routes**
    - **admin.controller.js** + **admin.routes.js** – list users, requests, donations; moderate; stats. Mount under `/api/admin` with auth + `requireRole('admin')`.

---

## 4. Quick reference – what to do first

1. Implement **utils/jwt.js** and **utils/response.js**.  -- Done
2. Implement **services/auth.service.js** and **controllers/auth.controller.js**.
3. Fix **routes/auth.routes.js** (import controller handlers; fix duplicate route).
4. Mount auth routes in **app.js** with `API_PREFIX + '/auth'`.
5. Add **error.middleware.js** and register it last in **app.js**.
6. Add **auth.middleware.js** and use it on protected routes (e.g. `/me`).
7. Optionally add **role.middleware.js** and use where needed.

After Phase 1, the app has working auth, consistent responses, and a clear path for donor, hospital, matching, and admin features.
