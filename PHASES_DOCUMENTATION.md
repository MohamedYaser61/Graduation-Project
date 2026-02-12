# PHASES_DOCUMENTATION

## Overview
This document explains **Phase 1: Middlewares (so protected routes work)** in the LifeLink backend.

It is written as a full implementation guide for a junior developer, covering what problem this phase solves, how it was implemented, and how to validate it.

---

## Phase 1 - Middlewares (Protected Routing Foundation)

### 1. Phase Title and Objective
**Phase Title:** Middlewares (Authentication, Authorization, Global Error Handling)

**Objective:**
Build the middleware layer that enables secure route protection and consistent error responses across the API.

By the end of this phase, the backend should:
- Authenticate users via JWT in the `Authorization` header.
- Authorize users by role (`donor`, `hospital`, `admin`).
- Handle known and unknown errors in a unified JSON format.
- Protect `/auth/me`, donor routes, hospital routes, and admin routes.

---

### 2. Problem Description
Before this phase, the app had auth endpoints but no middleware enforcement on protected endpoints.

Key problems:
- Routes like `/auth/me` relied on `req.user`, but `req.user` was never guaranteed to exist.
- Donor/hospital/admin route modules were empty and not wired for security.
- No centralized error handler to normalize failures.
- 404 responses had a different shape than other API errors.

This created inconsistent behavior and made frontend integration harder.

---

### 3. Initial State of the Codebase Before This Phase

#### Already available
- JWT utility in `src/utils/jwt.js`:
  - `verifyToken(token)`
  - Re-exported JWT error types:
    - `TokenExpiredError`
    - `JsonWebTokenError`
- Response helper in `src/utils/response.js`:
  - `response.success(...)`
  - `response.error(...)`
- Auth routes and controller existed.

#### Missing / incomplete before phase
- `src/middlewares/auth.middleware.js` was empty.
- `src/middlewares/role.middleware.js` was empty.
- `src/middlewares/error.middleware.js` was empty.
- `src/routes/donor.routes.js` was empty.
- `src/routes/hospital.routes.js` was empty.
- `src/routes/admin.routes.js` was empty.
- `src/app.js` had a raw 404 JSON response and no global error middleware.
- `/auth/me` was not protected by auth middleware.

---

### 4. Step-by-Step Implementation Breakdown

#### Step 1: Implement authentication middleware
File: `src/middlewares/auth.middleware.js`

What was implemented:
1. Read `Authorization` header.
2. Validate header existence and format (`Bearer <token>`).
3. Verify token using `verifyToken(token)` from JWT utils.
4. Attach decoded payload to `req.user`.
5. Return `401` for missing, invalid, or expired tokens.

Why this matters:
- All downstream handlers can trust `req.user` exists when auth passes.

#### Step 2: Implement role-based authorization middleware
File: `src/middlewares/role.middleware.js`

What was implemented:
1. Created a middleware factory `requireRole(allowedRole)`.
2. Checked `req.user` presence.
3. Compared `req.user.role` against required role.
4. Returned `403 Forbidden` on mismatch.

Why this matters:
- Prevents cross-role access (for example, donor accessing admin routes).

#### Step 3: Implement centralized error middleware
File: `src/middlewares/error.middleware.js`

What was implemented:
1. Added global Express error handler signature: `(err, req, res, next)`.
2. Added `res.headersSent` guard.
3. Logged errors (`console.error(err)`).
4. Mapped known error types to clear API responses:
   - JWT expired -> 401
   - JWT invalid -> 401
   - Mongoose validation -> 400 + details
   - Mongoose cast error -> 400
   - Duplicate key (`11000`) -> 409
5. Added fallback status/message handling for unknown errors.

Why this matters:
- Gives frontend a predictable error contract.
- Avoids leaking sensitive internals in 500 responses.

#### Step 4: Protect `/auth/me`
File: `src/routes/auth.routes.js`

What was implemented:
- Updated route from:
  - `router.get('/me', AUC.getMe)`
- To:
  - `router.get('/me', authMiddleware, AUC.getMe)`

