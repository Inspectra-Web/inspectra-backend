import axios from 'axios';
import flw from '../configuration/flutterwaveConfig.js';
import Plan from '../model/planModel.js';
import AppError from '../utils/appError.js';
import catchAsync from '../utils/catchAsync.js';
import { envConfig } from '../configuration/environmentConfig.js';
import Subscription from '../model/subscriptionModel.js';
import User from '../model/userModel.js';
import { APIFeatures } from '../utils/apiFeatures.js';
import { Email } from '../utils/email.js';

// Initiate a subscription
export const initiateSubscription = catchAsync(async (req, res, next) => {
  const { planId, email, fullname } = req.body;

  const plan = await Plan.findById(planId);

  if (!plan) return next(new AppError('Plan not found', 404));

  const payload = {
    tx_ref: `INSPECTRA_subs_${Date.now()}`,
    amount: plan.amount,
    currency: 'NGN',
    payment_options: 'card,transfer,ussd',
    redirect_url: `${envConfig.CLIENT_URL}/app/subscription-history`,
    payment_plan: plan.flutterwavePlanId,
    customer: { email, name: fullname },
    customizations: {
      title: `Inspectra ${plan.name} Plan Subscription`,
      description: `${plan.interval} subscription to Inspectra`,
      logo: 'https://res.cloudinary.com/dpvelfbzm/image/upload/v1748566398/jkj5pgvmdwquylegpvmd.png',
    },
    meta: { planId: plan._id.toString(), userEmail: email },
  };

  const fwResponse = await axios.post('https://api.flutterwave.com/v3/payments', payload, {
    headers: {
      Authorization: `Bearer ${envConfig.FLUTTERWAVE_LIVE_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
  });

  return res
    .status(200)
    .json({ status: 'success', data: { paymentLink: fwResponse?.data?.data?.link } });
});

// Renew Subscription
export const renewSubscription = catchAsync(async (req, res, next) => {
  const { planId } = req.body;

  const plan = await Plan.findById(planId);
  if (!plan) return next(new AppError('Plan not found', 404));

  const user = await User.findById(req.user._id);
  if (!user) return next(new AppError('User not found', 404));

  // Expire any current active subscriptions
  await Subscription.updateMany(
    { user: user._id, subscriptionStatus: 'active' },
    { $set: { subscriptionStatus: 'expired' } }
  );

  const txRef = `INSPECTRA_RENEW_${Date.now()}`;

  const payload = {
    tx_ref: txRef,
    amount: plan.amount,
    currency: 'NGN',
    payment_options: 'card, banktransfer, ussd, account',
    redirect_url: `${envConfig.CLIENT_URL}/app/subscription-history`,
    payment_plan: plan.flutterwavePlanId,
    customer: {
      email: user.email,
      name: `${user.firstName} ${user.lastName}`,
    },
    customizations: {
      title: `Inspectra ${plan.name} Plan Renewal`,
      description: `${plan.interval} renewal for Inspectra`,
      logo: 'https://res.cloudinary.com/dpvelfbzm/image/upload/v1748566398/jkj5pgvmdwquylegpvmd.png',
    },
    meta: {
      planId: plan._id.toString(),
      userEmail: user.email,
    },
  };

  const fwResponse = await axios.post('https://api.flutterwave.com/v3/payments', payload, {
    headers: {
      Authorization: `Bearer ${envConfig.FLUTTERWAVE_LIVE_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
  });

  return res.status(200).json({
    status: 'success',
    message: 'Redirect user to payment gateway to complete renewal.',
    data: { paymentLink: fwResponse?.data?.data?.link },
  });
});

// Verify a subscription
export const verifySubscription = catchAsync(async (req, res, next) => {
  const { status, transaction_id, tx_ref } = req.query;

  if (status === 'successful') {
    if (!transaction_id || !tx_ref)
      return next(new AppError('Transaction ID and Reference is required', 400));

    const response = await flw.Transaction.verify({ id: transaction_id });

    const data = response.data;

    console.log(data);

    const planId = data.meta?.planId;
    const email = data.meta?.userEmail || data.customer?.email;

    const plan = await Plan.findById(planId);
    if (!plan) return next(new AppError('Invalid plan in metadata', 400));

    const user = await User.findOne({ email });
    if (!user) return next(new AppError('User not found', 404));

    await Subscription.updateMany(
      { user: user._id, plan: plan._id, subscriptionStatus: 'active' },
      { $set: { subscriptionStatus: 'expired' } }
    );

    const startDate = new Date();
    const endDate = new Date();

    if (plan.interval === 'monthly') endDate.setMonth(endDate.getMonth() + 1);
    else endDate.setFullYear(endDate.getFullYear() + 1);

    const subscription = await Subscription.create({
      user: user._id,
      userEmail: email,
      plan: plan._id,
      planName: plan.name,
      amount: data.amount,
      interval: plan.interval,
      paymentStatus: 'successful',
      subscriptionStatus: 'active',
      paymentType: data.payment_type,
      txRef: data.tx_ref,
      flutterwaveTransactionId: data.id,
      paymentPlanId: data.plan,
      subscriptionStartDate: startDate,
      subscriptionEndDate: endDate,
    });

    user.plan = plan.name;
    user.planPaidType = plan.interval;
    user.planActivatedAt = startDate;
    user.planExpiresAt = endDate;

    await user.save({ validateBeforeSave: true });

    return res.status(201).json({
      status: 'success',
      message: 'Subscription verified and saved',
      data: subscription,
    });
  } else {
    return next(new AppError('Payment not successful', 400));
  }
});

// Flutterwave Webhook
export const flutterwaveWebhook = catchAsync(async (req, res, next) => {
  const secretHash = envConfig.FLUTTERWAVE_LIVE_SECRET_KEY;

  const signature = req.headers['verif-hash'];

  if (!signature || signature !== secretHash)
    return next(new AppError('Unauthorized webhook', 401));

  const payload = req.body;

  if (payload?.event === 'charge.completed' && payload.data.status === 'successful') {
    const data = payload.data;
    const planId = payload.meta_data?.planId;
    const email = payload.meta_data?.userEmail || data.customer?.email;
    const plan = await Plan.findById(planId);
    const user = await User.findOne({ email });

    if (!plan || !user)
      return res.status(200).json({ message: 'User or Plan not found - webhook received' });

    await Subscription.updateMany(
      { user: user._id, subscriptionStatus: 'active' },
      { $set: { subscriptionStatus: 'expired' } }
    );

    const startDate = new Date();
    const endDate = new Date();

    if (plan.interval === 'monthly') endDate.setMonth(endDate.getMonth() + 1);
    else endDate.setFullYear(endDate.getFullYear() + 1);

    const subscription = await Subscription.create({
      user: user._id,
      userEmail: email,
      plan: plan._id,
      planName: plan.name,
      amount: data.amount,
      interval: plan.interval,
      paymentStatus: 'successful',
      subscriptionStatus: 'active',
      paymentType: data.payment_type,
      txRef: data.tx_ref,
      flutterwaveTransactionId: data.id,
      paymentPlanId: plan.flutterwavePlanId,
      subscriptionStartDate: startDate,
      subscriptionEndDate: endDate,
    });

    user.plan = plan.name;
    user.planPaidType = plan.interval;
    user.planActivatedAt = startDate;
    user.planExpiresAt = endDate;

    await user.save({ validateBeforeSave: true });

    console.log(subscription);

    return res.status(200).json({ message: 'Subscription saved' });
  } else {
    return res.status(200).json({ message: 'Ignored event' });
  }
});

// Cancel a subscription
export const cancelSubscription = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const subscription = await Subscription.findOne({ _id: id, user: req.user._id });

  if (!subscription) return next(new AppError('Subscription not found', 404));

  subscription.subscriptionStatus = 'cancelled';
  subscription.subscriptionEndDate = new Date();
  await subscription.save();

  res.status(200).json({
    status: 'success',
    message: 'Subscription cancelled successfully',
    data: subscription,
  });
});

