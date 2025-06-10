import { Schema, model } from 'mongoose';

const subscriptionSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    plan: { type: Schema.Types.ObjectId, ref: 'Plan', required: true },
    planName: String,
    interval: { type: String, enum: ['monthly', 'yearly'], required: true },
    amount: Number,
    usage: {
      listingsUsed: { type: Number, default: 0 },
      featuredListingUsed: { type: Number, default: 0 },
    },
    paymentStatus: {
      type: String,
      enum: ['successful', 'failed', 'pending'],
      default: 'pending',
    },
    subscriptionStatus: {
      type: String,
      enum: ['expired', 'cancelled', 'active'],
      default: 'active',
    },
    paymentType: String,
    userEmail: { type: String, required: true },
    txRef: String,
    flutterwaveTransactionId: Number,
    paymentPlanId: Number,
    subscriptionStartDate: { type: Date, default: Date.now },
    subscriptionEndDate: Date,
  },
  { timestamps: true }
);

const Subscription = model('Subscription', subscriptionSchema);

export default Subscription;
