# LifeLink Project - Comprehensive Phases Documentation

> **Last Updated:** February 17, 2026  
> **Project Status:** Phase 3 Complete ✅  
> **Total Development Progress:** ~55% Complete

---

## Table of Contents

1. [Phase 1: Foundation & Security](#phase-1-foundation--security)
2. [Phase 2: Core Data Models](#phase-2-core-data-models)
3. [Phase 3: Controllers & Services](#phase-3-controllers--services)
4. [Quick Reference Guide](#quick-reference-guide)

---

# Phase 1: Foundation & Security

## Phase Title & Objective

**Phase 1: Foundation & Security - Establish core infrastructure and authentication/authorization layer**

The primary objective of Phase 1 is to build a solid foundation for the LifeLink application by:
- Establishing a secure authentication system using JWT tokens
- Implementing role-based access control (RBAC) for three user types: donor, hospital, and admin
- Creating a scalable server architecture with proper error handling
- Setting up database connectivity with MongoDB and Mongoose ODM
- Implementing security best practices (password hashing, token management, CORS, input validation)

## Problem Description

The LifeLink platform serves three distinct user types (donors, hospitals, admins), each with different permissions and workflows. Without a proper foundation:

- **Users wouldn't be authenticated** - Anyone could impersonate anyone else
- **Authorization would be unsecured** - Hospitals could access donor data, admins could modify anything
- **The database would lack structure** - No clear schema for users or their relationships
- **API responses would be inconsistent** - Each endpoint would have its own response format
- **Errors would crash the server** - No centralized error handling
- **Password security would be compromised** - Storing plain text passwords

## Key Components Implemented

### 1. Environment Configuration (`src/config/env.js`)

**Problem:** Different environments need different configs without hardcoding sensitive values.

**Solution:** Centralized validator that checks required environment variables at startup.

```javascript
import 'dotenv/config';

const requiredEnvVars = [
  'MONGODB_URI',
  'JWT_SECRET',
  'JWT_EXPIRY',
  'JWT_REFRESH_SECRET',
  'BCRYPT_SALT_ROUNDS',
  'NODE_ENV',
];

const missingVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingVars.length > 0) {
  throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
}

export const env = {
  MONGODB_URI: process.env.MONGODB_URI,
  JWT_SECRET: process.env.JWT_SECRET,
  BCRYPT_SALT_ROUNDS: parseInt(process.env.BCRYPT_SALT_ROUNDS, 10),
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT || 5000,
};
```

**Design Decisions:**
- Validate early (fail-fast principle)
- Type conversion (parseInt) for numeric values
- Default port if not specified
- Throw hard errors if critical vars missing

### 2. Database Configuration (`src/config/db.js`)

**Problem:** MongoDB connection needs lifecycle management and error handling.

**Solution:** Async module with connect/disconnect functions and graceful fallback.

```javascript
import mongoose from 'mongoose';
import { env } from './env.js';

export const connectDB = async () => {
  try {
    await mongoose.connect(env.MONGODB_URI);
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    if (env.NODE_ENV === 'development') {
      console.warn('⚠️  MongoDB not available, fallback mode');
      return;
    }
    throw new Error(`Database connection failed: ${error.message}`);
  }
};

export const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    console.log('✅ MongoDB disconnected');
  } catch (error) {
    console.error('❌ Disconnect error:', error.message);
  }
};
```

### 3. User Models with Discriminators

**Problem:** Three user types share common fields but have unique properties. How do we avoid duplication?

**Solution:** Use Mongoose Discriminators - one base User model, specialized Donor and Hospital models.

**Base User Model (`src/models/User.model.js`):**

```javascript
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      minlength: [3, 'Name must be at least 3 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Invalid email format'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      select: false, // Don't return password in queries
      minlength: [8, 'Password must be at least 8 characters'],
    },
    role: {
      type: String,
      enum: ['donor', 'hospital', 'admin'],
      required: true,
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { 
    discriminatorKey: 'role',
    timestamps: true 
  }
);

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = env.BCRYPT_SALT_ROUNDS;
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

const User = mongoose.model('User', userSchema);
export default User;
```

**Why Discriminators?**
- Single base schema - No duplication
- Shared indexes - Better query performance
- Type safety - Each role has own validation rules
- Extensible - Easy to add new user types later

**Donor Model (`src/models/Donor.model.js`):**

```javascript
import mongoose from 'mongoose';
import User from './User.model.js';

const donorSchema = new mongoose.Schema({
  phoneNumber: {
    type: String,
    required: [true, 'Phone number is required'],
    validate: {
      validator: function(v) {
        return /^[0-9]{10}$/.test(v);
      },
      message: 'Phone number must be 10 digits long',
    },
  },
  bloodType: {
    type: String,
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
    default: null,
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'not specified'],
    default: 'not specified',
  },
  lastDonationDate: Date,
  isAvailable: {
    type: Boolean,
    default: true,
  },
  location: {
    city: String,
    governrate: String,
  },
  dateOfBirth: {
    type: Date,
    required: [true, 'Date of birth is required'],
  },
});

const Donor = User.discriminator('donor', donorSchema);
export default Donor;
```

**Hospital Model (`src/models/Hospital.model.js`):**

```javascript
import mongoose from 'mongoose';
import User from './User.model.js';

const hospitalSchema = new mongoose.Schema({
  hospitalName: {
    type: String,
    required: [true, 'Hospital name is required'],
  },
  hospitalId: {
    type: Number,
    required: [true, 'Hospital ID is required'],
  },
  licenseNumber: {
    type: String,
    required: [true, 'License number is required'],
  },
  address: {
    city: String,
    governrate: String,
  },
  contactNumber: String,
});

const Hospital = User.discriminator('hospital', hospitalSchema);
export default Hospital;
```

### 4. JWT Token Management (`src/utils/jwt.js`)

**Problem:** Securely sign and verify tokens, with separate access/refresh tokens.

**Solution:** Utility module with sign and verify functions for both token types.

```javascript
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

// Sign access token (short-lived)
export const signAccessToken = (payload) => {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRY || '15m',
  });
};

// Sign refresh token (long-lived)
export const signRefreshToken = (payload) => {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: '7d',
  });
};

// Verify access token
export const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, env.JWT_SECRET);
  } catch (error) {
    throw new Error(`Invalid token: ${error.message}`);
  }
};

// Verify refresh token
export const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, env.JWT_REFRESH_SECRET);
  } catch (error) {
    throw new Error(`Invalid refresh token: ${error.message}`);
  }
};
```

**Design Decisions:**
- **Two Token Types:** Access tokens (short-lived) for API requests, refresh tokens (long-lived) for getting new access tokens
- **Different Secrets:** Use different secrets for each type (more secure)
- **Error Wrapping:** Wrap JWT errors in custom Error class
- **Expiration:** Access tokens expire quickly, reducing window if compromised

### 5. Response Utility (`src/utils/response.js`)

**Problem:** API responses inconsistent across endpoints - different formats and structures.

**Solution:** Utility that enforces ONE standard response format everywhere.

```javascript
export function successResponse(res, statusCode, message, data = undefined) {
  const body = { success: true, message };
  if (data !== undefined) {
    body.data = data;
  }
  return res.status(statusCode).json(body);
}

export function errorResponse(res, statusCode, message) {
  return res.status(statusCode).json({
    success: false,
    message,
  });
}

export default {
  success: successResponse,
  error: errorResponse,
};
```

**Standard Response Format:**

```javascript
// Success
{
  "success": true,
  "message": "User registered successfully",
  "data": { /* actual data */ }
}

// Error
{
  "success": false,
  "message": "Email already registered"
}
```

### 6. Authentication Middleware (`src/middlewares/auth.middleware.js`)

**Problem:** How do we verify JWT tokens and attach user information to requests?

**Solution:** Middleware that validates tokens and extracts user data before controller runs.

```javascript
import * as jwt from '../utils/jwt.js';
import response from '../utils/response.js';

const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return response.error(res, 401, 'No token provided');
    }
    
    const token = authHeader.substring(7);
    const decoded = jwt.verifyAccessToken(token);
    req.user = decoded;
    
    next();
  } catch (error) {
    response.error(res, 401, 'Invalid token');
  }
};

export default authMiddleware;
```

**Middleware Flow:**
```
Request with Authorization header
         ↓
Auth Middleware runs
         ↓
Token valid? → Attach user to req.user → Call next()
         ↓
Controller receives req.user with userId and role
```

### 7. Role-Based Access Control (`src/middlewares/role.middleware.js`)

**Problem:** How do we restrict specific endpoints to specific user types?

**Solution:** Middleware factory that checks user role before granting access.

```javascript
import response from '../utils/response.js';

const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return response.error(res, 401, 'User not authenticated');
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      return response.error(res, 403, 'Insufficient permissions');
    }
    
    next();
  };
};

export default requireRole;
```

**Usage Pattern:**

```javascript
// Protect entire router for one role
router.use(authMiddleware, requireRole('donor'));
router.get('/profile', donorController.getProfile);
```

### 8. Error Handling Middleware (`src/middlewares/error.middleware.js`)

**Problem:** Unhandled errors crash the server; inconsistent error response formats.

**Solution:** Global error middleware that catches and normalizes all errors.

```javascript
const errorMiddleware = (err, req, res, next) => {
  // Log error
  if (process.env.NODE_ENV === 'development') {
    console.error('❌ Error:', err);
  } else {
    console.error('❌ Error:', err.message);
  }
  
  // Determine status code
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  
  // Send consistent error response
  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

export default errorMiddleware;
```

**Error Handling Flow:**
```
Controller throws error
         ↓
Express passes to error middleware
         ↓
Error middleware logs it
         ↓
Send consistent error response
         ↓
Server doesn't crash, keeps running
```

### 9. Server Bootstrap (`src/server.js` and `src/app.js`)

**Problem:** How do we initialize all components and start the server?

**Solution:** Separate app configuration and server startup.

**app.js:**

```javascript
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import authRoutes from './routes/auth.routes.js';
import donorRoutes from './routes/donor.routes.js';
import hospitalRoutes from './routes/hospital.routes.js';
import adminRoutes from './routes/admin.routes.js';
import errorMiddleware from './middlewares/error.middleware.js';

const app = express();

// Middleware
app.use(morgan('dev'));
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/donor', donorRoutes);
app.use('/api/hospital', hospitalRoutes);
app.use('/api/admin', adminRoutes);

// Error handling (must be last)
app.use(errorMiddleware);

export default app;
```

**server.js:**

```javascript
import { connectDB } from './config/db.js';
import app from './app.js';

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
```

## Phase 1 Summary

**Files Created:**
- `src/config/env.js` - Environment validation
- `src/config/db.js` - Database connection
- `src/models/User.model.js` - Base user model
- `src/models/Donor.model.js` - Donor specialization
- `src/models/Hospital.model.js` - Hospital specialization
- `src/services/auth.service.js` - Authentication logic
- `src/controllers/auth.controller.js` - Auth endpoints
- `src/middlewares/auth.middleware.js` - JWT verification
- `src/middlewares/role.middleware.js` - Authorization checking
- `src/middlewares/error.middleware.js` - Error handling
- `src/utils/jwt.js` - JWT utilities
- `src/utils/response.js` - Response formatting
- `src/routes/auth.routes.js` - Auth routes
- `src/app.js` - Express configuration
- `src/server.js` - Server startup

**What's Possible Now:**
- ✅ User registration (3 user types)
- ✅ Secure login with JWT tokens
- ✅ Protected routes by authentication
- ✅ Protected routes by role

---

# Phase 2: Core Data Models

## Phase Title & Objective

**Phase 2: Core Data Models - Build the foundational data structures for donations, requests, and notifications**

The primary objective is to create the data models that represent the core business entities:
- **Requests:** Hospital requests for blood/organ donations
- **Donations:** Individual donation records tracking lifecycle
- **Notifications:** User notifications for matches, requests, and achievements

## Key Models Implemented

### Request Model (`src/models/Request.model.js`)

**Problem:**
Hospitals need to create donation requests specifying what they need, urgency, and deadline. Without structure, we have no place to store this data.

**Solution:**
Create RequestModel with type-specific validation (blood vs organ requests have different fields).

```javascript
const requestSchema = new mongoose.Schema(
  {
    hospitalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hospital',
      required: [true, 'Hospital ID is required'],
    },
    
    type: {
      type: String,
      enum: ['blood', 'organ'],
      required: [true, 'Request type is required'],
    },
    
    bloodType: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
      validate: {
        validator: function(v) {
          // Blood type required ONLY for blood requests
          if (this.type === 'blood') {
            return v !== null && v !== undefined;
          }
          return true;
        },
        message: 'Blood type required for blood donation requests',
      },
    },
    
    organType: {
      type: String,
      enum: ['kidney', 'liver', 'heart', 'lung', 'pancreas', 'cornea'],
      validate: {
        validator: function(v) {
          // Organ type required ONLY for organ requests
          if (this.type === 'organ') {
            return v !== null && v !== undefined;
          }
          return true;
        },
        message: 'Organ type required for organ donation requests',
      },
    },
    
    urgency: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      required: [true, 'Urgency level is required'],
    },
    
    status: {
      type: String,
      enum: ['pending', 'in-progress', 'completed', 'cancelled'],
      default: 'pending',
    },
    
    requiredBy: {
      type: Date,
      required: [true, 'Required by date is required'],
      validate: {
        validator: function(v) {
          return v > new Date();
        },
        message: 'Required by date must be in the future',
      },
    },
    
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [1, 'Quantity must be at least 1'],
      default: 1,
    },
    
    notes: {
      type: String,
      maxlength: [500, 'Notes cannot exceed 500 characters'],
    },
  },
  { timestamps: true }
);

// Indexes for efficient queries
requestSchema.index({ hospitalId: 1 });
requestSchema.index({ status: 1 });
requestSchema.index({ urgency: 1 });
requestSchema.index({ hospitalId: 1, status: 1 });
```

**Design Decisions:**
- **Conditional Validation:** Blood type required for blood requests, organ type for organ requests
- **Future Date Requirement:** Prevent creating requests for past dates
- **Compound Indexes:** `{ hospitalId: 1, status: 1 }` for common query "my pending requests"

### Donation Model (`src/models/Donation.model.js`)

**Problem:**
After a request exists and a donor responds, we need to track the donation lifecycle from response through completion.

**Solution:**
Create Donation model that links donor to request and tracks status progression.

```javascript
const donationSchema = new mongoose.Schema(
  {
    donorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Donor',
      required: [true, 'Donor ID is required'],
    },
    
    requestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Request',
      required: [true, 'Request ID is required'],
    },
    
    status: {
      type: String,
      enum: {
        values: ['pending', 'scheduled', 'completed', 'cancelled'],
        message: 'Status must be pending, scheduled, completed, or cancelled',
      },
      default: 'pending',
    },
    
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [1, 'Quantity must be at least 1'],
    },
    
    scheduledDate: {
      type: Date,
      validate: {
        validator: function(v) {
          if (!v) return true;
          return v > new Date();
        },
        message: 'Scheduled date must be in the future',
      },
    },
    
    completedDate: {
      type: Date,
      validate: {
        validator: function(v) {
          if (!v) return true;
          return v <= new Date();
        },
        message: 'Completed date must be in the past',
      },
    },
    
    notes: {
      type: String,
      maxlength: [1000, 'Notes cannot exceed 1000 characters'],
    },
  },
  { timestamps: true }
);

// Indexes
donationSchema.index({ donorId: 1 });
donationSchema.index({ requestId: 1 });
donationSchema.index({ status: 1 });
donationSchema.index({ donorId: 1, status: 1 });
donationSchema.index({ requestId: 1, status: 1 });
```

**Donation Lifecycle:**
```
pending (initial)
   ↓
scheduled (date set)
   ↓
completed (donation done)
   OR
cancelled (at any point)
```

### Notification Model (`src/models/Notification.model.js`)

**Problem:**
Users need to know about matches, new requests, and achievements. Without notifications, users have to manually check the system.

**Solution:**
Create Notification model that stores all user notifications with flexible data structure.

```javascript
const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
    },
    
    type: {
      type: String,
      enum: {
        values: ['match', 'request', 'milestone'],
        message: 'Type must be match, request, or milestone',
      },
      required: [true, 'Notification type is required'],
    },
    
    title: {
      type: String,
      required: [true, 'Title is required'],
      maxlength: [200, 'Title max 200 chars'],
    },
    
    message: {
      type: String,
      required: [true, 'Message is required'],
      maxlength: [1000, 'Message max 1000 chars'],
    },
    
    read: {
      type: Boolean,
      default: false,
    },
    
    relatedId: {
      type: mongoose.Schema.Types.ObjectId,
      optional: true,
    },
    
    relatedType: {
      type: String,
      enum: ['Request', 'Donation', 'User', 'Achievement'],
      optional: true,
    },
    
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  { timestamps: true }
);

// Indexes
notificationSchema.index({ userId: 1 });
notificationSchema.index({ read: 1 });
notificationSchema.index({ userId: 1, read: 1 });
notificationSchema.index({ userId: 1, createdAt: -1 });
```

**Notification Type Examples:**

```javascript
// When donor matches hospital request
{
  type: 'match',
  title: 'New Donor Matched',
  message: 'A donor has matched your O+ blood request',
  relatedId: donationId,
  relatedType: 'Donation',
  data: { donorName: 'John', bloodType: 'O+' }
}

// New request available nearby
{
  type: 'request',
  title: 'New Blood Request Available',
  message: 'Critical O+ request available 5km away',
  relatedId: requestId,
  relatedType: 'Request',
  data: { urgency: 'critical', distance: '5km' }
}

// Achievement unlocked
{
  type: 'milestone',
  title: 'Achievement: First Donation',
  message: 'You completed your first donation!',
  relatedId: achievementId,
  relatedType: 'Achievement',
  data: { points: 50, badge: 'hero_donor' }
}
```

## Phase 2 Summary

**Files Created:**
- `src/models/Request.model.js` - Hospital donation requests
- `src/models/Donation.model.js` - Donation tracking
- `src/models/Notification.model.js` - User notifications

**What's Possible Now:**
- ✅ Stores hospital requests with type-specific validation
- ✅ Tracks donor donations through lifecycle
- ✅ Stores user notifications with flexible data

---

# Phase 3: Controllers & Services

## Phase Title & Objective

**Phase 3: Controllers & Services - Implement API endpoints and business logic for donors, hospitals, matching, and notifications**

The primary objective is to implement the application's core features:
- Donor profile management and donation workflow
- Hospital request management and donation tracking
- Intelligent matching algorithm
- Notification system

This is where the platform becomes functional for users.

## Key Components Implemented

### Part 1: Geo Utility (`src/utils/geo.js`)

**Problem:**
When matching donors to requests, prefer nearby donors (less travel, faster response).

**Solution:**
Use Haversine Formula to calculate great-circle distance between coordinates.

```javascript
export const calculateDistance = (loc1, loc2) => {
  const R = 6371; // Earth's radius in km
  
  const dLat = toRad(loc2.latitude - loc1.latitude);
  const dLon = toRad(loc2.longitude - loc1.longitude);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(loc1.latitude)) * Math.cos(toRad(loc2.latitude)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c; // Distance in kilometers
};

const toRad = (degrees) => degrees * (Math.PI / 180);

export const findNearby = (donors, location, radius = 50) => {
  return donors.filter(donor => {
    const distance = calculateDistance(location, donor.location);
    return distance <= radius;
  });
};

export const sortByProximity = (donors, location) => {
  return donors.map(donor => ({
    ...donor,
    distance: calculateDistance(location, donor.location)
  }))
  .sort((a, b) => a.distance - b.distance);
};

export const getLocationScore = (distance, maxDistance = 100) => {
  if (distance > maxDistance) return 0;
  return Math.max(0, 100 - (distance / maxDistance) * 100);
};
```

### Part 2: Matching Service (`src/services/matching.service.js`)

**Problem:**
When a hospital posts a request or donor wants to see matches, how do we find compatible donors with medical accuracy?

**Solution:**
Create matching service with:
1. Blood type compatibility matrix
2. Eligibility validation
3. Scoring algorithm

**Blood Type Compatibility:**

```javascript
const BLOOD_TYPE_COMPATIBILITY = {
  'O+': ['O+', 'A+', 'B+', 'AB+'],
  'O-': ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'], // Universal donor
  'A+': ['A+', 'AB+'],
  'A-': ['A+', 'A-', 'AB+', 'AB-'],
  'B+': ['B+', 'AB+'],
  'B-': ['B+', 'B-', 'AB+', 'AB-'],
  'AB+': ['AB+'], // Universal recipient
  'AB-': ['AB+', 'AB-'],
};

export const isBloodTypeCompatible = (donorType, recipientType) => {
  const compatible = BLOOD_TYPE_COMPATIBILITY[donorType];
  return compatible && compatible.includes(recipientType);
};
```

**Why This Matrix?**
- Red Blood Cells have antigens (A, B, Rh factors)
- Recipient antibodies attack foreign antigens (transfusion reaction)
- Only compatible combinations are safe
- O- is universal donor (no antigens)
- AB+ is universal recipient (can receive all types)

**Eligibility Checking:**

```javascript
export const checkEligibility = (donor, request) => {
  // 1. Must be available
  if (!donor.isAvailable) {
    return { eligible: false, reason: 'Donor not currently available' };
  }

  // 2. Blood type compatibility
  if (request.type === 'blood') {
    if (!isBloodTypeCompatible(donor.bloodType, request.bloodType)) {
      return { 
        eligible: false, 
        reason: `Your blood type ${donor.bloodType} cannot donate to ${request.bloodType}` 
      };
    }

    // 3. Donation frequency - 56 days minimum between donations
    const MIN_DAYS = 56;
    if (donor.lastDonationDate) {
      const daysSince = Math.floor(
        (new Date() - new Date(donor.lastDonationDate)) / (1000 * 60 * 60 * 24)
      );
      if (daysSince < MIN_DAYS) {
        return {
          eligible: false,
          reason: `Wait ${MIN_DAYS - daysSince} more days before donating again`
        };
      }
    }
  }

  return { eligible: true, reason: 'Eligible to donate' };
};
```

**Medical Context:**
- 56 days = blood regeneration time
- Different for platelets (3-5 days), plasma (24-48 hours)
- Organs: one-time, not repeated

**Scoring Algorithm:**

```javascript
export const findCompatibleDonors = async (requestId) => {
  const request = await Request.findById(requestId);
  const donors = await Donor.find({ isAvailable: true });
  
  const compatible = [];
  
  for (const donor of donors) {
    // Skip if already responded
    const existing = await Donation.findOne({
      donorId: donor._id,
      requestId,
      status: { $ne: 'cancelled' }
    });
    if (existing) continue;
    
    // Check eligibility
    const eligibility = checkEligibility(donor, request);
    if (!eligibility.eligible) continue;
    
    // Calculate score
    let score = 100;
    
    // Exact blood match: bonus
    if (request.type === 'blood' && donor.bloodType === request.bloodType) {
      score += 20;
    }
    
    // Location proximity: bonus
    if (donor.location && request.hospitalId.location) {
      const distance = calculateDistance(donor.location, request.hospitalId.location);
      const locationScore = getLocationScore(distance);
      score = (score + locationScore) / 2;
    }
    
    compatible.push({ donor, score });
  }
  
  // Sort by score (highest first)
  return compatible.sort((a, b) => b.score - a.score);
};
```

**Scoring Breakdown:**

| Factor | Points |
|--------|--------|
| Base score | 100 |
| Exact blood type match | +20 |
| Location nearby (0-10km) | +50 |
| Urgent request (critical) | +25 |

### Part 3: Donation Service (`src/services/donation.service.js`)

**Problem:**
Donations need their own service layer to handle eligibility, lifecycle, and analytics.

**Solution:**
Create donation service with create, status update, and statistics functions.

```javascript
export const validateEligibility = async (donor, request) => {
  const eligibility = matchingService.checkEligibility(donor, request);
  return eligibility;
};

export const createDonation = async (donorId, requestId, data = {}) => {
  const donor = await Donor.findById(donorId);
  const request = await Request.findById(requestId);
  
  // Validate
  const eligibility = await validateEligibility(donor, request);
  if (!eligibility.eligible) {
    throw new Error(eligibility.reason);
  }
  
  // Check for duplicate
  const existing = await Donation.findOne({
    donorId,
    requestId,
    status: { $ne: 'cancelled' }
  });
  if (existing) throw new Error('Already responded to this request');
  
  // Create
  return await Donation.create({
    donorId,
    requestId,
    quantity: data.quantity || 1,
    status: 'pending',
    notes: data.notes || '',
  });
};

export const updateDonationStatus = async (donationId, status, data = {}) => {
  if (!['pending', 'scheduled', 'completed', 'cancelled'].includes(status)) {
    throw new Error('Invalid status');
  }
  
  const donation = await Donation.findByIdAndUpdate(
    donationId,
    { status, ...data },
    { new: true, runValidators: true }
  );
  
  // If completed, update donor's lastDonationDate
  if (status === 'completed') {
    await Donor.findByIdAndUpdate(
      donation.donorId,
      { lastDonationDate: new Date() }
    );
  }
  
  return donation;
};

export const getDonorStats = async (donorId) => {
  const donations = await Donation.find({ donorId });
  return {
    total: donations.length,
    completed: donations.filter(d => d.status === 'completed').length,
    pending: donations.filter(d => d.status === 'pending').length,
    totalUnitsDonated: donations.reduce((sum, d) => sum + d.quantity, 0),
  };
};
```

### Part 4: Notification Service (`src/services/notification.service.js`)

**Problem:**
Users need to be notified about matches, new requests, and achievements.

**Solution:**
Create notification service with functions to create and manage notifications.

```javascript
export const notifyMatch = async (hospitalId, donation, request) => {
  return await Notification.create({
    userId: hospitalId,
    type: 'match',
    title: 'New Donor Matched',
    message: `Donor matched your ${request.bloodType} blood request`,
    relatedId: donation._id,
    relatedType: 'Donation',
    data: {
      donationId: donation._id,
      requestId: request._id,
      bloodType: request.bloodType,
    },
  });
};

export const notifyRequest = async (donorIds, request) => {
  return await Notification.insertMany(
    donorIds.map(donorId => ({
      userId: donorId,
      type: 'request',
      title: 'New Blood Request Available',
      message: `${request.urgency} priority ${request.bloodType} request nearby`,
      relatedId: request._id,
      relatedType: 'Request',
      data: {
        urgency: request.urgency,
        bloodType: request.bloodType,
      },
    }))
  );
};

export const getUserNotifications = async (userId, options = {}) => {
  const { skip = 0, limit = 10, read = null, type = null } = options;
  
  const filter = { userId };
  if (read !== null) filter.read = read;
  if (type) filter.type = type;
  
  const notifications = await Notification.find(filter)
    .skip(parseInt(skip))
    .limit(parseInt(limit))
    .sort({ createdAt: -1 });
  
  const total = await Notification.countDocuments(filter);
  
  return { notifications, total };
};

export const markAsRead = async (notificationId) => {
  return await Notification.findByIdAndUpdate(
    notificationId,
    { read: true },
    { new: true }
  );
};

export const getUnreadNotifications = async (userId) => {
  return await Notification.find({ userId, read: false }).sort({
    createdAt: -1,
  });
};
```

### Part 5: Donor Controller (`src/controllers/donor.controller.js`)

**Problem:**
Donors need endpoints to manage profiles, find requests, respond to matches, and track history.

**Solution:**
Create controller with 7 endpoints for donor operations.

**Key Endpoints:**

```javascript
export const getProfile = async (req, res) => {
  try {
    const donor = await Donor.findById(req.user._id).select('-password');
    if (!donor) {
      return response.error(res, 404, 'Donor profile not found');
    }
    response.success(res, 200, 'Donor profile retrieved successfully', donor);
  } catch (error) {
    response.error(res, 500, error.message);
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { name, phoneNumber, gender, dateOfBirth, bloodType, location } = req.body;

    // Validate input
    const updateData = {};
    if (name) updateData.name = name;
    if (phoneNumber) {
      const phoneRegex = /^[0-9]{10}$/;
      if (!phoneRegex.test(phoneNumber)) {
        return response.error(res, 400, 'Phone number must be 10 digits long');
      }
      updateData.phoneNumber = phoneNumber;
    }
    if (gender && ['male', 'female', 'not specified'].includes(gender)) {
      updateData.gender = gender;
    }
    if (dateOfBirth) {
      const dob = new Date(dateOfBirth);
      if (dob > new Date()) {
        return response.error(res, 400, 'Date of birth must be in the past');
      }
      updateData.dateOfBirth = dob;
    }
    if (bloodType && ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].includes(bloodType)) {
      updateData.bloodType = bloodType;
    }
    if (location) {
      updateData.location = location;
    }

    const donor = await Donor.findByIdAndUpdate(req.user._id, updateData, {
      new: true,
      runValidators: true,
    }).select('-password');

    response.success(res, 200, 'Donor profile updated successfully', donor);
  } catch (error) {
    response.error(res, 400, error.message);
  }
};

export const getMatches = async (req, res) => {
  try {
    const donor = await Donor.findById(req.user._id);
    if (!donor) {
      return response.error(res, 404, 'Donor not found');
    }

    const matches = await matchingService.findCompatibleRequests(donor._id);
    
    const { skip = 0, limit = 10 } = req.query;
    const paginated = matches.slice(parseInt(skip), parseInt(skip) + parseInt(limit));

    response.success(res, 200, 'Matching requests retrieved successfully', {
      matches: paginated,
      total: matches.length,
      skip: parseInt(skip),
      limit: parseInt(limit),
    });
  } catch (error) {
    response.error(res, 500, error.message);
  }
};

export const respondToRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { quantity } = req.body;

    const request = await Request.findById(requestId);
    if (!request) {
      return response.error(res, 404, 'Request not found');
    }

    const donation = await donationService.createDonation(
      req.user._id,
      requestId,
      { quantity: quantity || 1 }
    );

    await notificationService.notifyMatch(request.hospitalId, donation, request);

    response.success(res, 201, 'Response submitted successfully', donation);
  } catch (error) {
    response.error(res, 400, error.message);
  }
};

export const getDonationHistory = async (req, res) => {
  try {
    const { status, skip = 0, limit = 10 } = req.query;

    const filter = { donorId: req.user._id };
    if (status && ['pending', 'scheduled', 'completed', 'cancelled'].includes(status)) {
      filter.status = status;
    }

    const donations = await Donation.find(filter)
      .populate('requestId', 'type bloodType organType urgency hospitalId')
      .skip(parseInt(skip))
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await Donation.countDocuments(filter);

    response.success(res, 200, 'Donation history retrieved successfully', {
      donations,
      total,
      skip: parseInt(skip),
      limit: parseInt(limit),
    });
  } catch (error) {
    response.error(res, 500, error.message);
  }
};

export const updateAvailability = async (req, res) => {
  try {
    const { isAvailable } = req.body;

    if (typeof isAvailable !== 'boolean') {
      return response.error(res, 400, 'isAvailable must be a boolean value');
    }

    const donor = await Donor.findByIdAndUpdate(
      req.user._id,
      { isAvailable },
      { new: true, runValidators: true }
    ).select('-password');

    response.success(res, 200, 'Availability status updated successfully', donor);
  } catch (error) {
    response.error(res, 400, error.message);
  }
};
```

**Donor Routes (`src/routes/donor.routes.js`):**

```javascript
import { Router } from 'express';
import authMiddleware from '../middlewares/auth.middleware.js';
import requireRole from '../middlewares/role.middleware.js';
import * as donorController from '../controllers/donor.controller.js';

const router = Router();

router.use(authMiddleware, requireRole('donor'));

router.get('/profile', donorController.getProfile);
router.put('/profile', donorController.updateProfile);
router.get('/requests', donorController.getRequests);
router.get('/matches', donorController.getMatches);
router.post('/respond/:requestId', donorController.respondToRequest);
router.get('/history', donorController.getDonationHistory);
router.put('/availability', donorController.updateAvailability);

export default router;
```

### Part 6: Hospital Controller (`src/controllers/hospital.controller.js`)

**Problem:**
Hospitals need endpoints to create requests, manage donations, and track responses.

**Solution:**
Create controller with 8 endpoints for hospital operations.

**Key Endpoints:**

```javascript
export const createRequest = async (req, res) => {
  try {
    const { type, bloodType, organType, urgency, requiredBy, quantity, notes } = req.body;

    // Validate required fields
    if (!type || !urgency || !requiredBy) {
      return response.error(res, 400, 'Type, urgency, and requiredBy are required');
    }

    if (!['blood', 'organ'].includes(type)) {
      return response.error(res, 400, 'Type must be blood or organ');
    }

    if (!['low', 'medium', 'high', 'critical'].includes(urgency)) {
      return response.error(res, 400, 'Urgency must be low, medium, high, or critical');
    }

    // Blood type required for blood requests
    if (type === 'blood' && !bloodType) {
      return response.error(res, 400, 'Blood type is required for blood donation requests');
    }

    if (bloodType && !['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].includes(bloodType)) {
      return response.error(res, 400, 'Invalid blood type');
    }

    // Organ type required for organ requests
    if (type === 'organ' && !organType) {
      return response.error(res, 400, 'Organ type is required for organ donation requests');
    }

    const requiredByDate = new Date(requiredBy);
    if (requiredByDate <= new Date()) {
      return response.error(res, 400, 'Required date must be in the future');
    }

    const requestData = {
      hospitalId: req.user._id,
      type,
      urgency,
      requiredBy: requiredByDate,
      quantity: quantity || 1,
      notes: notes || '',
    };

    if (type === 'blood') {
      requestData.bloodType = bloodType;
    } else if (type === 'organ') {
      requestData.organType = organType;
    }

    const donRequest = await Request.create(requestData);

    await donRequest.populate('hospitalId', 'name hospitalName address contactNumber');

    response.success(res, 201, 'Donation request created successfully', donRequest);
  } catch (error) {
    response.error(res, 400, error.message);
  }
};

export const getRequests = async (req, res) => {
  try {
    const { status, type, skip = 0, limit = 10 } = req.query;

    const filter = { hospitalId: req.user._id };

    if (status && ['pending', 'in-progress', 'completed', 'cancelled'].includes(status)) {
      filter.status = status;
    }

    if (type && ['blood', 'organ'].includes(type)) {
      filter.type = type;
    }

    const requests = await Request.find(filter)
      .skip(parseInt(skip))
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await Request.countDocuments(filter);

    response.success(res, 200, 'Requests retrieved successfully', {
      requests,
      total,
      skip: parseInt(skip),
      limit: parseInt(limit),
    });
  } catch (error) {
    response.error(res, 500, error.message);
  }
};

export const getDonations = async (req, res) => {
  try {
    const { status, skip = 0, limit = 10 } = req.query;

    // Get all requests by this hospital
    const hospitalRequests = await Request.find({ hospitalId: req.user._id }).select('_id');
    const requestIds = hospitalRequests.map((req) => req._id);

    const filter = { requestId: { $in: requestIds } };

    if (status && ['pending', 'scheduled', 'completed', 'cancelled'].includes(status)) {
      filter.status = status;
    }

    const donations = await Donation.find(filter)
      .populate('donorId', 'name email phoneNumber location bloodType lastDonationDate')
      .populate('requestId', 'type bloodType organType urgency')
      .skip(parseInt(skip))
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await Donation.countDocuments(filter);

    response.success(res, 200, 'Donations retrieved successfully', {
      donations,
      total,
      skip: parseInt(skip),
      limit: parseInt(limit),
    });
  } catch (error) {
    response.error(res, 500, error.message);
  }
};
```

**Hospital Routes (`src/routes/hospital.routes.js`):**

```javascript
import { Router } from 'express';
import authMiddleware from '../middlewares/auth.middleware.js';
import requireRole from '../middlewares/role.middleware.js';
import * as hospitalController from '../controllers/hospital.controller.js';

const router = Router();

router.use(authMiddleware, requireRole('hospital'));

router.get('/profile', hospitalController.getProfile);
router.put('/profile', hospitalController.updateProfile);

router.post('/request', hospitalController.createRequest);
router.get('/requests', hospitalController.getRequests);
router.get('/requests/:requestId', hospitalController.getRequestDetails);
router.put('/requests/:requestId', hospitalController.updateRequest);
router.delete('/requests/:requestId', hospitalController.deleteRequest);

router.get('/donations', hospitalController.getDonations);

export default router;
```

## Phase 3 Summary

**Files Created:**
- `src/utils/geo.js` - Location calculations
- `src/services/matching.service.js` - Matching algorithm
- `src/services/donation.service.js` - Donation lifecycle
- `src/services/notification.service.js` - Notification system
- `src/controllers/donor.controller.js` - 7 donor endpoints
- `src/controllers/hospital.controller.js` - 8 hospital endpoints

**Files Modified:**
- `src/routes/donor.routes.js` - Implemented 7 routes
- `src/routes/hospital.routes.js` - Implemented 8 routes

**Total Endpoints Added:** 15
- Donor: 7 endpoints
- Hospital: 8 endpoints

**What's Possible Now:**
- ✅ Donors view and respond to requests
- ✅ Hospitals create and manage requests
- ✅ Intelligent matching with medical accuracy
- ✅ Both role types get notifications
- ✅ Track full donation lifecycle

---

# Quick Reference Guide

## How to Add a New Donor Endpoint

1. Add function to `src/controllers/donor.controller.js`
2. Use `response.success()` and `response.error()` for consistent responses
3. Add route to `src/routes/donor.routes.js`
4. Route is automatically protected by `authMiddleware` and `requireRole('donor')`

## How to Add a New Hospital Endpoint

Same as donor, but:
1. Function in `src/controllers/hospital.controller.js`
2. Route in `src/routes/hospital.routes.js`
3. Automatically protected by `requireRole('hospital')`

## How to Create a Service Function

1. Create in `services/` folder
2. Service throws errors (doesn't respond to HTTP)
3. Controller catches errors and responds
4. Example: `donationService.createDonation()` throws, controller calls `response.error()`

## Blood Type Compatibility Reference

- **O-:** Universal donor (can give to all 8 types)
- **O+:** Can give to O+, A+, B+, AB+
- **A-:** Can give to A-, A+, AB-, AB+
- **A+:** Can give to A+, AB+
- **B-:** Can give to B-, B+, AB-, AB+
- **B+:** Can give to B+, AB+
- **AB-:** Can give to AB-, AB+
- **AB+:** Universal recipient (can receive from all types)

## Database Index Strategy

**Frequently Queried Patterns:**

```
Request:
- Get hospital's pending requests: {hospitalId: 1, status: 1}
- Get urgent requests by urgency: {urgency: 1, status: 1}

Donation:
- Get donor's pending donations: {donorId: 1, status: 1}
- Get donations for hospital's requests: {requestId: 1, status: 1}

Notification:
- Get user's unread notifications: {userId: 1, read: 1}
- Get recent notifications: {userId: 1, createdAt: -1}
```

## Error Codes Used Throughout

```
200 - Success
201 - Created (for POST endpoints)
400 - Bad Request (validation error)
401 - Unauthorized (missing/invalid token)
403 - Forbidden (insufficient permissions)
404 - Not Found
500 - Internal Server Error
```

## Controller Response Pattern

```javascript
try {
  // 1. Validate input
  if (!required) {
    return response.error(res, 400, 'Clear error message');
  }
  
  // 2. Call service
  const result = await service.doSomething();
  
  // 3. Return success
  response.success(res, 200, 'Success message', result);
} catch (error) {
  // 4. Return error
  response.error(res, 400, error.message);
}
```

---

**End of Documentation - Happy Coding! 🚀**
