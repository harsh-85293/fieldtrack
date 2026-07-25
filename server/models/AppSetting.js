import mongoose from 'mongoose';

const { Schema } = mongoose;

const appSettingSchema = new Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    value: {
      type: Schema.Types.Mixed,
    },
    category: {
      type: String,
      default: 'general',
      trim: true,
    },
    label: {
      type: String,
      trim: true,
    },
    isPublic: {
      type: Boolean,
      default: false,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  },
);

export default mongoose.model('AppSetting', appSettingSchema);
