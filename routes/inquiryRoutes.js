import { Router } from 'express';
import {
  getInquiries,
  getInquiriesForClient,
  getInquiriesForRealtor,
  sendInquiryMessage,
} from '../controller/inquiryController.js';
import { protect, restrictTo } from '../controller/authController.js';

const router = Router();

router.route('/send-inquiry').post(protect, sendInquiryMessage);
router.route('/realtor-inquiry-list').get(protect, getInquiriesForRealtor);
router.route('/client-inquiry-list').get(protect, getInquiriesForClient);
router.route('/inquiries').get(protect, restrictTo('admin'), getInquiries);

export default router;
