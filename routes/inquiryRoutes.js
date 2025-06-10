import { Router } from 'express';
import {
  getInquiries,
  getInquiriesForRealtor,
  sendInquiryMessage,
} from '../controller/inquiryController.js';
import { protect, restrictTo } from '../controller/authController.js';

const router = Router();

router.route('/send-inquiry').post(sendInquiryMessage);
router.route('/realtor-inquiry-list').get(protect, getInquiriesForRealtor);
router.route('/inquiries').get(protect, restrictTo('admin'), getInquiries);

export default router;
