import mongoose from 'mongoose';

const { Schema } = mongoose;

const employeeProfileSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    designation: {
      type: String,
      trim: true,
    },
    department: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    city: {
      type: String,
      trim: true,
    },
    state: {
      type: String,
      trim: true,
    },
    postalCode: {
      type: String,
      trim: true,
    },
    dateOfBirth: {
      type: Date,
    },
    joiningDate: {
      type: Date,
      default: Date.now,
    },
    avatarColor: {
      type: String,
      default: '#6366f1',
    },
  },
  {
    timestamps: true,
  },
);

export default mongoose.model('EmployeeProfile', employeeProfileSchema);