Why this matters:
- `getMe` reads `req.user.userId`; without middleware this route is unsafe and unreliable.

#### Step 5: Build protected role route modules
Files:
- `src/routes/donor.routes.js`
- `src/routes/hospital.routes.js`
- `src/routes/admin.routes.js`

What was implemented:
1. Created Express routers in each file.
2. Applied route-level protection with:
   - `router.use(authMiddleware, requireRole('<role>'))`
3. Added a protected `GET /profile` endpoint in each module to confirm wiring.

Why this matters:
- Establishes secure route groups for future feature endpoints.

#### Step 6: Wire everything in app bootstrap
File: `src/app.js`

What was implemented:
1. Imported donor/hospital/admin route modules.
2. Mounted route groups:
   - `/donor`
   - `/hospital`
   - `/admin`
3. Replaced direct 404 response with forwarded error object (`statusCode = 404`).
4. Added global `errorMiddleware` **last**.

Why this matters:
- Ensures all errors, including 404, go through one consistent error pipeline.

---

### 5. Code Snippets with Explanations

#### Authentication middleware core logic
```js
const [scheme, token] = authHeader.split(' ');
if (scheme !== 'Bearer' || !token) {
  return response.error(res, 401, 'Authorization header must be: Bearer <token>');
}

const decoded = verifyToken(token);
req.user = decoded;
```
Explanation:
- Enforces token transport contract.
- Moves verified identity into request context for later middleware/controllers.

#### Role middleware factory
```js
export default function requireRole(allowedRole) {
  return (req, res, next) => {
    if (!req.user) return response.error(res, 401, 'Unauthorized');
    if (req.user.role !== allowedRole) return response.error(res, 403, 'Forbidden');
    return next();
  };
}
```
Explanation:
- Higher-order middleware keeps authorization logic reusable and explicit per route group.

#### Global error mapping
```js
if (err instanceof TokenExpiredError) {
  return response.error(res, 401, 'Token has expired');
}

if (err?.name === 'ValidationError') {
  const details = Object.values(err.errors || {}).map((item) => item.message);
  return res.status(400).json({ success: false, message: 'Validation failed', details });
}
```
Explanation:
- Converts low-level exceptions into stable API semantics.
- Validation includes `details` to help UI show field-level feedback.

#### Route-group protection pattern
```js
router.use(authMiddleware, requireRole('hospital'));
```
Explanation:
- Every endpoint declared after this line in the router is protected and role-scoped.

#### 404 to error pipeline
```js
app.use((req, res, next) => {
  const err = new Error(`${req.method} ${req.originalUrl} not found`);
  err.statusCode = 404;
  next(err);
});

app.use(errorMiddleware);
```
Explanation:
- Keeps 404 responses consistent with all other API errors.

---

### 6. Design Decisions and Reasoning

1. **Keep JWT logic in `utils/jwt.js` only**
Reason: Avoid duplicated crypto/verification logic and ensure one source of truth.

2. **Use explicit `Bearer` parsing**
Reason: Strong API contract and clearer failure messaging.

3. **Use middleware factory for role checks**
Reason: Reusable, simple, and composable for any future role-protected route.

4. **Centralize error handling**
Reason: Consistent response shape and easier monitoring/debugging.

5. **Forward 404 as errors**
Reason: Same JSON structure for all failure paths.

6. **Apply role protection at router level (`router.use`)**
Reason: Prevents accidental unprotected endpoints in that route module.

---

### 7. Alternative Approaches Considered

1. **Per-route role checks instead of `router.use`**
- Alternative: `router.get('/x', auth, requireRole('donor'), handler)` repeatedly.
- Why not chosen: More repetition and higher chance of missing protection on a new route.

2. **Throwing errors in auth middleware and delegating all to global handler**
- Alternative: `next(err)` from auth middleware instead of sending 401 directly.
- Why not chosen: Immediate explicit auth responses are simpler for this phase and reduce coupling.

3. **Single middleware for auth + role**
- Alternative: one combined middleware with role param.
- Why not chosen: Separating concerns makes testing and reuse cleaner.

