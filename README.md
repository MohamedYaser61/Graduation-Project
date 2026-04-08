# LifeLink Backend API

LifeLink is a Node.js and Express backend for donor and hospital workflows, covering authentication, donation requests, donor matching, donation responses, and donation tracking.

This README is code-accurate as of April 8, 2026.

## Tech Stack

| Category | Technology |
|---|---|
| Runtime | Node.js (ESM) |
| Framework | Express 5 |
| Database | MongoDB + Mongoose |
| Auth | JWT + bcryptjs |
| API Docs | swagger-jsdoc + swagger-ui-express |

## Current Implementation Snapshot

| Area | Status | Notes |
|---|---|---|
| Authentication core (signup/login/me/refresh) | Complete | JWT access + refresh token flow implemented |
| Donor APIs | Complete | Profile, requests, matches, respond, history, availability |
| Hospital APIs | Complete | Profile, request create/list/update/cancel, donation listing |
| Matching service | Complete | Blood compatibility and eligibility rules implemented |
| Donation lifecycle service | Implemented (internal) | Service exists, not exposed as dedicated public routes |
| Notification service | Implemented (internal) | Triggered on donor response to hospital request |
| Admin APIs | Minimal | Only protected profile endpoint exists |
| Reward service | Not implemented | File exists but empty |
| Automated tests | Not implemented | npm test is placeholder |

## Architecture

Project structure reflects a layered backend:

- src/config: environment, database, Swagger setup
- src/models: User/Donor/Hospital plus Request/Donation/Notification
- src/routes: Auth, Donor, Hospital, Admin route groups
- src/controllers: HTTP handlers
- src/services: business logic for auth, matching, donation, notification
- src/middlewares: auth, role-based access, global error handling
- src/utils: JWT, standardized responses, geo helpers
- src/validation: auth input validation rules

## API Base Paths

The server mounts route groups directly (no /api prefix):

- /auth
- /donor
- /hospital
- /admin

Other utility endpoints:

- GET /
- GET /test
- POST /debug
- GET /api-docs
- GET /openapi.json

## Endpoint Coverage

### Auth Endpoints

| Method | Path | Protection | State |
|---|---|---|---|
| POST | /auth/signup | Public | Implemented |
| POST | /auth/login | Public | Implemented |
| POST | /auth/logout | Public | Implemented (service stub behavior) |
| POST | /auth/refresh-token | Public | Implemented |
| POST | /auth/forgot-password | Public | Stubbed logic |
| POST | /auth/reset-password | Public | Stubbed logic |
| GET | /auth/me | Bearer token | Implemented |
| GET | /auth/verify-email | Public | Stubbed logic, expects query parameter: email |
| GET | /auth/verify-email-token | Public | Stubbed logic, expects query parameter: token |

### Donor Endpoints

All donor endpoints require Bearer token and donor role.

| Method | Path | State |
|---|---|
| GET | /donor/profile | Implemented |
| PUT | /donor/profile | Implemented |
| GET | /donor/requests | Implemented |
| GET | /donor/matches | Implemented |
| POST | /donor/respond/:requestId | Implemented |
| GET | /donor/history | Implemented |
| PUT | /donor/availability | Implemented |

### Hospital Endpoints

All hospital endpoints require Bearer token and hospital role.

| Method | Path | State |
|---|---|
| GET | /hospital/profile | Implemented |
| PUT | /hospital/profile | Implemented |
| POST | /hospital/request | Implemented |
| GET | /hospital/requests | Implemented |
| GET | /hospital/requests/:requestId | Implemented |
| PUT | /hospital/requests/:requestId | Implemented |
| DELETE | /hospital/requests/:requestId | Implemented |
| GET | /hospital/donations | Implemented |

### Admin Endpoints

All admin endpoints require Bearer token and admin role.

| Method | Path | State |
|---|---|
| GET | /admin/profile | Implemented (placeholder response) |

## Donation Flow Implemented

1. Hospital creates request via /hospital/request.
2. Donor fetches opportunities via /donor/requests or ranked matches via /donor/matches.
3. Donor responds via /donor/respond/:requestId.
4. System validates eligibility and creates Donation record.
5. Notification service creates hospital notification for the match.
6. Hospital monitors request details and donations through /hospital/requests/:requestId and /hospital/donations.
7. Hospital can update/cancel requests.

## Environment Variables

| Variable | Required | Default |
|---|---|---|
| NODE_ENV | No | development |
| PORT | No | 5000 |
| MONGODB_URI | Production: Yes, Development: No | mongodb://localhost:27017/lifelink |
| JWT_SECRET | Yes | none |
| JWT_EXPIRES_IN | No | 7d |
| JWT_REFRESH_EXPIRES_IN | No | 30d |
| API_PREFIX | No | /api (currently not applied in route mounting) |
| CORS_ORIGIN | No | * |
| BCRYPT_SALT_ROUNDS | No | 10 |

## Run Locally

1. Install dependencies: npm install
2. Create .env and set at least JWT_SECRET. Set MONGODB_URI in production; in development it defaults to mongodb://localhost:27017/lifelink when omitted.
3. Start development server: npm run dev
4. Open API docs at /api-docs

## Scripts

| Command | Description |
|---|---|
| npm start | Run server |
| npm run dev | Run server with nodemon |
| npm run generate:openapi | Generate OpenAPI artifact |
| npm test | Placeholder, currently fails intentionally |

## Important Notes

- Some auth features are endpoint-complete but business logic is still stubbed: forgot/reset password and email verification.
- Notification and donation services are implemented as internal services; they are not fully exposed through dedicated REST modules.
- Admin controller functionality is intentionally minimal in current state.
