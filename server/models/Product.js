import mongoose from 'mongoose';
import { toMinorUnits, fromMinorUnits } from '../utils/geo.js';

const { Schema } = mongoose;

/**
 * defaultPrice is stored in minor units (paise).
 * The getter converts back to rupees; the setter accepts rupees and stores paise.
 */
const productSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    sku: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    unit: {
      type: String,
      default: 'pc',
      trim: true,
    },
    defaultPrice: {
      type: Number,
      get: (v) => (v == null ? null : fromMinorUnits(v)),
      set: (v) => (v == null ? null : toMinorUnits(v)),
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
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

productSchema.index({ name: 'text' });
productSchema.index({ isActive: 1 });

export default mongoose.model('Product', productSchema);
