# LifeLink

A backend API for a life-saving donation platform—connecting donors, hospitals, and donation requests (e.g. blood, organs). Built with **Node.js**, **Express 5**, and **MongoDB** (Mongoose).

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [What We've Done So Far](#what-weve-done-so-far)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Scripts](#scripts)
- [Environment Variables](#environment-variables)
- [Project Structure](#project-structure)
- [Utils: JWT & Response](#utils-jwt--response)
- [Current Status](#current-status)
- [Next Steps](#next-steps)

---

## Tech Stack

| Category   | Technology |
|-----------|------------|
| Runtime   | Node.js (ES modules) |
| Framework | Express 5 |
| Database  | MongoDB (Mongoose 9) |
| Auth      | JWT (jsonwebtoken), bcryptjs |
| Other     | dotenv, cors, morgan |

---

## What We've Done So Far

### 1. Project skeleton

- Created the full folder structure under `src/`:
  - **config** – environment and database
  - **models** – User, Donor, Hospital, Request, Donation, Notification (files are placeholders)
  - **controllers** – auth, donor, hospital, admin (placeholders)
  - **services** – auth, matching, donation, reward, notification (placeholders)
  - **routes** – auth, donor, hospital, admin (placeholders)
  - **middlewares** – auth, role, error (placeholders)
  - **utils** – jwt, response (implemented); geo (placeholder)
  - **app.js** – Express app
  - **server.js** – entry point that starts the server

### 2. Environment & config

- **`src/config/env.js`**
  - Loads variables from `.env` via `dotenv`.
  - Exports a single `env` object with: `NODE_ENV`, `PORT`, `MONGODB_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN`, `API_PREFIX`, `CORS_ORIGIN`.
  - Provides `validateEnv()` which **requires** `MONGODB_URI` and `JWT_SECRET`; throws a clear error if either is missing.

- **`src/config/db.js`**
  - `connectDB()` – connects to MongoDB with Mongoose (pool size 10, 5s timeout).
  - Subscribes to `error` and `disconnected` on the connection.
  - **Development only:** if MongoDB is not running, the app logs a warning and **continues without the DB** so you can run the server without a local MongoDB.
  - **Production:** if the connection fails, the process exits with code 1.
  - `disconnectDB()` – for graceful shutdown or tests.

### 3. App bootstrap

- **`src/app.js`**
  - Creates the Express app.
  - Uses: `cors` (origin from env), `morgan` (dev/combined by NODE_ENV), `express.json()`.
  - Registers a **`GET /health`** route that returns `{ "status": "ok" }`.
  - No API routes or error middleware yet (to be added when we wire routes).

- **`src/server.js`**
  - Calls `validateEnv()` then `connectDB()`.
  - Starts the HTTP server on `env.PORT` (default 3000).
  - This is the **only entry point** for running the app (`npm start` and `npm run dev` both use it).

### 4. Utils (JWT & response)

- **`src/utils/jwt.js`**
  - **`signToken(payload, options?)`** – Signs a JWT with `env.JWT_SECRET` and default `env.JWT_EXPIRES_IN`; optional `options.expiresIn` override.
  - **`signRefreshToken(payload)`** – Signs a refresh token using `env.JWT_REFRESH_EXPIRES_IN`.
  - **`verifyToken(token)`** – Verifies a JWT and returns the decoded payload; throws if token is missing, invalid, or expired.
  - Re-exports **`TokenExpiredError`** and **`JsonWebTokenError`** so middleware can return distinct messages (e.g. “Token expired” vs “Invalid token”).
  - All JWT config and logic live here; controllers and middleware use these functions instead of calling `jsonwebtoken` directly.

- **`src/utils/response.js`**
  - **`successResponse(res, statusCode, message, data?)`** – Sends `{ success: true, message, data? }` with the given status code.
  - **`errorResponse(res, statusCode, message)`** – Sends `{ success: false, message }` with the given status code.
  - Ensures a **consistent API response shape** so the frontend can rely on the same structure for every JSON success and error.

Detailed docs (mental model, flow diagrams, usage examples, anti-patterns, auth vs authorization): **`src/utils/README.md`**.

### 5. Auth system (Models, Service, Controller, Routes) ✅ **Implemented**

- **`src/models/User.model.js`** – Complete schema with fullName, email, password (with bcrypt), role (admin/donor/hospital), and timestamps. Uses Mongoose discriminators for role-based inheritance.
- **`src/models/Donor.model.js`** – Extends User model with donor-specific fields: phoneNumber, bloodType (A+, A-, B+, B-, AB+, AB-, O+, O-), gender, lastDonationDate, isAvailable, location (city, governrate).
- **`src/models/Hospital.model.js`** – Extends User model with hospital-specific fields: hospitalName, hospitalId, licenseNumber, address, contactNumber.
- **`src/services/auth.service.js`** – Implements: register, login, logout, refreshToken, forgotPassword, resetPassword, getMe, verifyEmail, verifyEmailToken. Includes bcrypt password hashing and JWT token generation.
- **`src/controllers/auth.controller.js`** – Handles: signup, login, logout, refreshToken, forgotPassword, resetPassword, getMe, verifyEmail, verifyEmailToken. Uses auth service and response utilities.
- **`src/routes/auth.routes.js`** – Mounted at `/auth` in app.js with all auth endpoints (POST /signup, /login, /logout, /refresh-token, /forgot-password, /reset-password, GET /me, /verify-email, /verify-email-token).

### 6. Repo hygiene

- **`.env.example`** – template with all supported env vars and example values.
- **`.gitignore`** – ignores `node_modules/`, `.env`, `.env.local`, `*.log`, `.DS_Store` so secrets and noise are not committed.

---

## Prerequisites

- **Node.js** (v18+ recommended; we use ES modules).
- **MongoDB** (optional for development—server will start without it; required for real data and production).
- **npm** (comes with Node).

---

## Getting Started

### 1. Clone and install

```bash
git clone <repo-url>
cd LifeLink
npm install
```

### 2. Environment file

Copy the example env and set at least the required variables:

```bash
cp .env.example .env
```

Edit `.env` and set:

- **`JWT_SECRET`** – required. Use a long random string (e.g. generated with `openssl rand -hex 32`). Never commit this.
- **`MONGODB_URI`** – optional for local dev if you don’t have MongoDB; default is `mongodb://localhost:27017/lifelink`.

See [Environment Variables](#environment-variables) for the full list.

### 3. (Optional) Start MongoDB

If you want the app to use the database:

- Start MongoDB locally (e.g. `mongod`), or  
- Use a cloud URI in `MONGODB_URI` (e.g. MongoDB Atlas).

If you skip this, the server still starts in development and logs that it’s continuing without the database.

### 4. Run the server

```bash
npm start
```

Or, for auto-restart on file changes (requires `nodemon`):

```bash
npm run dev
```

### 5. Verify

- Open **http://localhost:3000**
- Or hit the health check: **http://localhost:3000/health** → should return `{"status":"ok"}`

---

## Scripts

| Command        | Description |
|----------------|-------------|
| `npm start`    | Run the server: `node src/server.js` |
| `npm run dev`  | Run with nodemon: restarts on file changes (uses `src/server.js`) |
| `npm test`     | Placeholder; no tests yet |

For `npm run dev` you need **nodemon** (e.g. `npm install -D nodemon`).

---

## Environment Variables

| Variable             | Required | Default                          | Description |
|----------------------|----------|----------------------------------|-------------|
| `NODE_ENV`           | No       | `development`                    | `development` / `production` (and optionally `test`) |
| `PORT`               | No       | `3000`                           | HTTP server port |
| `MONGODB_URI`        | Yes*     | `mongodb://localhost:27017/lifelink` | MongoDB connection URL |
| `JWT_SECRET`         | Yes      | —                                | Secret for signing JWTs; must be set |
| `JWT_EXPIRES_IN`     | No       | `7d`                             | Access token expiry (e.g. `7d`, `24h`) |
| `JWT_REFRESH_EXPIRES_IN` | No  | `30d`                        | Refresh token expiry |
| `API_PREFIX`         | No       | `/api`                           | Intended prefix for API routes (not yet applied in app) |
| `CORS_ORIGIN`        | No       | `*`                              | CORS allowed origin(s) |

\* Validated at startup; in development the app can continue without DB if the connection fails.

---

## Project Structure

```
LifeLink/
├── src/
│   ├── config/
│   │   ├── db.js          # MongoDB connect / disconnect (done)
│   │   └── env.js         # Env loading and validation (done)
│   ├── models/            # Mongoose models (placeholders)
│   │   ├── User.js
│   │   ├── Donor.js
│   │   ├── Hospital.js
│   │   ├── Request.js
│   │   ├── Donation.js
│   │   └── Notification.js
│   ├── controllers/       # Route handlers (placeholders)
│   │   ├── auth.controller.js
│   │   ├── donor.controller.js
│   │   ├── hospital.controller.js
│   │   └── admin.controller.js
│   ├── services/          # Business logic (placeholders)
│   │   ├── auth.service.js
│   │   ├── matching.service.js
│   │   ├── donation.service.js
│   │   ├── reward.service.js
│   │   └── notification.service.js
│   ├── routes/            # Express routers (placeholders)
│   │   ├── auth.routes.js
│   │   ├── donor.routes.js
│   │   ├── hospital.routes.js
│   │   └── admin.routes.js
│   ├── middlewares/       # Auth, roles, error handling (placeholders)
│   │   ├── auth.middleware.js
│   │   ├── role.middleware.js
│   │   └── error.middleware.js
│   ├── utils/             # Helpers
│   │   ├── jwt.js         # JWT sign/verify (done)
│   │   ├── response.js    # successResponse / errorResponse (done)
│   │   ├── geo.js         # (placeholder)
│   │   └── README.md      # Utils guide: JWT, response, flows, examples
│   ├── app.js             # Express app + middleware + /health (done)
│   └── server.js          # Entry: validateEnv → connectDB → listen (done)
├── .env.example           # Env template (done)
├── .gitignore             # Ignore .env, node_modules, etc. (done)
├── package.json
└── README.md              # This file
```

---

## Utils: JWT & Response

Two utility modules are implemented for production use:

| Utility | Purpose |
|--------|---------|
| **`utils/jwt.js`** | Centralizes JWT signing and verification. Use `signToken` / `signRefreshToken` after login; use `verifyToken` in auth middleware. Uses `env.JWT_SECRET` and `env.JWT_EXPIRES_IN` (no hardcoded secrets). |
| **`utils/response.js`** | Centralizes API response shape. Use `successResponse(res, status, message, data?)` and `errorResponse(res, status, message)` in controllers so every JSON response has the same structure (`success`, `message`, optional `data`). |

**Quick usage**

- **Login (controller):** `const token = signToken({ userId: user._id, role: user.role });` then `successResponse(res, 200, 'Logged in', { token })`.
- **Protected route (middleware):** `const decoded = verifyToken(bearerToken); req.user = decoded; next();` — catch `TokenExpiredError` / `JsonWebTokenError` and return `errorResponse(res, 401, '...')`.
- **Any controller:** `successResponse(res, 200, 'Ok', data)` or `errorResponse(res, 404, 'Not found')`.

For full details (why centralize, flow diagrams, examples, anti-patterns, authentication vs authorization), see **`src/utils/README.md`**.

---

## Current Status

| Area              | Status | Notes |
|-------------------|--------|--------|
| Config (env, db)  | ✅ Done   | Env validation, DB connect/disconnect, dev fallback without DB |
| App bootstrap     | ✅ Done   | Express app, CORS, morgan, JSON, `/health` route |
| Server entry      | ✅ Done   | `server.js` is the single entry point |
| **Auth System**   | ✅ **Done** | **User, Donor, Hospital models** + **Auth service** + **Auth controller** + **Auth routes** (full signup/login/refresh/password flow) |
| Utils             | ✅ Done     | `jwt.js` and `response.js` fully implemented; `geo.js` placeholder |
| Middlewares       | 🔴 Placeholder | `auth.middleware.js`, `role.middleware.js`, `error.middleware.js` – not yet implemented |
| Models            | 🟡 Partial | User, Donor, Hospital done; Request, Donation, Notification empty |
| Controllers       | 🟡 Partial | Auth done; Donor, Hospital, Admin controllers empty |
| Services          | 🔴 Placeholder | Matching, Donation, Reward, Notification services empty |
| Routes            | 🟡 Partial | Auth routes done and mounted; Donor, Hospital, Admin routes empty |
| Tests             | None   | `npm test` is a placeholder |

The project **runs**, connects to MongoDB, validates auth, and has a **working signup/login system** with user roles (donor, hospital, admin). Auth routes are fully functional. Next priorities: implement middlewares, complete remaining models, and build donor/hospital/admin features.

---

## Next Steps

Suggested order for the team:

1. **Middlewares** – Implement `auth.middleware.js` (verify JWT from Authorization header), `role.middleware.js` (check user role), and `error.middleware.js` (centralized error handler); then plug them into `app.js`.
2. **Remaining Models** – Complete `Request.model.js`, `Donation.model.js`, `Notification.model.js` with full schemas and relationships.
3. **Donor/Hospital Controllers & Routes** – Implement `donor.controller.js`, `hospital.controller.js` and their routes; mount under `/donor` and `/hospital` with auth middleware.
4. **Services** – Implement `matching.service.js`, `donation.service.js`, `reward.service.js`, `notification.service.js` for business logic.
5. **Admin Controller & Routes** – Implement `admin.controller.js` for user/request/donation management; mount under `/admin` with auth + `requireRole('admin')` middleware.
6. **Utils** – Implement `geo.js` for location-based matching and distance calculations.
7. **Tests** – Add test suite (auth, endpoints, services, error handling).


