import User from '../model/userModel.js';
import catchAsync from '../utils/catchAsync.js';
import crypto, { createHash } from 'crypto';
import { Email } from '../utils/email.js';
import { findAndValidateUser, signToken, verifyToken } from '../helpers/authHelpers.js';
import AppError from '../utils/appError.js';
import { envConfig } from '../configuration/environmentConfig.js';
import Profile from '../model/profileModel.js';
import GuestUser from '../model/guestUserModel.js';
import Subscription from '../model/subscriptionModel.js';
import Plan from '../model/planModel.js';

export const createSendToken = (user, statusCode, res) => {
  const token = signToken({ id: user._id }, 'session');
  const cookieOptions = {
    expires: new Date(Date.now() + envConfig.COOKIE_EXPIRES * 24 * 60 * 60 * 1000),
    httpOnly: true,
  };

  if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;

  res.cookie('jwt', token, cookieOptions);

  user.password = undefined;

  res.status(statusCode).json({ status: 'success', token, data: { user } });
};

// ${req.protocol}://${req.get('host')}

const generateReferralCode = (name, userId) =>
  `${name.toLowerCase()}${userId.toString().slice(-4)}`;

// Account Registeration
export const signup = catchAsync(async (req, res, next) => {
  const { fullname, email, password, passwordConfirm, role, referralCode } = req.body;
  const otp = crypto.randomBytes(2).toString('hex');

  let referredByUser = null;

  if (referralCode) {
    referredByUser = await User.findOne({ referralCode });
    if (!referredByUser) return next(new AppError('Invalid referral code', 400));
  }

  const expires = new Date();
  expires.setMonth(expires.getMonth() + 1);

  const newUser = await User.create({
    fullname,
    email,
    password,
    passwordConfirm,
    role,
    otp,
    referredBy: referredByUser?._id || undefined,
    plan: 'Starter',
    planActivatedAt: new Date(),
    planExpiresAt: expires,
    planPaidType: 'monthly',
  });

  const starterPlan = await Plan.findOne({ name: 'Starter', interval: 'monthly' });
  if (!starterPlan) return next(new AppError('Starter plan not found', 500));

  const existingSubscription = await Subscription.findOne({ user: newUser._id });
  if (!existingSubscription) {
    // Create a free trial subscription
    await Subscription.create({
      user: newUser._id,
      plan: starterPlan._id,
      planName: starterPlan.name,
      interval: starterPlan.interval,
      amount: 0,
      userEmail: newUser.email,
      paymentStatus: 'successful',
      subscriptionStatus: 'active',
      paymentType: 'trial',
      subscriptionStartDate: newUser.planActivatedAt,
      subscriptionEndDate: newUser.planExpiresAt,
    });
  }
  const userReferralCode = generateReferralCode(newUser.fullname.trim().split(' ')[0], newUser._id);
  await User.findByIdAndUpdate(newUser._id, { referralCode: userReferralCode });

  const name = newUser.fullname.split(' ');
  const [firstname, middlename = '', lastname = ''] = name;

  const profile = await Profile.create({
    user: newUser._id,
    firstname,
    middlename,
    lastname,
    email: newUser.email,
    role: newUser.role,
  });

  await User.findByIdAndUpdate(newUser._id, { profile: profile._id });

  if (referredByUser) {
    referredByUser.referrals.push(newUser._id);
    referredByUser.totalReferrals += 1;
    await referredByUser.save({ validateBeforeSave: false });
  }

  const otpUrl = `${envConfig.CLIENT_URL}/verify-otp/${signToken({ otp, id: newUser._id }, 'otp')}`;

  await new Email(newUser, otpUrl).sendWelcome();
  await new Email(newUser, '', role.toUpperCase(), {}, envConfig.EMAIL_FROM).sendAdminNewUser();

  return res.status(201).json({
    status: 'success',
    message: 'Account created! Please check your email to verify and log in.',
    data: { newUser },
  });
});

// OTP Verification
export const otpVerification = catchAsync(async (req, res, next) => {
  const { otpToken } = req.params;
  const { otp } = req.body;
  const { otp: OTP, id: userId } = await verifyToken(otpToken, 'otp');

  if (otp !== OTP) return next(new AppError('Invalid OTP. Please try again.', 400));

  const user = await User.findById(userId);

  if (!user) return next(new AppError('User not found.', 404));

  if (user.emailVerified) return next(new AppError('User is already verified', 404));

  const url = `${envConfig.CLIENT_URL}/verify/${signToken({
    id: user.id,
  })}`;

  await new Email(user, url).sendVerify();

  user.otp = undefined;
  await user.save();

  return res.status(200).json({
    status: 'success',
    message: 'OTP verified successfully! A verification email has been sent.',
  });
});

// Account Verification
export const emailVerification = catchAsync(async (req, res, next) => {
  const { token } = req.params;
  const userId = await verifyToken(token);
  const user = await findAndValidateUser({ userId });

  user.emailVerified = true;
  await user.save();

  if (user?.role === 'admin')
    await Profile.findByIdAndUpdate(userId, { verified: true }, { new: true });

  res
    .status(200)
    .json({ status: 'success', message: 'Email verified successfully! You can now log in.' });
});

