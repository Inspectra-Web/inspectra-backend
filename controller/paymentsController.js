import { envConfig } from '../configuration/environmentConfig.js';
import Plan from '../model/planModel.js';
import Property from '../model/propertyModel.js';
import Schedule from '../model/scheduleModel.js';
import Subscription from '../model/subscriptionModel.js';
import User from '../model/userModel.js';
import catchAsync from '../utils/catchAsync.js';
import { Email } from '../utils/email.js';

// Flutterwave Webhook
export const flutterwaveWebhook = catchAsync(async (req, res, next) => {
  const secretHash = envConfig.FLUTTERWAVE_LIVE_SECRET_KEY;

  const signature = req.headers['verif-hash'];

  if (!signature || signature !== secretHash)
    return next(new AppError('Unauthorized webhook', 401));

  const payload = req.body;

  if (payload?.event !== 'charge.completed' || payload.data.status !== 'successful')
    return res.status(200).json({ message: 'Ignored event' });
  const data = payload.data;
  const meta = payload.meta_data || data.meta || {};
  const email = meta?.userEmail || data.customer?.email;

  if (meta.type === 'subscription') {
    const planId = meta?.planId;
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

    return res.status(200).json({ message: 'Subscription saved' });
  } else if (meta.type === 'inspection') {
    const scheduleId = meta.scheduleId;
    const schedule = await Schedule.findById(scheduleId);
    if (!schedule) return res.status(200).json({ message: 'Schedule not found' });

    schedule.isPaid = true;
    schedule.paymentStatus = 'successful';
    schedule.txRef = data.tx_ref;
    schedule.flutterwaveTransactionId = data.id;

    await schedule.save();

    const propertyExists = await Property.findById(schedule.property);

    const realtor = await User.findById(schedule.realtor);

    if (realtor) {
      await new Email(
        realtor,
        `${envConfig.CLIENT_URL}/app/manage-property/${propertyExists?._id}`,
        schedule.message,
        {},
        '',
        { title: propertyExists?.title },
        {
          clientName: schedule.clientName,
          clientEmail: schedule.clientEmail,
          scheduleDate: schedule.scheduleDate,
        }
      ).sendInspectionNotification();
    }
    return res.status(200).json({ message: 'Inspection Payment Saved' });
  }

  return res.status(200).json({ message: 'Unhandled payment type' });
});
