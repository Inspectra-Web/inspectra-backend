import { Schema, model } from 'mongoose';

const inquirySchema = new Schema(
  {
    client: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    clientName: { type: String, required: true },
    clientEmail: { type: String, trim: true, lowercase: true, required: true },
    message: { type: String, required: true },
    preferredContactMethod: {
      type: String,
      enum: ['email', 'whatsapp', 'facebook', 'call', 'any'],
      required: true,
    },
    urgencyLevel: {
      type: String,
      enum: [
        'immediately (within a week)',
        'soon (within a month)',
        'flexible (1 - 3 months)',
        'not urgent (3+ months)',
      ],
      required: true,
    },
    property: { type: Schema.Types.ObjectId, ref: 'Property', required: true },
    realtor: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    chatRoom: { type: Schema.Types.ObjectId, ref: 'ChatRoom' },
    propertyManager: { type: String, required: true },
  },
  { timestamps: true }
);

const Inquiry = model('Inquiry', inquirySchema);

export default Inquiry;
