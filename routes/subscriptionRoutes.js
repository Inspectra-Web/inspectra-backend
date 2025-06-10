import { Router } from 'express';
import {
  cancelSubscription,
  flutterwaveWebhook,
  getAllSubscriptions,
  getSubscriptionHistoryByUser,
  initiateSubscription,
  renewSubscription,
  verifySubscription,
} from '../controller/subscriptionController.js';
import { protect, restrictTo } from '../controller/authController.js';

const router = Router();

router.route('/initiate').post(initiateSubscription);
router.route('/renew').post(renewSubscription);
router.route('/verify').get(protect, verifySubscription);
router.route('/flutterwave/webhook').post(flutterwaveWebhook);
router.route('/history').get(protect, getSubscriptionHistoryByUser);
router.route('/cancel/:id').patch(cancelSubscription);
router.route('/admin/all').get(protect, restrictTo('admin'), getAllSubscriptions);

export default router;
