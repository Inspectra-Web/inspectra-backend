import { model, Schema } from 'mongoose';

const planSchema = new Schema(
  {
    name: { type: String, required: true, enum: ['Starter', 'Professional', 'Agency'] },
    interval: { type: String, required: true, enum: ['monthly', 'yearly'] },
    amount: { type: Number, required: true },
    flutterwavePlanId: { type: Number, required: true },
    planToken: { type: String, required: true },
    features: {
      maxListings: Number,
      featuredListings: Number,
      canJoinAgency: Boolean,
      canCreateAgency: Boolean,
      hasMapIntegration: Boolean,
      canHandleInspectionFees: Boolean,
      directInquiries: Boolean,
    },
  },
  { timestamps: true }
);

const Plan = model('Plan', planSchema);

export default Plan;
