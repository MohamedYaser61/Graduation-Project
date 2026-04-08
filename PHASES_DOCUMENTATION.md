# LifeLink Phase Documentation

Last Updated: April 8, 2026

## Phase Overview

| Phase | Name | Current Status |
|---|---|---|
| 1 | Foundation and Security | Complete |
| 2 | Core Domain Modeling | Complete |
| 3 | Donor and Hospital Product Flows | Complete |
| 4 | Platform Hardening and Expansion | In progress |

## Phase 1: Foundation and Security

### Objective

Establish reliable backend infrastructure and enforce authentication/authorization boundaries.

### Delivered

- Environment loading and startup validation.
- MongoDB connection module with development fallback behavior.
- JWT-based auth middleware.
- Role-based middleware for donor, hospital, and admin route groups.
- Consistent API response helper and centralized error middleware.
- Server bootstrap with CORS, logging, JSON parser, route mounting, and 404 handler.

### Outcome

Application starts correctly, validates key configuration, and protects role-specific APIs.

## Phase 2: Core Domain Modeling

### Objective

Model users, donation requests, donor responses, and notification events.

### Delivered

- Base User model with role-discriminator architecture.
- Donor and Hospital specialized models.
- Request model with type, urgency, status, and deadline validation.
- Donation model to track donor response lifecycle.
- Notification model for match/request/milestone events.
- Indexes added on operational query dimensions.

### Outcome

Database structure supports full request-to-donation domain behavior.

## Phase 3: Donor and Hospital Product Flows

### Objective

Implement the real operational workflow between hospitals and donors.

### Delivered

- Hospital flow:
  - Profile read/update.
  - Create request with domain validation.
  - List owned requests.
  - View request details with associated donor responses.
  - Update or cancel request.
  - List donations related to hospital requests.
- Donor flow:
  - Profile read/update.
  - List active requests.
  - Retrieve matched requests.
  - Respond to a request.
  - Retrieve donation history.
  - Update availability status.
- Services:
  - Matching service with blood compatibility and eligibility checks.
  - Donation service methods for lifecycle/statistics operations.
  - Notification service with notification creation and management helpers.

### Outcome

The core request, match, and donation flow is fully represented in API routes and controllers.

## Phase 4: Platform Hardening and Expansion

### Objective

Close capability gaps for production readiness and platform completeness.

### In Progress or Pending

- Expand admin module beyond profile placeholder endpoint.
- Implement reward system (reward.service.js currently empty).
- Complete auth subflows currently implemented as stubs:
  - forgot password
  - reset password
  - verify email
  - verify email token
- Add dedicated notification API routes for list/read/delete operations.
- Add automated tests and quality gates.
- Add security hardening (rate limits, security headers).

## API Group Status by Phase

| API Group | Phase Delivered | Status |
|---|---|---|
| /auth core (signup, login, me, refresh) | Phase 1 | Complete |
| /auth recovery and verification | Phase 4 | Partial |
| /donor | Phase 3 | Complete |
| /hospital | Phase 3 | Complete |
| /admin | Phase 4 | Minimal |

## Practical Definition of Done per Phase

- Phase 1 done: service boots safely and role-protected route groups enforce authorization.
- Phase 2 done: all main domain entities exist with validation and query indexes.
- Phase 3 done: donor and hospital operational APIs are implemented and connected.
- Phase 4 done criteria (remaining): admin APIs, reward engine, non-stub auth recovery, tests, and hardening.