// Account Login
export const login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) return next(new AppError('Please provide email and password!', 400));

  const user = await User.findOne({ email }).select('+password');

  if (!user) return next(new AppError('User not found', 404));

  if (!user.emailVerified)
    return next(new AppError('Please verify your email before logging in', 400));

  if (!(await user.correctPassword(password)))
    return next(new AppError('Incorrect Password!', 401));

  const profile = await Profile.findOne({ user: user?._id });

  if (profile.deactivated)
    return next(
      new AppError(
        'Sorry! This account was deactivated. Kindly confirm the reason by reaching out to the inspectra team. THANK YOU.'
      )
    );

  createSendToken(user, 200, res);
});

// Protect Account
export const protect = catchAsync(async (req, res, next) => {
  const { authorization } = req.headers;
  let token;
  if (authorization && authorization.startsWith('Bearer')) token = authorization.split(' ')[1];
  else if (req.cookies.jwt) token = req.cookies.jwt;

  if (!token) return next(new AppError('You are not logged in! Please login to get access', 401));

  const userId = await verifyToken(token);

  const currentUser = await User.findById(userId);

  if (!currentUser)
    return next(new AppError('The user belonging to this token does no longer exist', 401));

  req.user = currentUser;
  // req.locals.user = currentUser;
  next();
});

// Account Logout
export const logout = (req, res) => {
  res.cookie('jwt', '', { expires: new Date(0), httpOnly: true });
  res.status(200).json({ status: 'success', message: 'Logged out successfully.' });
};

// Forgot Account Password
export const forgotPassword = catchAsync(async (req, res, next) => {
  const user = await User.findOne({ email: req.body.email });
  if (!user) return next(new AppError('There is no user with that email address.', 404));

  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  try {
    const resetURL = `${envConfig.CLIENT_URL}/reset-password/${resetToken}`;
    await new Email(user, resetURL).sendPasswordReset();
    res.status(200).json({ status: 'success', message: 'Password Reset Token sent to email!' });
  } catch (error) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(new AppError('There was an error sending the email. Try again later!', 500));
  }
});

// Reset Account Password
export const resetPassword = catchAsync(async (req, res, next) => {
  const { password, passwordConfirm } = req.body;
  const hashToken = createHash('sha256').update(req.params.token).digest('hex');
  const user = await User.findOne({
    passwordResetToken: hashToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  if (!user) return next(new AppError('Token is invalid or has expired', 400));

  user.password = password;
  user.passwordConfirm = passwordConfirm;
  user.passwordResetExpires = undefined;
  user.passwordResetToken = undefined;
  await user.save();

  return res.status(200).json({ message: 'Reset password successfully' });
});

export const deactivateAccount = catchAsync(async (req, res, next) => {
  const deactivatedUser = await Profile.findById(req.params.id);

  if (!deactivatedUser) return next(new AppError('User not found', 404));

  const user = await User.findOne({ profile: deactivatedUser._id });

  if (user?.role === 'admin')
    return next(new AppError("You are can't deactivate your account as an ADMIN", 400));

  if (deactivatedUser.deactivated)
    return next(new AppError('Account is already deactivated.', 400));

  deactivatedUser.deactivated = true;
  deactivatedUser.deactivatedBy = req.user.id;

  await deactivatedUser.save();

  await new Email(user, '', req.body.deactivationReason).sendDeactivationNotice();

  await new Email(
    user,
    '',
    req.body.deactivationReason,
    {},
    envConfig.EMAIL_FROM
  ).sendAdminDeactivationNotice();

  return res
    .status(200)
    .json({ status: 'success', message: 'Account has been deactivated successfully.' });
});

export const activateAccount = catchAsync(async (req, res, next) => {
  const activatedUser = await Profile.findById(req.params.id);

  if (!activatedUser) return next(new AppError('User not found', 404));

  const user = await User.findOne({ profile: activatedUser._id });

  if (!activatedUser.deactivated) return next(new AppError('Account is already activated.', 400));

  activatedUser.deactivated = false;
  activatedUser.deactivatedBy = req.user._id;

  await activatedUser.save();

  await new Email(user).sendActivationNotice();

  return res
    .status(200)
    .json({ status: 'success', message: 'Account has been activated successfully.' });
});

// Restrictions
export function restrictTo(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role))
      return next(new AppError('You do not have permission to perform this action', 403));
    next();
  };
}

// Authenticate Guest User Token
export const authenticateGuestUser = catchAsync(async (req, res, next) => {
  const { token } = req.params;

  if (!token) return next(new AppError('Access token is required', 400));

  const guestUser = await GuestUser.findOne({ chatAccessToken: token });

  if (!guestUser) return next(new AppError('Invalid chat access token.', 401));

  req.user = guestUser;

  next();
});
