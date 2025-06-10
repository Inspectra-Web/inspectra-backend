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
      enum: ['office', 'warehouse', 'land', 'apartment', 'condominium', 'duplex', 'townhouse', 'villa', 'bungalow', 'single-family-home', 'multi-family-home', 'studio', 'penthouse', 'hotel', 'resort', 'restaurant', 'serviced-apartment', 'hospital', 'school', 'farm', 'campground', 'mansion', 'self-contained', 'flat', 'other',
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
  },
  { timestamps: true }
);

const Property = model('Property', propertySchema);

export default Property;
