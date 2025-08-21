import { Router } from 'express';
import {
  addOrUpdatePropertyListing,
  deletePropertyListing,
  getFeaturedListings,
  getLastestPropertyListings,
  getLoggedInRealtorListings,
  getPropertyListings,
  getPropertyListingsFilter,
  getPropertyListingsInfinite,
  getPropertyListingStats,
  getRealtorListings,
  myPropertyListings,
  onePropertyListing,
  onePropertyListingBySlug,
  updateListingReviewStatus,
} from '../controller/propertyController.js';
import { upload } from '../utils/upload.js';
import { protect, restrictTo } from '../controller/authController.js';

const propertyRoute = Router();

propertyRoute.route('/all-listings').get(protect, restrictTo('admin'), getPropertyListings);
propertyRoute.route('/all-listings-infinite').get(getPropertyListingsInfinite);
propertyRoute.route('/lastest-listings').get(getLastestPropertyListings);
propertyRoute.route('/all-published-listings').get(getPropertyListingsFilter);
propertyRoute.route('/:id').patch(protect, restrictTo('admin'), updateListingReviewStatus);
propertyRoute.route('/listing-stats').get(protect, restrictTo('admin'), getPropertyListingStats);
propertyRoute.route('/populate-my-listings').get(protect, getLoggedInRealtorListings);
propertyRoute.route('/populate-my-listings/:id').get(getRealtorListings);
propertyRoute
  .route('/my-listings')
  .get(protect, restrictTo('admin', 'realtor'), myPropertyListings);
propertyRoute.route('/featured').get(getFeaturedListings);

propertyRoute
  .route('/add-property/:propertyId?')
  .post(
    protect,
    restrictTo('admin', 'realtor'),
    upload.fields([
      { name: 'images', maxCount: 15 },
      { name: 'videoFile', maxCount: 1 },
    ]),
    addOrUpdatePropertyListing
  )
  .patch(
    protect,
    restrictTo('admin', 'realtor'),
    upload.fields([
      { name: 'images', maxCount: 15 },
      { name: 'videoFile', maxCount: 1 },
    ]),
    addOrUpdatePropertyListing
  );

propertyRoute
  .route('/:id')
  .get(onePropertyListing)
  .delete(protect, restrictTo('admin', 'realtor'), deletePropertyListing);

propertyRoute.route('/slug/:slug').get(onePropertyListingBySlug);
export default propertyRoute;