// Get Subscription History by user
export const getSubscriptionHistoryByUser = catchAsync(async (req, res, next) => {
  const features = new APIFeatures(Subscription.find({ user: req.user._id }), req.query)
    .sort()
    .search(['userEmail', 'planName', 'interval', 'paymentStatus', 'txRef', 'paymentType'])
    .limitFields()
    .paginate();

  const subscriptions = await features.query;
  const totalCount = await Subscription.countDocuments();

  res.status(200).json({
    status: 'success',
    results: subscriptions.length,
    data: { subscriptions, totalCount, page: req.query.page || 1, limit: req.query.limit || 10 },
  });
});

// Get All Subscriptions
export const getAllSubscriptions = catchAsync(async (req, res, next) => {
  const features = new APIFeatures(Subscription.find(), req.query)
    .sort()
    .search(['userEmail', 'planName', 'interval', 'paymentStatus', 'txRef', 'paymentType'])
    .limitFields()
    .paginate();

  const subscriptions = await features.query;
  const totalCount = await Subscription.countDocuments();

  res.status(200).json({
    status: 'success',
    results: subscriptions.length,
    data: { subscriptions, totalCount, page: req.query.page || 1, limit: req.query.limit || 10 },
  });
});

// Expire Subscription
export const expireOldSubscriptions = catchAsync(async (req, res, next) => {
  const now = new Date();
  const expiredSubscriptions = await Subscription.find({
    subscriptionStatus: 'active',
    subscriptionEndDate: { $lt: now },
  });
  let modifiedCount = 0;
  for (const sub of expiredSubscriptions) {
    sub.subscriptionStatus = 'expired';
    await sub.save();

    const activeSubs = await Subscription.findOne({ user: sub.user, subscriptionStatus: 'active' });

    if (!activeSubs) {
      const subUser = await User.findByIdAndUpdate(
        sub.user,
        {
          plan: 'Starter',
          planPaidType: 'monthly',
          planActivatedAt: undefined,
          planExpiresAt: undefined,
        },
        { new: true }
      );

      // Send email here
      if (subUser) {
        await new Email(subUser, '', '', {}, '', {}, {}).sendSubscriptionExpiredNotification();
        modifiedCount++;
      }
    }
  }
  console.log(`✅ Subscriptions expired and downgraded: ${modifiedCount}`);
});

// Expire User plans
export const expireUserPlans = catchAsync(async (req, res, next) => {
  const now = new Date();
  const result = await User.updateMany(
    { plan: { $ne: 'Starter' }, planExpiresAt: { $lt: now } },
    {
      $set: {
        plan: 'Starter',
        planPaidType: 'monthly',
        planActivatedAt: null,
        planExpiresAt: null,
      },
    }
  );

  console.log(`✅ User plans downgraded to Starter: ${result.modifiedCount}`);
});
