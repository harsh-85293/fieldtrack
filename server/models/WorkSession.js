import mongoose from 'mongoose';
import { SESSION_STATUS } from '../config/constants.js';

const { Schema } = mongoose;

const locationSchema = new Schema(
  {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    accuracy: { type: Number },
  },
  { _id: false },
);

const workSessionSchema = new Schema(
  {
    employee: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    sessionDate: {
      type: Date,
      required: true,
    },
    checkInAt: {
      type: Date,
      required: true,
    },
    checkInLocation: locationSchema,
    checkOutAt: {
      type: Date,
    },
    checkOutLocation: locationSchema,
    status: {
      type: String,
      enum: [SESSION_STATUS.ACTIVE, SESSION_STATUS.COMPLETED],
      default: SESSION_STATUS.ACTIVE,
    },
    totalDurationMs: {
      type: Number,
      default: 0,
    },
    totalDistanceKm: {
      type: Number,
      default: 0,
    },
    locationTrackingStatus: {
      type: String,
      enum: ['tracking', 'paused', 'stopped'],
      default: 'tracking',
    },
    deviceInfo: {
      type: Schema.Types.Mixed,
    },
    visitCount: {
      type: Number,
      default: 0,
    },
    corrected: {
      type: Boolean,
      default: false,
    },
    correctionReason: {
      type: String,
    },
    correctedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  },
);

workSessionSchema.index({ employee: 1, sessionDate: 1 });
workSessionSchema.index({ employee: 1, status: 1 });
workSessionSchema.index(
  { employee: 1 },
  { unique: true, partialFilterExpression: { status: SESSION_STATUS.ACTIVE } },
);
workSessionSchema.index({ status: 1, sessionDate: 1 });
workSessionSchema.index({ sessionDate: 1 });

export default mongoose.model('WorkSession', workSessionSchema);
