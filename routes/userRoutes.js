import { Router } from 'express';
import {
  otpVerification,
  signup,
  emailVerification,
  login,
  protect,
  logout,
  forgotPassword,
  resetPassword,
  restrictTo,
  deactivateAccount,
  activateAccount,
  authenticateGuestUser,
} from '../controller/authController.js';
import { getAllRealtors, getMe, getUser } from '../controller/userController.js';

const router = Router();

router.post('/signup', signup);
router.post('/verify-otp/:otpToken', otpVerification);
router.get('/verify/:token', emailVerification);
router.post('/login', login);
router.get('/logout', logout);
router.post('/forgot-password', forgotPassword);
router.patch('/reset-password/:token', resetPassword);
router.get('/authenticate-guest-user/:token', authenticateGuestUser);

router.use(protect);

router.get('/me', getMe, getUser);

router.route('/account-deactivation/:id').patch(deactivateAccount);
router.route('/account-activation/:id').patch(activateAccount);

router.use(restrictTo('admin'));

router.route('/realtors').get(getAllRealtors);
export default router;
