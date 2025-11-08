import { Schema, model } from 'mongoose';

const propertySchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    propertyId: { type: String },
    title: { type: String, required: [true, 'Property title is required'] },
    type: {
      type: String,
      required: [true, 'Property type is required'],
      // prettier-ignore
      enum: ['office', 'warehouse', 'land', 'apartment', 'condominium', 'duplex', 'townhouse', 'villa', 'bungalow', 'single-family-home', 'multi-family-home', 'studio', 'penthouse', 'hotel', 'resort', 'restaurant', 'serviced-apartment', 'hospital', 'school', 'farm', 'campground', 'mansion', 'maisonette', 'self-contained', 'flat', 'other',
    ],
    },
    category: {
      type: String,
      required: [true, 'Property category is required'],
      // prettier-ignore
      enum: ['residential', 'commercial', 'industrial', 'land', 'agricultural', 'hospitality', 'mixed-use', 'institutional', 'recreational'],
    },
    listingStatus: {
      type: String,
      required: [true, 'Listing status is required'],
      enum: ['rent', 'sale', 'lease', 'shortlet', 'sold', 'rented', 'leased'],
    },
    reviewStatus: { type: String, default: 'pending', enum: ['pending', 'approved', 'rejected'] },
    description: { type: String, required: [true, 'Property description is required'] },
    price: { type: Number, required: [true, 'Property price is required'] },
    address: {
      fullAddress: { type: String, required: [true, 'Full Address is required'] },
      city: { type: String, required: [true, 'City or LGA is required'] },
      state: { type: String, required: [true, 'State or Province is required'] },
      country: { type: String, required: [true, 'Country is required'] },
    },
    features: {
      bedrooms: { type: Number, default: 0 },
      bathrooms: { type: Number, default: 0 },
      toilets: { type: Number, default: 0 },
      garage: { type: Number, default: 0 },
      kitchen: { type: Number, default: 0 },
      floors: { type: Number, default: 0 },
      floorArea: { type: Number, default: 0 },
      landSize: { type: Number, default: 0 },
      yearBuilt: { type: Number, default: 0 },
    },
    amenities: { type: [String] },
    videos: { type: String },
    videoFile: { url: String, publicId: String },
    images: [{ url: { type: String }, publicId: { type: String } }],
    variations: {
      type: [String],
      enum: [
        'Premium',
        'Featured',
        'New',
        'Hot',
        'Trending',
        'Exclusive',
        'Luxury',
        'Popular',
        'Best-deal',
        'Price-reduced',
        'Coming-soon',
      ],
      default: [],
    },
    verified: { type: Boolean, default: false },
    views: { type: Number, default: 0 },
    inquiries: { type: Number, default: 0 },
    schedules: { type: Number, default: 0 },
    inspectionCost: { type: Number, default: 0 },
    rentalDuration: {
      type: String,
      // enum: ['per_day', 'per_week', 'per_month', 'per_year', '1_year', '2_year', '3_year_plus'],
      default: '',
    },
    slug: { type: String, unique: true, trim: true, lowercase: true },
    // --- NEW FIELDS FOR HIGHLIGHTS & NOTABLE POINTS ---
    urgencyTag: { type: String, lowercase: true }, // e.g., "1 UNIT LEFT📌", "Limited Offer"
    negotiableStatus: {
      type: String,
      enum: ['Negotiable', 'Slightly Negotiable', 'Asking'],
      default: 'Asking',
    },
    specialOffer: { type: String, default: '', trim: true, maxLength: 200 }, // e.g., "✨ Special: 2+ nights @ ₦55,000/night"
    notablePoint: { type: String }, // e.g., ["Perfect for shortlet, annual rental investment, or personal residence", "Payment Plan Available: 50% down and 2 months balance"]

    // --- NEW FIELDS FOR LEGAL FEES & DOCUMENTS ---
    legalDocuments: [
      {
        name: {
          type: String,
          required: true,
          enum: [
            'Certificate of Occupancy (C of O)',
            'Governor’s Consent',
            'Deed of Assignment',
            'Deed of Conveyance',
            'Deed of Lease / Sublease',
            'Power of Attorney',
            'Land Purchase Receipt',
            'Registered Survey Plan',
            'Excision / Gazette',
            'Building Plan Approval',
            'Environmental Impact Assessment (EIA)',
            'Completion Certificate',
            'Certificate of Habitability',
            'Property Tax Clearance Certificate',
            'Valuation Report',
            'Tenancy Agreement',
            'Lease Agreement',
            'Inspection Report',
            'Estate Allocation Letter',
            'Agency Agreement',
            'Government Allocation Letter',
            'Affidavit of Ownership',
            'Offer Letter / Acceptance Letter',
            'Other',
          ],
        },
        notes: { type: String }, // optional description or comments
        fileUrl: { type: String }, // optional scanned copy / image / pdf
        publicId: { type: String }, // Cloudinary or storage ref
        verificationStatus: {
          type: String,
          enum: ['pending', 'rejected', 'verified'],
          default: 'pending',
        }, // has Inspectra/legal partner checked this?
        issuedDate: { type: Date }, // optional date document was issued
        size: { type: Number },
      },
    ],
    
    // --- NEW FIELDS: TRANSPARENT FEES & TERMS ---
    transparentFeesAndTerms: {
      basePrice: { type: Number, required: false, min: 0 },
      currency: { type: String, default: 'NGN' },
      paymentTerms: { type: String, trim: true },
      negotiability: {
        rent: { type: Boolean, default: false },
        agencyFee: { type: Boolean, default: false },
        legalFee: { type: Boolean, default: false },
      },
      additionalFees: [
        {
          name: { type: String, required: true },
          description: { type: String },
          amount: { type: Number, required: true, min: 0 },
          optional: { type: Boolean, default: false },
        },
      ],
      refundPolicy: { type: String, trim: true },
      duration: { type: String, trim: true },
      utilitiesIncluded: { type: String, trim: true },
      specialNotes: { type: String, trim: true },
    },
  },
  { timestamps: true }
);

const Property = model('Property', propertySchema);

export default Property;
