import Property from '../model/propertyModel.js';
import { APIFeatures } from '../utils/apiFeatures.js';
import AppError from '../utils/appError.js';
import catchAsync from '../utils/catchAsync.js';
import { deleteFromCloudinary, resizeImage, uploadToCloudinary } from '../utils/upload.js';
import { propertyStats, validatePropertyCategoryAndType } from '../helpers/propertyHelpers.js';
import { Email } from '../utils/email.js';
import User from '../model/userModel.js';
import { envConfig } from '../configuration/environmentConfig.js';
import Profile from '../model/profileModel.js';
import { canCreateListing } from '../helpers/planHelpers.js';
import Subscription from '../model/subscriptionModel.js';

// Validate File Size
const validateFileSize = (files, maxSize, typeLabel) => {
  for (const file of files) {
    if (file.size > maxSize) {
      throw new AppError(`${typeLabel} must be less than ${maxSize / (1024 * 1024)}MB.`, 400);
    }
  }
};

// Add or Update Listing
export const addOrUpdatePropertyListing = catchAsync(async (req, res, next) => {
  const { propertyId } = req.params;
  const user = await Profile.findOne({ user: req.user._id });
  if (user.verified === false)
    return next(new AppError('Kindly verify your profile to proceed!', 400));

  const { files } = req;
  const imageFiles = files?.images || [];
  const videoFiles = files?.videoFile || [];

  try {
    validateFileSize(imageFiles, 5 * 1024 * 1024, 'Each image');
    if (videoFiles.length > 0) validateFileSize([videoFiles[0]], 50 * 1024 * 1024, 'Video');
  } catch (err) {
    return next(err);
  }

  const {
    title,
    type,
    category,
    listingStatus,
    description,
    price,
    fullAddress,
    city,
    state,
    country,
    bedrooms,
    bathrooms,
    garage,
    kitchen,
    floors,
    floorArea,
    landSize,
    yearBuilt,
    amenities,
    toilets,
    videos,
    imagesToKeep,
    variations,
    verified,
    inspectionCost,
    rentalDuration,
  } = req.body;

  if (
    !title ||
    !type ||
    !category ||
    !listingStatus ||
    !description ||
    !price ||
    !fullAddress ||
    !city ||
    !state ||
    !country
  )
    return next(
      new AppError(
        'All required fields (title, type, category, listingStatus, description, price and address) must be provided',
        400
      )
    );

  try {
    validatePropertyCategoryAndType(category, type);
  } catch (error) {
    return next(error);
  }

  let subscriptionToUpdate;

  if (!propertyId) {
    const { allowed, subscription, message } = await canCreateListing(
      req.user._id,
      variations?.includes('Featured') ? 'featured' : 'normal'
    );

    if (!allowed) return next(new AppError(message, 403));
    subscriptionToUpdate = subscription;
  }

  if (propertyId && variations?.includes('Featured')) {
    const existing = await Property.findById(propertyId);
    if (!existing) return next(new AppError('Property not found', 404));

    const isNewlyFeatured = !existing.variations.includes('Featured');

    if (isNewlyFeatured) {
      const { allowed, subscription, message } = await canCreateListing(req.user._id, 'featured');
      if (!allowed) return next(new AppError(message, 403));
      subscriptionToUpdate = subscription;
    }
  }

  let property;

  if (propertyId) {
    property = await Property.findById(propertyId);
    if (!property) return next(new AppError('Property not found', 404));
    if (property.user.toString() !== req.user._id.toString() && req.user.role !== 'admin')
      return next(new AppError('You are not authorized to update this property', 403));
  } else {
    property = new Property();
    property.user = propertyId ? property.user : req.user._id;
  }
  const imagesToKeepArray = Array.isArray(JSON.parse(imagesToKeep))
    ? imagesToKeep
    : imagesToKeep
    ? [imagesToKeep]
    : [];

  let newImages = property.images || [];
  let newlyUploadedImages = [];

  if (propertyId) {
    const imagesToDelete = property.images.filter(
      images => !imagesToKeepArray.includes(images.url)
    );

    const deleteImagePromises = imagesToDelete.map(image => deleteFromCloudinary(image.publicId));
    await Promise.all(deleteImagePromises);

    newImages = property.images.filter(image => imagesToKeepArray.includes(image.url));
  }
  if (imageFiles && imageFiles.length > 0) {
    try {
      const imagesUploadPromises = imageFiles.map(async file => {
        const resizeImg = await resizeImage(file?.buffer, 1600, 800, { preserveAspect: true });
        const { secure_url, public_id } = await uploadToCloudinary(resizeImg, 'property_images');

        return { url: secure_url, publicId: public_id };
      });

      const uploadedImages = await Promise.all(imagesUploadPromises);
      newlyUploadedImages = uploadedImages;
      newImages = [...newImages, ...uploadedImages];
    } catch (error) {
      return next(new AppError('Image upload failed. Please try again.', 500));
    }
  }

  let newVideo = property.videoFile || null;
  if (videoFiles.length > 0) {
    try {
      const file = videoFiles[0];
      const { secure_url, public_id } = await uploadToCloudinary(
        file.buffer,
        'property_videos',
        'video'
      );
      newVideo = { url: secure_url, publicId: public_id };

      if (property.videoFile?.publicId) await deleteFromCloudinary(property.videoFile.publicId);
    } catch (error) {
      // Clean up only the images uploaded in this session (not existing ones)
      const cleanupImagePromises = newlyUploadedImages.map(img =>
        deleteFromCloudinary(img.publicId)
      );
      await Promise.allSettled(cleanupImagePromises);

      console.log('Video upload failed during update: ', error);
      return next(new AppError('Video upload failed. Please try again.', 500));
    }
  }
  property.title = title;
  property.type = type;
  property.category = category;
  property.listingStatus = listingStatus;
  property.description = description;
  property.price = price;
  property.inspectionCost = +inspectionCost;
  property.rentalDuration = rentalDuration;
  property.address = { fullAddress, city, country, state };
  // prettier-ignore
  property.features = {bedrooms, bathrooms, garage, kitchen, floors, floorArea, landSize, yearBuilt, toilets};
  property.amenities = amenities;
  property.videos = videos;
  property.videoFile = newVideo;
  property.images = newImages;
  property.propertyId = `INSPECTRA-${crypto.randomUUID().split('-')[0].toUpperCase()}`;
  property.reviewStatus = req.user.role === 'admin' ? property.reviewStatus : 'pending';
  property.verified = req.user.role === 'admin' ? verified : false;
  property.variations = variations;

  await property.save();

  if (!propertyId && subscriptionToUpdate) {
    if (variations?.includes('Featured')) subscriptionToUpdate.usage.featuredListingUsed += 1;
    subscriptionToUpdate.usage.listingsUsed += 1;
    await subscriptionToUpdate.save();
  }

  if (propertyId && subscriptionToUpdate) {
    subscriptionToUpdate.usage.featuredListingUsed += 1;
    await subscriptionToUpdate.save();
  }

  const propertyUser = await User.findByIdAndUpdate(
    propertyId ? property.user : req.user._id,
    { $addToSet: { property: property._id } },
    { new: true }
  );

  if (req.user.role !== 'admin')
    await new Email(
      propertyUser,
      `${envConfig.CLIENT_URL}/app/manage-property/${property._id}`,
      propertyId ? 'updated' : 'created',
      {},
      envConfig.EMAIL_FROM,
      property
    ).sendAdminListingNotice();

  res.status(propertyId ? 200 : 201).json({
    message: `Property Listing ${propertyId ? 'updated' : 'created'} successfully`,
    data: { property },
  });
});

