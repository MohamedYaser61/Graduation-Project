# LifeLink Backend — Utils Guide

This document explains the **JWT** and **response** utility modules: their purpose, how to use them, and how they fit into a production auth and API design. It is written for developers who want a clear mental model and to avoid common mistakes.

---

## Table of Contents

1. [Overview](#1-overview)
2. [JWT Utility (`jwt.js`)](#2-jwt-utility-jwtjs)
3. [Response Utility (`response.js`)](#3-response-utility-responsejs)
4. [Flow Diagrams](#4-flow-diagrams)
5. [Usage in Controllers and Middleware](#5-usage-in-controllers-and-middleware)
6. [Authentication vs Authorization](#6-authentication-vs-authorization)
7. [Anti-patterns and Bad Examples](#7-anti-patterns-and-bad-examples)
8. [When Not to Use These Helpers](#8-when-not-to-use-these-helpers)

---

## 1. Overview

| File         | Purpose in one sentence |
|--------------|--------------------------|
| `utils/jwt.js`     | Single place for signing and verifying JWTs; uses env config and throws clear errors. |
| `utils/response.js`| Single place for success/error JSON response shape so the API is consistent. |

**Mental model**

- **`jwt.js`** — Used whenever you need to **create** a token (e.g. after login) or **validate** a token (e.g. in auth middleware). Controllers and middleware call this module; they do not call `jsonwebtoken` directly.
- **`response.js`** — Used in **controllers** (and optionally in error middleware) whenever you send a JSON success or error back to the client. You use the same shape every time so the frontend can rely on `success`, `message`, and `data`.

---

## 2. JWT Utility (`jwt.js`)

### 2.1 What It Exposes

- **`signToken(payload, options?)`** — Signs a payload with `env.JWT_SECRET` and default `env.JWT_EXPIRES_IN`. Optional `options.expiresIn` overrides expiry.
- **`signRefreshToken(payload)`** — Same idea but uses `env.JWT_REFRESH_EXPIRES_IN` (e.g. longer-lived refresh tokens).
- **`verifyToken(token)`** — Verifies the JWT and returns the decoded payload. Throws if token is missing, invalid, or expired.
- **`TokenExpiredError`** and **`JsonWebTokenError`** — Re-exported from `jsonwebtoken` so middleware can tell “expired” vs “invalid” and return the right status/message.

All JWT behaviour (secret, expiry, trimming, validation) lives here. Controllers and middleware only call these functions.

### 2.2 Why JWT Logic Should NOT Be Written Directly in Controllers

If you put `jwt.sign` and `jwt.verify` inside controllers (or scattered in middleware):

1. **Duplication** — Same secret, same expiry, same error handling repeated in many files. Change one place and you risk missing another.
2. **Testing** — You must mock `jsonwebtoken` in every test that touches auth. With a small wrapper, you mock one module (`utils/jwt.js`) and get consistent behaviour.
3. **Configuration** — Secret and expiry should come from one place (e.g. `env`). In controllers you’re tempted to hardcode or read `process.env` in many places.
4. **Security** — Centralizing logic reduces the chance of mistakes (e.g. wrong secret, forgetting expiry, or swallowing errors).

So: **controllers and middleware should only call `signToken` / `verifyToken` (and optionally catch JWT errors); they should not import `jsonwebtoken` or touch raw `jwt.sign`/`jwt.verify`.**

### 2.3 Why Wrapping `jwt.sign` and `jwt.verify` Is Important

- **Single place for secret and defaults** — Only `jwt.js` reads `env.JWT_SECRET` and `env.JWT_EXPIRES_IN`. No magic strings or duplicated config.
- **Consistent validation** — e.g. “token must be a non-empty string” is enforced once in `verifyToken`, so every caller gets the same behaviour.
- **Clear API** — Names like `signToken` and `verifyToken` express intent; callers don’t need to know about `jsonwebtoken` options.
- **Easier evolution** — If you add logging, metrics, or key rotation, you change one module instead of every controller/middleware.

So the wrapper is not “extra code for nothing” — it’s the boundary where all JWT rules and config live.

### 2.4 Why the API Surface Is Minimal and Intentional

We expose only:

- `signToken` — “I need a token.”
- `signRefreshToken` — “I need a long-lived refresh token.”
- `verifyToken` — “I have a token string; give me the payload or throw.”
- JWT error types — so middleware can map them to HTTP (e.g. 401 with “Token expired” vs “Invalid token”).

We do **not** expose:

- Raw `jwt.sign`/`jwt.verify` — so no one bypasses our config or validation.
- “Decode without verify” — that would be unsafe; we only expose verify.
- Dozens of options — we support the minimal set (e.g. `expiresIn` override) so the API stays simple and safe.

### 2.5 Common JWT Mistakes and How This Design Avoids Them

| Mistake | How we avoid it |
|--------|------------------|
| Hardcoding secret or expiry | Only `env.JWT_SECRET` and `env.JWT_EXPIRES_IN` in `jwt.js`; no magic values elsewhere. |
| Swallowing errors (e.g. `try/catch` and returning generic “Unauthorized”) | We let `verifyToken` throw; middleware catches and can use `TokenExpiredError` vs `JsonWebTokenError` for different messages. |
| Verifying with wrong secret | Single place uses `env.JWT_SECRET`; no second source of truth. |
| Forgetting to check token presence/type | `verifyToken` throws if token is missing or not a non-empty string. |
| Using “decode” instead of “verify” | We only expose `verifyToken`, which always verifies signature and expiry. |
| Putting too much in the payload | We don’t put secrets in the payload; we keep payload small (e.g. `userId`, `role`) and document that in usage examples. |

---

## 3. Response Utility (`response.js`)

### 3.1 What It Exposes

- **`successResponse(res, statusCode, message, data?)`** — Sends `{ success: true, message, data? }` with the given status code. `data` is omitted when not provided.
- **`errorResponse(res, statusCode, message)`** — Sends `{ success: false, message }` with the given status code.

Both call `res.status(...).json(...)` and return `res` so you can chain if needed.

### 3.2 Why Response Formatting Should Be Centralized

If every controller does its own `res.json({ ... })`:

- Shapes differ: sometimes `data`, sometimes `result`, sometimes no wrapper.
- Frontend must handle many formats: `response.data` in one endpoint, `response.user` in another, etc.
- Changing the global contract (e.g. adding `requestId` or `meta`) means touching many files and risking inconsistency.

With a single helper:

- Every success has `success: true`, `message`, and optionally `data`.
- Every error has `success: false` and `message`.
- The frontend can rely on one pattern; future extensions (pagination, metadata) can be added in one place.

### 3.3 How Inconsistent Responses Harm Frontend Development

- **Conditionals everywhere** — “If this endpoint, use `body.result`; if that one, use `body.data`.” More bugs and harder-to-read code.
- **Harder error handling** — No guarantee that errors have a `message` or that success has a stable structure for loading states and UI.
- **More work for new endpoints** — Each new route might invent a new shape unless the team remembers to use the helper.

Centralizing responses means the frontend can assume one contract and handle success/error in a uniform way.

### 3.4 Why This Design Is Better Than `res.json()` Everywhere

- **Consistency** — Same keys (`success`, `message`, `data`) and same semantics across the API.
- **Less boilerplate** — One line: `successResponse(res, 201, 'User created', user)` instead of repeating the object shape.
- **Easier evolution** — Add pagination or metadata later by extending the helper (e.g. optional `meta`), not by changing every controller.
- **Clear intent** — `successResponse` vs `errorResponse` makes the controller’s intent obvious and avoids mixing success and error shapes.

So we still use `res` and send JSON, but through a thin, consistent layer.

### 3.5 When NOT to Use These Helpers

- **Streaming or non-JSON** — When you send files, Server-Sent Events, or raw buffers, you don’t use the JSON success/error shape; use `res` directly.
- **Third-party webhooks** — When the consumer expects a specific format (e.g. Stripe), follow their spec instead of our generic shape.
- **Internal middleware that doesn’t send the “final” response** — e.g. middleware that only calls `next()` or attaches things to `req`; it doesn’t need the response helper.

Use the helpers for **all normal JSON API responses** (success and error) that your own frontend or clients consume.

---

## 4. Flow Diagrams

### 4.1 Login (Sign Token)

```
Client                Controller / Service              utils/jwt.js           env
  |                            |                              |                 |
  |  POST /login               |                              |                 |
  |  (body: email, password)   |                              |                 |
  | -------------------------> |                              |                 |
  |                            |  validate user               |                 |
  |                            |  (e.g. auth.service)         |                 |
  |                            |  get userId, role             |                 |
  |                            |  signToken({ userId, role })  |                 |
  |                            | ---------------------------->|                 |
  |                            |                              |  JWT_SECRET,    |
  |                            |                              |  JWT_EXPIRES_IN |
  |                            |                              | <---------------|
  |                            |  return token string         |                 |
  |                            | <----------------------------|                 |
  |                            |  successResponse(res, 200,   |                 |
  |                            |    'Logged in', { token })   |                 |
  |  { success, message, data }|                              |                 |
  | <------------------------- |                              |                 |
```

### 4.2 Protected Route (Verify Token)

```
Client                Middleware (auth)              utils/jwt.js
  |                            |                              |
  |  GET /api/profile          |                              |
  |  Authorization: Bearer <token>                            |
  | -------------------------> |                              |
  |                            |  extract token from header   |
  |                            |  verifyToken(token)          |
  |                            | ---------------------------->|
  |                            |                              | verify + decode
  |                            |  payload or throw            |
  |                            | <----------------------------|
  |                            |  attach req.user = payload   |
  |                            |  next()                      |
  |                            |  (or errorResponse 401)      |
  |  ...                       |                              |
```

### 4.3 Controller Success / Error (Response Helper)

```
Controller                    utils/response.js              Client
  |                                    |                         |
  |  successResponse(res, 200, ...)    |                         |
  |  or errorResponse(res, 404, ...)   |                         |
  | ---------------------------------->|                         |
  |                                    |  res.status(...).json() |
  |                                    | ----------------------->|
  |                                    |                         |  JSON body
```

---

## 5. Usage in Controllers and Middleware

### 5.1 Auth Controller (Login — Sign Token + Success Response)

```javascript
import { successResponse, errorResponse } from '../utils/response.js';
import { signToken } from '../utils/jwt.js';
// + auth service, validation, etc.

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const user = await authService.validateUser(email, password);
    if (!user) {
      return errorResponse(res, 401, 'Invalid email or password');
    }

    const token = signToken({ userId: user._id.toString(), role: user.role });
    return successResponse(res, 200, 'Logged in successfully', { token, user: { id: user._id, email: user.email, role: user.role } });
  } catch (err) {
    next(err);
  }
}
```

### 5.2 Auth Middleware (Verify Token)

```javascript
import { verifyToken, TokenExpiredError, JsonWebTokenError } from '../utils/jwt.js';
import { errorResponse } from '../utils/response.js';

export function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return errorResponse(res, 401, 'Access token is required');
  }

  try {
    const decoded = verifyToken(token);
    req.user = decoded;  // e.g. { userId, role, iat, exp }
    next();
  } catch (err) {
    if (err instanceof TokenExpiredError) {
      return errorResponse(res, 401, 'Token has expired');
    }
    if (err instanceof JsonWebTokenError) {
      return errorResponse(res, 401, 'Invalid token');
    }
    next(err);
  }
}
```

### 5.3 Generic Controller (Success and Error)

```javascript
import { successResponse, errorResponse } from '../utils/response.js';

export async function getProfile(req, res, next) {
  try {
    const user = await userService.findById(req.user.userId);
    if (!user) {
      return errorResponse(res, 404, 'User not found');
    }
    return successResponse(res, 200, 'Profile retrieved', user);
  } catch (err) {
    next(err);
  }
}
```

### 5.4 Error Middleware (Global Errors)

You can use `errorResponse` in your global error handler so even unhandled errors go out in the same shape:

```javascript
import { errorResponse } from '../utils/response.js';

export function errorHandler(err, req, res, next) {
  const status = err.statusCode ?? 500;
  const message = err.message ?? 'Internal server error';
  return errorResponse(res, status, message);
}
```

---

## 6. Authentication vs Authorization

These utilities support both concepts; it helps to keep them distinct.

- **Authentication** — “Who is this?”  
  - **JWT**: Issuing a token after login (sign) and validating it on each request (verify).  
  - **Flow**: Login → `signToken` → client sends token → middleware calls `verifyToken` → `req.user` is set.  
  - **`jwt.js`** is used for this.

- **Authorization** — “Is this person allowed to do this?”  
  - **JWT**: The decoded payload (e.g. `role`) is used to decide access.  
  - **Flow**: After `verifyToken`, a **role middleware** (or controller logic) checks `req.user.role` and either calls `next()` or returns `errorResponse(res, 403, 'Forbidden')`.  
  - **`jwt.js`** only provides the payload; **authorization** is enforced in middleware or controllers using `req.user` and **`response.js`** to send 403.

So:

- **Auth*n* (identity)** → `jwt.js` (sign + verify) + auth middleware.
- **Auth*z* (permissions)** → role/permission checks using `req.user` + `response.js` for 403.

---

## 7. Anti-patterns and Bad Examples

### 7.1 JWT

**Bad: JWT logic in controller**

```javascript
// Don't: raw jwt in controller, hardcoded secret/expiry
import jwt from 'jsonwebtoken';
const token = jwt.sign({ id: user._id }, 'my-secret', { expiresIn: '7d' });
```

- Secret and expiry should live in env and in one place (`jwt.js`).
- Use `signToken({ userId: user._id.toString(), role: user.role })` from the controller.

**Bad: Swallowing verify errors**

```javascript
try {
  const decoded = jwt.verify(token, secret);
  req.user = decoded;
} catch {
  req.user = null;  // Don't: hide failure; return 401 instead
}
```

- Failed verification should result in a 401 response (e.g. via `errorResponse`), not a silent `req.user = null` unless you explicitly design a “optional auth” route.

**Bad: Decoding without verifying**

```javascript
const decoded = jwt.decode(token);  // Don't: no signature check
```

- Always use `verifyToken(token)` so signature and expiry are checked.

### 7.2 Response

**Bad: Inconsistent shapes per endpoint**

```javascript
res.json({ user });                    // No success/message
res.json({ status: 'ok', result });     // Different keys
res.status(400).json({ err: 'Bad' });   // Different key for error
```

- Use `successResponse` and `errorResponse` so every response has the same structure.

**Bad: Mixing success and error in one helper**

```javascript
// Don't: one overloaded function with success + error in one
sendResponse(res, 200, 'Ok', data, null);
sendResponse(res, 404, null, null, 'Not found');
```

- Keep `successResponse` and `errorResponse` separate so intent is clear and the API stays minimal.

---

## 8. When Not to Use These Helpers

- **Streaming / file download / non-JSON** — Use `res.send()`, `res.download()`, or streaming APIs directly.
- **Webhooks or external API contracts** — Follow the consumer’s required format.
- **Middleware that never sends the response** — e.g. auth middleware that only calls `next()` or returns 401 via `errorResponse` is fine; middleware that only sets `req.user` doesn’t need `successResponse`.

For all normal JSON API success and error responses consumed by your frontend, use `successResponse` and `errorResponse` so the API stays consistent and maintainable.

---

## Summary

- **`jwt.js`** — Use for all token creation and verification; keeps secrets and options in one place, throws clear errors, and avoids common JWT mistakes.
- **`response.js`** — Use for all standard JSON success and error responses so the API has one predictable shape and the frontend can rely on it.
- **Auth** — Authentication = identity via JWT (sign in login, verify in middleware); Authorization = permissions using `req.user` and returning 403 when needed. Both can use `response.js` to send consistent error messages.

Keeping JWT and response logic in these two modules will keep your backend cleaner, easier to test, and easier for your team (and frontend) to work with.
