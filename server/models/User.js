import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { ROLES } from '../config/constants.js';

const { Schema } = mongoose;

const userSchema = new Schema(
  {
    role: {
      type: String,
      enum: [ROLES.ADMIN, ROLES.EMPLOYEE],
      default: ROLES.EMPLOYEE,
      required: true,
    },
    employeeId: {
      type: String,
      unique: true,
      sparse: true,
      uppercase: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Invalid email address'],
    },
    password: {
      type: String,
      minlength: 6,
      select: false,
      validate: {
        validator: function (v) {
          if (this.provider) return true;
          return !!v;
        },
        message: 'Password is required for non-OAuth accounts',
      },
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    profilePicture: {
      type: String,
      trim: true,
      default: null,
    },
    provider: {
      type: String,
      enum: ['google', null],
      default: null,
    },
    providerId: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['active', 'pending', 'suspended', 'rejected'],
      default: 'active',
    },
    rejectionReason: {
      type: String,
      trim: true,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    mustChangePassword: {
      type: Boolean,
      default: false,
    },
    lastLoginAt: {
      type: Date,
    },
    passwordChangedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
);

userSchema.index({ role: 1, isActive: 1 });

// Hash password before saving if modified
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  if (!this.password) return next();
  try {
    const rounds = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);
    const salt = await bcrypt.genSalt(rounds);
    this.password = await bcrypt.hash(this.password, salt);
    this.passwordChangedAt = new Date();
    return next();
  } catch (err) {
    return next(err);
  }
});

/**
 * Compare a candidate password against the stored hash.
 * @param {string} candidate
 * @returns {Promise<boolean>}
 */
userSchema.methods.matchPassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

/**
 * Strip sensitive fields from JSON output.
 */
userSchema.methods.toSafeJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.__v;
  obj.id = obj._id?.toString?.() || obj._id;
  return obj;
};

export default mongoose.model('User', userSchema);
