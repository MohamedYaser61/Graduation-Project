// Define the user schema
/**
 * fields:
 * - name: string, required
 * - email: string, required, unique
 * - password: string, required, hashed
 * - role: string, enum: ['admin', 'donor', 'hospital'], default: 'donor'
 * - createdAt: date, default: Date.now
 * - updatedAt: date, default: Date.now
 */

// Define the user model
import mongoose, { Schema } from "mongoose";

const userSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ["admin", "donor", "hospital"],
      default: "donor",
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

const User = mongoose.model("User", userSchema);

export default User;
