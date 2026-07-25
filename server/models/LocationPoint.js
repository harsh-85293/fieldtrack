import mongoose from 'mongoose';
import { SYNC_STATUS } from '../config/constants.js';

const { Schema } = mongoose;

const locationPointSchema = new Schema(
  {
    employee: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    session: {
      type: Schema.Types.ObjectId,
      ref: 'WorkSession',
      required: true,
    },
    latitude: {
      type: Number,
      required: true,
    },
    longitude: {
      type: Number,
      required: true,
    },
    accuracy: {
      type: Number,
    },
    speed: {
      type: Number,
    },
    heading: {
      type: Number,
    },
    clientTimestamp: {
      type: Date,
      required: true,
    },
    serverTimestamp: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: [SYNC_STATUS.SYNCED, SYNC_STATUS.REJECTED],
      default: SYNC_STATUS.SYNCED,
    },
    rejectReason: {
      type: String,
    },
  },
  {
    timestamps: true,
  },
);

locationPointSchema.index({ session: 1, clientTimestamp: 1 });
locationPointSchema.index({ employee: 1, clientTimestamp: 1 });
locationPointSchema.index({ session: 1, status: 1 });

export default mongoose.model('LocationPoint', locationPointSchema);