// My Listing
export const myPropertyListings = catchAsync(async (req, res, next) => {
  const features = new APIFeatures(Property.find({ user: req.user.id }), req.query)
    .sort()
    .search(['title', 'type', 'category', 'listingStatus', 'address.city', +'price'])
    .limitFields()
    .paginate();
  const properties = await features.query;
  const totalCount = await Property.countDocuments();

  res.status(200).json({
    status: 'success',
    results: properties.length,
    data: { properties, totalCount, page: req.query.page || 1, limit: req.query.limit || 10 },
  });
});

// One Listing
export const onePropertyListing = catchAsync(async (req, res, next) => {
  const property = await Property.findById(req.params.id);
  const realtor = await User.findById(property.user);

  if (!property && !realtor) return next(new AppError('No property listing or profile found', 404));

  res.status(200).json({ status: 'success', data: { property, realtor } });
});

// Delete Listing
export const deletePropertyListing = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const property = await Property.findById(id);

  if (!property) return next(new AppError('Property not found', 404));

  if (property.user.toString() !== req.user._id && req.user.role !== 'admin')
    return next(new AppError('You are not authorized to delete this property', 403));

  if (property.images && property.images.length > 0) {
    const deleteImagesPromises = property.images.map(image => deleteFromCloudinary(image.publicId));

    await Promise.all(deleteImagesPromises);
  }

  if (property.videoFile?.publicId) await deleteFromCloudinary(property.videoFile?.publicId);

  const subscription = await Subscription.findOne({
    user: property.user,
    subscriptionStatus: 'active',
    paymentStatus: 'successful',
    subscriptionEndDate: { $gte: new Date() },
  });

  if (subscription) {
    if (subscription.usage) {
      if (subscription.usage.listingsUsed > 0) subscription.usage.listingsUsed -= 1;
      if (property.variations?.includes('Featured') && subscription.usage.featuredListingUsed)
        subscription.usage.featuredListingUsed -= 1;

      await subscription.save();
    }
  }

  await property.deleteOne();

  res.status(200).json({ status: 'success', message: 'Property deleted successfully' });
});

