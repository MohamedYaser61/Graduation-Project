# LifeLink Flutter Integration

## Base URL
- Local backend: `http://localhost:5000`
- Compatibility aliases: the same auth routes are also mounted under `/api/v1/auth/*`
- Swagger UI: `http://localhost:5000/api-docs` (development only)

## Required Headers
- `Content-Type: application/json`
- `Authorization: Bearer <accessToken>` for protected endpoints
- `x-test-mode: true` is development-only and bypasses auth rate limits for E2E/local testing

## Auth Flow
1. `POST /auth/signup` or `POST /auth/register`
2. Verify email with `POST /auth/verify-email-token`
3. `POST /auth/login`
4. If login returns `requires2FA: true`, complete `POST /auth/2fa/verify`
5. Keep the access token in memory/secure storage and refresh with `POST /auth/refresh-token`
6. Register the current FCM token with `POST /auth/fcm-token` after login and on token refresh

## JWT Usage
- Access token: signed with `JWT_SECRET`, sent as `Bearer <token>`
- Refresh token: signed with `JWT_REFRESH_SECRET` or `JWT_SECRET`, sent in the request body to refresh/logout endpoints
- Tokens issued before a password reset are rejected by auth middleware

<!-- Removed duplicate quick-reference table; consolidated below -->

## Request / Response Examples

### Login success
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "accessToken": "eyJ...",
    "refreshToken": "eyJ...",
    "access_token": "eyJ...",
    "refresh_token": "eyJ...",
    "user_id": "66f100000000000000000001",
    "user_role": "donor",
    "user_name": "Test Donor",
    "user": {
      "_id": "66f100000000000000000001",
      "fullName": "Test Donor",
      "email": "donor@test.com",
      "role": "donor"
    }
  }
}
```

### 2FA login challenge
```json
{
  "success": true,
  "message": "2FA verification required",
  "data": {
    "requires2FA": true,
    "tempToken": "eyJ...",
    "message": "2FA verification required"
  }
}
```

### Refresh token
```json
{
  "success": true,
  "message": "Token refreshed",
  "data": {
    "accessToken": "eyJ...",
    "access_token": "eyJ..."
  }
}
```

### FCM token registration
```json
{
  "success": true,
  "message": "FCM token registered successfully",
  "data": {
    "fcmToken": "fcm-device-token-from-flutter",
    "tokenCount": 1
  }
}
```

### Error format
```json
{
  "success": false,
  "message": "Invalid credentials"
}
```

## Demo / Test Accounts
- Seed script: `npm run seed`
  - Donor: `donor@test.com` / `SecurePass@123`
  - Hospital: `hospital@test.com` / `SecurePass@123`
- Full demo dataset: `npm run seed-demo` also seeds additional verified demo users and hospitals

## Startup
1. `npm install`
2. Set `.env` with at least `MONGO_URI` and `JWT_SECRET`
3. Start the backend: `npm start`
4. Optional for local testing: `npm run seed`
5. Health check: `GET /health`
6. Swagger UI is only available when `NODE_ENV !== 'production'`

## Notes
- Error responses use the same envelope as success responses: `success`, `message`, and optional `details`.
- Password reset, email verification, and 2FA tokens are short-lived, purpose-scoped tokens, not normal access JWTs.

## All Project Endpoints
Every route listed here is also available under the `/api/v1/*` compatibility prefix unless noted otherwise. Use `Authorization: Bearer <accessToken>` for protected endpoints.

### Operational
- GET /
- GET /health
- GET /api-docs (development only)
- GET /openapi.json (development only)

### Auth
- POST /auth/signup
- POST /auth/register
- POST /auth/login
- POST /auth/logout
- POST /auth/refresh-token
- POST /auth/validate-token
- POST /auth/forgot-password
- POST /auth/reset-password
- POST /auth/send-otp
- POST /auth/verify-otp
- POST /auth/verify-email
- POST /auth/verify-email-token
- POST /auth/2fa/setup
- POST /auth/2fa/confirm-setup
- POST /auth/2fa/verify
- POST /auth/2fa/disable
- POST /auth/fcm-token
- PUT /auth/fcm-token
- DELETE /auth/fcm-token

### Donor
- GET /donor/profile
- PUT /donor/profile
- GET /donor/requests
- GET /donor/matches
- POST /donor/respond/:requestId
- GET /donor/history
- PUT /donor/availability

### Hospital
- GET /hospital/profile
- PUT /hospital/profile
- POST /hospital/request
- GET /hospital/requests
- GET /hospital/requests/:requestId
- PUT /hospital/requests/:requestId
- DELETE /hospital/requests/:requestId
- GET /hospital/donations
- GET /hospital/blood-bank-settings
- PUT /hospital/blood-bank-settings
- GET /hospital/notification-preferences
- PUT /hospital/notification-preferences
- GET /hospital/reports/monthly
- GET /hospital/staff
- POST /hospital/staff
- DELETE /hospital/staff/:id

### Admin
- GET /admin/profile
- GET /admin/system/health
- POST /admin/system/maintenance
- GET /admin/system/maintenance
- GET /admin/statistics
- GET /admin/audit-logs
- GET /admin/users
- GET /admin/users/stats
- POST /admin/users/hospital
- GET /admin/users/:id
- PATCH /admin/users/:id/verify
- PATCH /admin/users/:id/unverify
- PATCH /admin/users/:id/suspend
- PATCH /admin/users/:id/unsuspend
- DELETE /admin/users/:id
- GET /admin/requests
- GET /admin/requests/stats
- GET /admin/requests/:id
- GET /admin/requests/:id/donations
- PATCH /admin/requests/:id/fulfill
- PATCH /admin/requests/:id/cancel
- POST /admin/requests/:id/broadcast
- GET /admin/analytics/dashboard
- GET /admin/analytics/donations
- GET /admin/analytics/blood-types
- GET /admin/analytics/top-donors
- GET /admin/analytics/growth
- POST /admin/emergency/broadcast
- GET /admin/emergency/critical
- GET /admin/emergency/shortage-alerts

### Notifications
- GET /notifications
- GET /notifications/:id
- PATCH /notifications/:id/read
- PATCH /notifications/read-all
- DELETE /notifications/:id

### Rewards
- GET /rewards/points
- GET /rewards/points/history
- GET /rewards/history
- GET /rewards/badges
- GET /rewards/catalog
- POST /rewards/catalog/:rewardId/redeem
- GET /rewards/redemptions
- GET /rewards/leaderboard
- POST /rewards/admin/users/:userId/points/adjust
- PATCH /rewards/admin/catalog/:rewardId/status
- GET /rewards/admin/analytics

### Discovery
- GET /hospitals
- GET /hospitals/nearby
- GET /hospitals/:id

### Help
- GET /help/faq
- GET /help/documents/:type

### Support
- POST /support/contact

Selected examples for common flows remain below.