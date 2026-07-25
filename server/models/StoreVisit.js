import mongoose from 'mongoose';
import { toMinorUnits, fromMinorUnits } from '../utils/geo.js';
import { SYNC_STATUS } from '../config/constants.js';

const { Schema } = mongoose;

const locationSchema = new Schema(
  {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    accuracy: { type: Number },
  },
  { _id: false },
);

const visitItemSchema = new Schema(
  {
    product: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
    },
    productName: {
      type: String,
      required: true,
      trim: true,
    },
    sku: {
      type: String,
      trim: true,
      uppercase: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0,
    },
    unitPrice: {
      type: Number,
      required: true,
      get: (v) => (v == null ? null : fromMinorUnits(v)),
      set: (v) => (v == null ? null : toMinorUnits(v)),
    },
    collectedAmount: {
      type: Number,
      default: 0,
      get: (v) => (v == null ? 0 : fromMinorUnits(v)),
      set: (v) => (v == null ? 0 : toMinorUnits(v)),
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  { _id: false, toObject: { getters: true, setters: true }, toJSON: { getters: true, setters: true } },
);

const storeVisitSchema = new Schema(
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
    store: {
      type: Schema.Types.ObjectId,
      ref: 'Store',
      required: true,
    },
    visitDate: {
      type: Date,
      default: Date.now,
    },
    location: locationSchema,
    distanceFromStoreMeters: {
      type: Number,
      default: 0,
    },
    isOutsideRadius: {
      type: Boolean,
      default: false,
    },
    notes: {
      type: String,
      trim: true,
    },
    items: [visitItemSchema],
    totalQuantity: {
      type: Number,
      default: 0,
    },
    totalValue: {
      type: Number,
      default: 0,
      get: (v) => (v == null ? 0 : fromMinorUnits(v)),
      set: (v) => (v == null ? 0 : toMinorUnits(v)),
    },
    idempotencyKey: {
      type: String,
      required: true,
      unique: true,
    },
    syncStatus: {
      type: String,
      enum: [SYNC_STATUS.PENDING, SYNC_STATUS.SYNCED, SYNC_STATUS.REJECTED],
      default: SYNC_STATUS.SYNCED,
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
    toObject: { getters: true, setters: true },
    toJSON: { getters: true, setters: true },
  },
);

storeVisitSchema.index({ employee: 1, visitDate: 1 });
storeVisitSchema.index({ store: 1, visitDate: 1 });
storeVisitSchema.index({ session: 1 });
storeVisitSchema.index({ visitDate: 1 });

export default mongoose.model('StoreVisit', storeVisitSchema);
