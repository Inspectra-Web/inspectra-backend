import { Schema, model } from 'mongoose';

const profileSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    firstname: { type: String, default: '' },
    middlename: { type: String, default: '' },
    lastname: { type: String, default: '' },
    email: { type: String },
    role: { type: String },
    avatar: { type: String },
    avatarId: { type: String },
    gender: { type: String, default: '' },
    bio: { type: String, default: '' },
    houseAddress: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    country: { type: String, default: '' },
    telephone: { type: String, default: '' },
    whatsapp: { type: String, default: '' },
    // website: { type: String, default: '' },
    socialLinks: {
      facebook: { type: String, default: '' },
      twitter: { type: String, default: '' },
      linkedIn: { type: String, default: '' },
      instagram: { type: String, default: '' },
    },
    license: { type: String, default: '' },
    experience: Number,
    properties: Number,
    specialization: {
      type: String,
      enum: [
        'rentals',
        'agriculture',
        'luxury',
        'commercial',
        'residential',
        'industrial',
        'investment',
        'land',
        'any',
      ],
      default: 'any',
    },
    agency: { type: String, default: '' },
    agencyAddress: { type: String, default: '' },
    region: { type: String, default: '' },
    availabilityStatus: {
      type: String,
      enum: ['available', 'unavailable', 'busy', 'temporarily-unavailable'],
      default: 'available',
    },
    contactMeans: {
      type: String,
      enum: ['email', 'whatsapp', 'facebook', 'call', 'any'],
      default: 'email',
    },
    qualifications: {
      certification: { type: String, default: '' },
      education: { type: String, default: '' },
    },
    language: { type: String, default: '' },
    verificationImages: [
      {
        url: { type: String, required: true },
        publicId: { type: String, required: true },
        type: {
          type: String,
          enum: ['government-issued-id', 'license', 'utility-bill', 'qualification'],
          required: true,
        },
        status: {
          type: String,
          enum: ['pending', 'verified', 'rejected'],
          default: 'pending',
        },
        uploadedAt: { type: Date, default: Date.now() },
      },
    ],
    verified: { type: Boolean, default: false },
    deactivated: { type: Boolean, default: false },
    deactivatedBy: { type: Schema.Types.ObjectId, ref: 'Profile', default: null },
    consultationCost: { type: Number, default: 0 },
    accountDetails: {
      accountName: String,
      accountNumber: String,
      bankName: String,
      bankCode: String,
    },
  },
  { timestamps: true }
);

const Profile = model('Profile', profileSchema);

export default Profile;
