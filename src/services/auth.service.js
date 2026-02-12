// Define the auth service
/**
 * fields:
 * - register(name, email, password, role)
 * - login(email, password)
 * - logout(refreshToken)
 * - refreshToken(refreshToken)
 * - forgotPassword(email)
 * - resetPassword(token, password)
 * - getMe(userId)
 * - verifyEmail(email)
 * - verifyEmailToken(token)
 */

// Auth is the Business Logic Layer for the auth routes

import bcrypt from 'bcryptjs';
import * as jwt from '../utils/jwt.js';
import { env } from '../config/env.js';
import User from '../models/User.model.js';
import Donor from '../models/Donor.model.js';
import Hospital from '../models/Hospital.model.js';

// Register a new user
export const register = async (data) => {
    const {role} = data; // role is either 'donor' or 'hospital'

    // Check if the email is already registered
    const existingUser = await User.findOne({ email: data.email });
    if (existingUser) throw new Error('Email already registered');
    
    // Validate password strength before hashing
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(data.password)) {
        throw new Error('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character');
    }

    const hashedPassword = await bcrypt.hash(data.password, env.BCRYPT_SALT_ROUNDS);

    const payload = {
        ...data,
        password: hashedPassword,
    };


    const user = await User.create({
        ...payload,
        role: role,
    })

    // We will learn about token later
    // return {
    //     user: user.toObject(),
    //     tokens: {
    //         accessToken: jwt.signToken({ userId: user._id, role: user.role }),
    //         refreshToken: jwt.signRefreshToken({ userId: user._id, role: user.role }),
    //     },
    // };

    return user;
};

// Login a user
export const login = async ({ email, password }) => {
    
  const user = await User.findOne({ email }).select('+password');

  if (!user) throw new Error('Invalid credentials');

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) throw new Error('Invalid credentials');
// We will learn about token later
//   const token = jwt.sign(
//     { id: user._id, role: user.role },
//     process.env.JWT_SECRET,
//     { expiresIn: '7d' }
//   );

  return { token, user };
};