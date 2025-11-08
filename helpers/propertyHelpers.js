import Inquiry from '../model/inquiryModel.js';
import Property from '../model/propertyModel.js';
import Schedule from '../model/scheduleModel.js';
import AppError from '../utils/appError.js';
const validateCategoryTypes = {
  residential: [
    'apartment',
    'duplex',
    'townhouse',
    'villa',
    'bungalow',
    'single-family-home',
    'multi-family-home',
    'penthouse',
    'serviced-apartment',
    'condominium',
    'mansion',
    'self-contained',
    'flat',
    'maisonette',
  ],
  commercial: [
    'studio',
    'office',
    'warehouse',
    'restaurant',
    'hotel',
    'serviced-apartment',
    'resort',
  ],
  industrial: ['factory', 'warehouse', 'farm'],
  land: ['land'],
  agricultural: ['farm', 'land'],
  hospitality: ['hotel', 'resort', 'restaurant'],
  mixedUse: ['office', 'apartment', 'warehouse', 'studio', 'land', 'serviced-apartment'],
  institutional: ['hospital', 'school'],
  recreational: ['resort', 'hotel', 'campground'],
  other: ['other'],
};

export const validatePropertyCategoryAndType = (category, type) => {
  if (!validateCategoryTypes[category]) throw new AppError('Invalid property category', 400);

  if (!validateCategoryTypes[category].includes(type))
    throw new AppError(`The property type "${type}" is not valid for category "${category}"`, 400);
};

export const propertyStats = () => {
  return Property.aggregate([
    {
      $facet: {
        totalListings: [{ $count: 'count' }],
        approvedListings: [{ $match: { reviewStatus: 'approved' } }, { $count: 'count' }],
        pendingListings: [{ $match: { reviewStatus: 'pending' } }, { $count: 'count' }],
        rejectedListings: [{ $match: { reviewStatus: 'rejected' } }, { $count: 'count' }],
        saleListings: [{ $match: { listingStatus: 'sale' } }, { $count: 'count' }],
        rentListings: [{ $match: { listingStatus: 'rent' } }, { $count: 'count' }],
        leaseListings: [{ $match: { listingStatus: 'lease' } }, { $count: 'count' }],
        shortletListings: [{ $match: { listingStatus: 'shortlet' } }, { $count: 'count' }],
        totalViews: [{ $group: { _id: null, total: { $sum: '$views' } } }],
        totalInquiries: [{ $group: { _id: null, total: { $sum: '$inquiries' } } }],
      },
    },
    {
      $project: {
        totalListings: { $arrayElemAt: ['$totalListings.count', 0] },
        approvedListings: { $arrayElemAt: ['$approvedListings.count', 0] },
        pendingListings: { $arrayElemAt: ['$pendingListings.count', 0] },
        rejectedListings: { $arrayElemAt: ['$rejectedListings.count', 0] },
        saleListings: { $arrayElemAt: ['$saleListings.count', 0] },
        rentListings: { $arrayElemAt: ['$rentListings.count', 0] },
        leaseListings: { $arrayElemAt: ['$leaseListings.count', 0] },
        shortletListings: { $arrayElemAt: ['$shortletListings.count', 0] },
        totalViews: { $arrayElemAt: ['$totalViews.total', 0] },
        totalInquiries: { $arrayElemAt: ['$totalInquiries.total', 0] },
      },
    },
  ]);
};

export const inquiryStats = () => {
  return Inquiry.aggregate([
    {
      $group: {
        _id: null,
        totalInquiries: { $sum: 1 },
        uniqueClients: { $addToSet: '$clientEmail' },
        uniqueProperties: { $addToSet: '$property' },
        latestInquiry: { $max: '$createdAt' },
      },
    },
    {
      $project: {
        _id: 0,
        totalInquiries: 1,
        totalUniqueClients: { $size: '$uniqueClients' },
        totalUniqueProperties: { $size: '$uniqueProperties' },
        latestInquiry: 1,
      },
    },
  ]);
};

export const scheduleStats = () => {
  return Schedule.aggregate([
    {
      $group: {
        _id: null,
        totalSchedules: { $sum: 1 },
        uniqueClients: { $addToSet: '$clientEmail' },
        uniqueProperties: { $addToSet: '$property' },
        uniqueRealtors: { $addToSet: '$realtor' },
        latestScheduleDate: { $max: '$scheduleDate' },
        statusCounts: {
          $push: '$status',
        },
      },
    },
    {
      $project: {
        _id: 0,
        totalSchedules: 1,
        totalUniqueClients: { $size: '$uniqueClients' },
        totalUniqueProperties: { $size: '$uniqueProperties' },
        totalUniqueRealtors: { $size: '$uniqueRealtors' },
        latestScheduleDate: 1,
        statusBreakdown: {
          pending: {
            $size: {
              $filter: { input: '$statusCounts', as: 's', cond: { $eq: ['$$s', 'pending'] } },
            },
          },
          accepted: {
            $size: {
              $filter: { input: '$statusCounts', as: 's', cond: { $eq: ['$$s', 'accepted'] } },
            },
          },
          rescheduled: {
            $size: {
              $filter: { input: '$statusCounts', as: 's', cond: { $eq: ['$$s', 'rescheduled'] } },
            },
          },
          rejected: {
            $size: {
              $filter: { input: '$statusCounts', as: 's', cond: { $eq: ['$$s', 'rejected'] } },
            },
          },
          completed: {
            $size: {
              $filter: { input: '$statusCounts', as: 's', cond: { $eq: ['$$s', 'completed'] } },
            },
          },
        },
      },
    },
  ]);
};
