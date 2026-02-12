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

### 1. Project Architecture & Setup ✅

- **Complete folder structure** under `src/` organized by domain:
  - **config** – environment validation and MongoDB connection
  - **models** – User, Donor, Hospital (complete with Mongoose discriminators)
  - **controllers** – auth (complete), donor/hospital/admin (route protection ready)
  - **services** – auth (complete), others pending
  - **routes** – auth, donor, hospital, admin (all wired with protection)
  - **middlewares** – auth, role, error (all implemented)
  - **utils** – jwt, response (complete); geo (pending)
  - **app.js** – Express app with all middleware and routes
  - **server.js** – entry point with graceful startup

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

### 5. Complete Authentication System ✅

**Models:**
- **`User.model.js`** – Base schema with fullName, email, password (bcrypt hashed), role (admin/donor/hospital), timestamps. Uses Mongoose discriminators for inheritance.
- **`Donor.model.js`** – Extends User with phoneNumber, bloodType (8 types), gender, lastDonationDate, isAvailable, location (city, governorate).
- **`Hospital.model.js`** – Extends User with hospitalName, hospitalId, licenseNumber, address, contactNumber.

**Service Layer:**
- **`auth.service.js`** – Business logic for: register, login, logout, refreshToken, forgotPassword, resetPassword, getMe, verifyEmail, verifyEmailToken. Handles password hashing and JWT generation.

**Controller & Routes:**
- **`auth.controller.js`** – Request handlers for all auth operations with proper error handling.
- **`auth.routes.js`** – Mounted at `/auth` with endpoints:
  - POST: `/signup`, `/login`, `/logout`, `/refresh-token`, `/forgot-password`, `/reset-password`
  - GET: `/me` (protected), `/verify-email`, `/verify-email-token`

### 6. Security & Protection Layer ✅

**Middlewares:**
- **`auth.middleware.js`** – JWT verification from `Authorization: Bearer <token>` header. Attaches `req.user` with decoded payload. Returns 401 for missing/invalid/expired tokens.
- **`role.middleware.js`** – Role-based authorization factory `requireRole(role)`. Checks `req.user.role` against required role. Returns 403 for unauthorized access.
- **`error.middleware.js`** – Global error handler that:
  - Catches all errors and returns consistent JSON format
  - Maps JWT errors (expired/invalid) to 401
  - Handles Mongoose validation errors with field details
  - Handles duplicate key errors (MongoDB 11000)
  - Prevents internal error leakage in production

**Protected Route Groups:**
- **`donor.routes.js`** – Mounted at `/donor` with auth + donor role protection. Placeholder `/profile` endpoint ready.
- **`hospital.routes.js`** – Mounted at `/hospital` with auth + hospital role protection. Placeholder `/profile` endpoint ready.
- **`admin.routes.js`** – Mounted at `/admin` with auth + admin role protection. Placeholder `/profile` endpoint ready.

### 7. Repository Management

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
│   │   ├── db.js                    # ✅ MongoDB connect/disconnect with dev fallback
│   │   └── env.js                   # ✅ Env validation and loading
│   ├── models/
│   │   ├── User.model.js            # ✅ Base user model with discriminators
│   │   ├── Donor.model.js           # ✅ Donor-specific fields (bloodType, location, etc.)
│   │   ├── Hospital.model.js        # ✅ Hospital-specific fields
│   │   ├── Request.model.js         # 🔴 Pending - Blood/organ donation requests
│   │   ├── Donation.model.js        # 🔴 Pending - Donation records
│   │   └── Notification.model.js    # 🔴 Pending - User notifications
│   ├── controllers/
│   │   ├── auth.controller.js       # ✅ Complete auth request handlers
│   │   ├── donor.controller.js      # 🔴 Pending - Donor features
│   │   ├── hospital.controller.js   # 🔴 Pending - Hospital features
│   │   └── admin.controller.js      # 🔴 Pending - Admin features
│   ├── services/
│   │   ├── auth.service.js          # ✅ Complete auth business logic
│   │   ├── matching.service.js      # 🔴 Pending - Donor-request matching
│   │   ├── donation.service.js      # 🔴 Pending - Donation management
│   │   ├── reward.service.js        # 🔴 Pending - Donor rewards/gamification
│   │   └── notification.service.js  # 🔴 Pending - Notification system
│   ├── routes/
│   │   ├── auth.routes.js           # ✅ All auth endpoints (9 routes)
│   │   ├── donor.routes.js          # ✅ Protected route group ready
│   │   ├── hospital.routes.js       # ✅ Protected route group ready
│   │   └── admin.routes.js          # ✅ Protected route group ready
│   ├── middlewares/
│   │   ├── auth.middleware.js       # ✅ JWT verification middleware
│   │   ├── role.middleware.js       # ✅ Role-based access control
│   │   └── error.middleware.js      # ✅ Global error handler
│   ├── utils/
│   │   ├── jwt.js                   # ✅ JWT signing and verification
│   │   ├── response.js              # ✅ Consistent API responses
│   │   ├── geo.js                   # 🔴 Pending - Location utilities
│   │   └── README.md                # ✅ Utils documentation
│   ├── app.js                       # ✅ Express app with all routes/middleware
│   └── server.js                    # ✅ Entry point with env validation
├── .env.example                     # ✅ Environment template
├── .gitignore                       # ✅ Git ignore rules
├── package.json                     # ✅ Dependencies and scripts
├── README.md                        # ✅ This file
├── PROJECT_STATUS.md                # ✅ Detailed development status
└── PHASES_DOCUMENTATION.md          # ✅ Phase 1 implementation guide
```

**Legend:**
- ✅ Complete and production-ready
- 🔴 Pending implementation (structure in place)

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
