# Authentication Implementation Guide

Last Updated: April 8, 2026

## Scope

This guide reflects the current authentication state in code, including implemented functionality, partial implementations, and known gaps.

## Implemented Auth Endpoints

| Method | Path | Current Behavior |
|---|---|---|
| POST | /auth/signup | Registers donor/hospital with validation and discriminator model creation |
| POST | /auth/login | Validates credentials and issues access/refresh tokens |
| POST | /auth/logout | Returns success response (no token blacklist persistence) |
| POST | /auth/refresh-token | Verifies refresh token and issues a new access token |
| POST | /auth/forgot-password | Endpoint exists, service logic is stubbed |
| POST | /auth/reset-password | Endpoint exists, service logic is stubbed |
| GET | /auth/me | Returns authenticated user payload |
| GET | /auth/verify-email | Endpoint exists, service logic is stubbed |
| GET | /auth/verify-email-token | Endpoint exists, service logic is stubbed |

## What Is Working Well

### 1. Role-Aware Registration

- Registration uses donor/hospital discriminator models rather than base user creation.
- Validation layer enforces role-specific required fields before persistence.
- Passwords are hashed before storage.

### 2. Token Strategy

- Access and refresh tokens are both generated.
- JWT payload includes userId and role.
- Auth middleware validates bearer tokens and attaches decoded payload to request context.

### 3. Standardized Responses

- Controllers consistently use shared response helpers for success/error JSON shape.

## Known Limitations

1. forgot-password and reset-password are endpoint-complete but not fully implemented.
2. verify-email and verify-email-token are endpoint-complete but not fully implemented.
3. verify-email routes are currently GET while controller methods read request body values.
4. logout does not currently persist refresh-token revocation.

## Validation Coverage for Signup

### Base fields

- fullName required with length checks.
- email required with format checks.
- password required with complexity rules.
- role required and restricted to donor or hospital.

### Donor-specific fields

- phoneNumber required, 10-digit validation.
- dateOfBirth required and must be in the past.
- gender optional with enum validation.

### Hospital-specific fields

- hospitalName required.
- hospitalId required numeric.
- licenseNumber required.

## Recommended Next Auth Improvements

1. Implement real password reset token issue and verification flow.
2. Implement email verification token issue and verification flow.
3. Align verify-email endpoint method and payload handling (GET vs POST semantics).
4. Add refresh token storage/blacklisting strategy for logout and session invalidation.
5. Add unit tests for auth validation and integration tests for full auth flow.
