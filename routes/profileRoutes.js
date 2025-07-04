import { Router } from 'express';
import {
  getRealtorStats,
  manageVerificationDoc,
  readProfile,
  updateProfile,
  uploadVerificationDocs,
} from '../controller/profileController.js';
import { protect, restrictTo } from '../controller/authController.js';
import { upload } from '../utils/upload.js';

const profileRoute = Router();

profileRoute.route('/realtor-stats').get(protect, restrictTo('admin'), getRealtorStats);

profileRoute
  .route('/:id')
  .get(readProfile)
  .patch(protect, restrictTo('admin', 'realtor', 'client'), upload.single('avatar'), updateProfile);

profileRoute
  .route('/upload/:id')
  .patch(
    protect,
    restrictTo('admin', 'realtor'),
    upload.single('document'),
    uploadVerificationDocs
  );

profileRoute.route('/manage-doc/:docId').patch(protect, restrictTo('admin'), manageVerificationDoc);

export default profileRoute;
