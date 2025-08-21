import { Schema, model } from 'mongoose';

const scheduleSchema = new Schema(
  {
    clientName: { type: String, required: true },
    clientEmail: { type: String, trim: true, lowercase: true, required: true },
    message: { type: String },
    scheduleDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rescheduled', 'rejected', 'completed'],
      default: 'pending',
    },
    property: { type: Schema.Types.ObjectId, ref: 'Property', required: true },
    realtor: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    client: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    inspectionFee: { type: Number, required: true },
    platformCommission: { type: Number, default: 0 },
    totalPaid: { type: Number, default: 0 },
    isPaid: { type: Boolean, default: false },
    isRealtorPaid: { type: Boolean, default: false },
    paymentStatus: { type: String, default: 'pending' },
    txRef: { type: String },
    flutterwaveTransactionId: { type: String },
  },
  { timestamps: true }
);

const Schedule = model('Schedule', scheduleSchema);

export default Schedule;
