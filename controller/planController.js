import flw from '../configuration/flutterwaveConfig.js';
import Plan from '../model/planModel.js';
import AppError from '../utils/appError.js';
import catchAsync from '../utils/catchAsync.js';

export const createPlan = catchAsync(async (req, res, next) => {
  const { name, amount, interval, features } = req.body;

  const payload = { amount, name, interval };

  const response = await flw.PaymentPlan.create(payload);

  if (response.status !== 'success')
    return next(new AppError('Payment Plan could not be created', 400));

  const existingPlan = await Plan.findOne({
    name: response.data.name,
    interval: response.data.interval,
  });

  if (existingPlan)
    return next(
      new AppError(`Plan already exists: ${existingPlan.name} (${existingPlan.interval})`)
    );

  const plan = await Plan.create({
    name,
    interval,
    amount,
    flutterwavePlanId: response.data.id,
    planToken: response.data.plan_token,
    features,
  });

  return res.status(201).json({ status: 'success', data: plan });
});

export const getPlans = catchAsync(async (req, res, next) => {
  const plans = await Plan.find();

  return res.status(200).json({ status: 'success', results: plans?.length, data: plans });
});
