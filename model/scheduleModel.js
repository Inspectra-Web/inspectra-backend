import { Schema, model } from 'mongoose';

const scheduleSchema = new Schema(
  {
    clientName: { type: String, required: true },
    clientEmail: { type: String, trim: true, lowercase: true, required: true },
    message: { type: String },
    scheduleDate: { type: Date, required: true },
    status: { type: String, enum: ['pending', 'accepted', 'rescheduled', 'rejected', 'completed'] },
    property: { type: Schema.Types.ObjectId, ref: 'Property', required: true },
    realtor: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

const Schedule = model('Schedule', scheduleSchema);

export default Schedule;