4. **Returning raw error messages in 500s**
- Alternative: expose `err.message` for all unknown failures.
- Why not chosen: Can leak internal details; generic 500 is safer.

---

### 8. Edge Cases Handled

- Missing `Authorization` header.
- Non-string or malformed header format.
- Missing token after `Bearer`.
- Expired JWT (`TokenExpiredError`).
- Invalid/malformed JWT (`JsonWebTokenError`).
- Authenticated request with wrong role (`403`).
- Validation errors from Mongoose with extracted `details`.
- Invalid MongoDB ObjectId cast (`CastError`).
- Duplicate key writes (`err.code === 11000`).
- Any unknown error fallback (`500 Internal server error`).
- 404 not found routed through global error handler.

---

### 9. Testing Strategy and Validation Steps

## A. Static sanity checks
- Ensure all middleware files export default functions.
- Ensure imports are valid and no circular dependency is introduced.

## B. Runtime import validation
- Command used:
```bash
node -e "import('./src/app.js').then(() => console.log('app import ok')).catch((err) => { console.error(err); process.exit(1); })"
```
- Expected output:
```text
app import ok
```

## C. API behavior validation (manual)
Use Postman/Insomnia/curl.

1. `/auth/me` without token
- Request: `GET /auth/me`
- Expected: `401`, message about missing authorization header.

2. `/auth/me` with malformed header
- Header: `Authorization: Token abc`
- Expected: `401`, message requiring `Bearer <token>`.

3. `/auth/me` with invalid token
- Header: `Authorization: Bearer invalidtoken`
- Expected: `401`, `Invalid token`.

4. `/auth/me` with expired token
- Header: expired JWT
- Expected: `401`, `Token has expired`.

5. Role protection test
- Use donor token on `GET /admin/profile`
- Expected: `403 Forbidden`.

6. Positive role test
- Use admin token on `GET /admin/profile`
- Expected: `200` success response with `req.user` data.

7. 404 test
- Request unknown route, e.g. `GET /not-found`
- Expected: consistent JSON error via global error middleware.

## D. Recommended future automated tests
- Unit tests for each middleware branch.
- Integration tests for protected routes with valid/invalid tokens.

---

### 10. Files Modified or Created in This Phase

## Modified
- `src/app.js`
- `src/routes/auth.routes.js`

## Created (implemented from empty placeholders)
- `src/middlewares/auth.middleware.js`
- `src/middlewares/role.middleware.js`
- `src/middlewares/error.middleware.js`
- `src/routes/donor.routes.js`
- `src/routes/hospital.routes.js`
- `src/routes/admin.routes.js`

---

### 11. Potential Future Improvements

1. **Support multiple allowed roles**
- Upgrade `requireRole` to accept arrays, for example `requireRole(['admin', 'hospital'])`.

2. **Use typed/custom error classes**
- Add reusable AppError classes with standardized status codes and codes.

3. **Add request correlation IDs**
- Include request IDs in logs/errors for better production debugging.

4. **Improve duplicate key messaging**
- Parse duplicate field from `err.keyPattern` and return clearer message.

5. **Token source flexibility**
- Optionally support secure cookies for token transport.

6. **Security hardening**
- Add rate limiting and helmet middleware for auth-sensitive endpoints.

7. **Automated tests**
- Add Jest/Supertest coverage for middleware and route protections.

8. **Production logging**
- Replace `console.error` with structured logger (e.g., pino/winston).

9. **Validation layer before controllers**
- Add request schema validation (Zod/Joi) so controllers get clean input.

10. **Consistent 404 message shape with response util only**
- Optionally standardize through custom not-found error helper for cleaner code.

---

## Final Summary
Phase 1 established the backend security and error-handling foundation:
- Authentication is now enforced using JWT middleware.
- Authorization is now enforced using role middleware.
- Errors now flow through one global handler with consistent JSON responses.
- Route groups (`/donor`, `/hospital`, `/admin`) are protected and ready for feature expansion.

This phase is the backbone required before implementing advanced donor/hospital/admin business functionality in later phases.