// Get / View Listings
export const getPropertyListings = catchAsync(async (req, res, next) => {
  const { reviewStatus } = req.query;

  if (reviewStatus && !['pending', 'approved', 'rejected'].includes(reviewStatus))
    return next(new AppError('Invalid status provided', 400));

  const features = new APIFeatures(Property.find(reviewStatus && { reviewStatus }), req.query)
    .sort()
    .search(['title', 'type', 'category', 'listingStatus', 'address.city', +'price'])
    .limitFields()
    .paginate();

  const properties = await features.query;
  const totalCount = await Property.countDocuments();

  res.status(200).json({
    status: 'success',
    results: properties.length,
    data: { properties, totalCount, page: req.query.page || 1, limit: req.query.limit || 10 },
  });
});

// Get / View Listings Infinite
export const getPropertyListingsInfinite = catchAsync(async (req, res, next) => {
  const { page = 1, limit = 10 } = req.query;

  const features = new APIFeatures(Property.find({ reviewStatus: 'approved' }), req.query)
    .filter()
    .search(['title', 'address.city', 'address.fullAddress', 'address.state', 'propertyId'])
    .applyFilters()
    .sort()
    .limitFields()
    .paginate();

  const properties = await features.query;
  const totalCount = await Property.countDocuments();
  const totalPages = Math.ceil(totalCount / limit);

  res.status(200).json({
    status: 'success',
    results: properties.length,
    data: {
      properties,
      totalCount,
      hasMore: page < totalPages,
      page: Number(page),
      limit: Number(limit),
    },
  });
});

// Get Lastest Listings
export const getLastestPropertyListings = catchAsync(async (req, res, next) => {
  const properties = await Property.find({ reviewStatus: 'approved' })
    .sort({ createdAt: -1 })
    .limit(6);
  res.status(200).json({
    status: 'success',
    results: properties.length,
    data: { properties },
  });
});
// Get / View Filter Listings
export const getPropertyListingsFilter = catchAsync(async (req, res, next) => {
  const { reviewStatus } = req.query;

  if (reviewStatus && !['pending', 'approved', 'rejected'].includes(reviewStatus))
    return next(new AppError('Invalid status provided', 400));

  const features = new APIFeatures(Property.find(reviewStatus && { reviewStatus }), req.query)
    .filter()
    .paginate();

  const properties = await features.query;
  const totalCount = await Property.countDocuments();

  res.status(200).json({
    status: 'success',
    results: properties.length,
    data: {
      properties,
      totalCount,
      page: req.query.page * 1 || 1,
      limit: req.query.limit * 1 || 10,
    },
  });
});

// Update Review Status of Listing
export const updateListingReviewStatus = catchAsync(async (req, res, next) => {
  const { reviewStatus, rejectionReason } = req.body;
  const { id } = req.params;

  if (!['approved', 'rejected'].includes(reviewStatus))
    return next(new AppError('Invalid status. Status must be "approved" or "rejected"', 400));

  if (reviewStatus === 'rejected' && (!rejectionReason || rejectionReason.trim() === ''))
    return next(new AppError('Rejection Reason is required for rejected status', 400));

  const property = await Property.findById(id);
  if (!property) return next(new AppError('Property not found', 404));

  property.reviewStatus = reviewStatus;
  await property.save();

  const user = await User.findById(property.user);

  if (!user) return next(new AppError('User not found', 404));

  await new Email(user, '', rejectionReason, {}, '', property).sendListingReviewStatus();

  res.status(200).json({
    status: 'success',
    message: `Property Listing has been ${reviewStatus === 'approved' ? 'approved' : 'rejected'}`,
    data: { property },
  });
});

// Get Statistics of Listing
export const getPropertyListingStats = catchAsync(async (req, res, next) => {
  const statistics = await propertyStats();

  res.status(200).json({ status: 'success', data: { statistics: statistics[0] } });
});

export const getLoggedInRealtorListings = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id).populate(
    'property',
    'reviewStatus listingStatus views inquiries'
  );

  if (!user) return next(new AppError('User not found', 404));

  res.status(200).json({
    status: 'success',
    data: { properties: user.property },
  });
});

export const getRealtorListings = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id).populate({
    path: 'property',
    match: { reviewStatus: 'approved' },
    sort: { createdAt: -1 },
  });

  if (!user) return new AppError('User Not Found', 404);

  res.status(200).json({
    status: 'success',
    results: user.property.length,
    data: { properties: user.property },
  });
});

export const getFeaturedListings = catchAsync(async (req, res, next) => {
  const featuredListings = await Property.find({ variations: 'Featured' }).select(
    'images title createdAt yearBuilt features listingStatus variations _id price'
  );

  res
    .status(200)
    .json({ status: 'success', results: featuredListings.length, data: featuredListings });
});
