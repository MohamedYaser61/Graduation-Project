# LifeLink Utils Guide

This document describes utility modules currently present under src/utils and how they are used by the backend.

## Utilities Summary

| File | Purpose | Status |
|---|---|---|
| jwt.js | JWT sign/verify helpers plus exported JWT error types | Implemented |
| response.js | Shared success/error JSON response helpers | Implemented |
| geo.js | Distance/proximity helper functions | Implemented (not deeply integrated) |

## JWT Utility

### Exported Functions

- signToken(payload, options)
- signRefreshToken(payload)
- verifyToken(token)
- TokenExpiredError
- JsonWebTokenError

### Usage Pattern

1. auth.service.js signs access and refresh tokens on signup/login.
2. auth.middleware.js verifies bearer token and stores decoded payload in req.user.
3. error.middleware.js maps JWT errors to 401 responses.

### Expected Payload Shape

Current auth flows issue token payloads that include:

- userId
- role

## Response Utility

### Exported Helpers

- success(res, statusCode, message, data)
- error(res, statusCode, message)

### Response Contract

Success responses:

- success: true
- message: string
- data: optional payload

Error responses:

- success: false
- message: string

This contract is used in controllers and middleware for consistent API responses.

## Geo Utility

### Available Helpers

- calculateDistance(loc1, loc2)
- findNearby(donors, location, radius)
- sortByProximity(donors, location)
- getLocationScore(distance, maxDistance)

### Current Integration Reality

- Matching service currently includes location placeholders but does not fully consume coordinate-based scoring end-to-end.
- geo.js is available for deeper proximity matching improvements.

## Practical Guidance

1. Use jwt.js only for JWT operations. Avoid direct jsonwebtoken calls in route handlers.
2. Use response.js in all controllers for consistent output schema.
3. Use geo.js when location objects include actual latitude/longitude coordinates.
