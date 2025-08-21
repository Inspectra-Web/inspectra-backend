import axios from 'axios';
import { envConfig } from '../configuration/environmentConfig.js';
import Property from '../model/propertyModel.js';
import Schedule from '../model/scheduleModel.js';
import { APIFeatures } from '../utils/apiFeatures.js';
import AppError from '../utils/appError.js';
import catchAsync from '../utils/catchAsync.js';
import { Email } from '../utils/email.js';

const calculateInspectionPayment = (fee, commissionPercent = 10) => {
  const platformCommission = Math.round((commissionPercent / 100) * fee);
  const totalPaid = fee + platformCommission;
  return { inspectionFee: fee, platformCommission, totalPaid };
};

export const sendInspectionSchedule = catchAsync(async (req, res, next) => {
  const { property, message, scheduleDate, payNow } = req.body;

  const user = req.user;
  if (!user || !user.email) return next(new AppError('Unauthorized', 401));

  const propertyExists = await Property.findById(property).populate('user');
  if (!propertyExists) return next(new AppError('Property Not Found', 404));

  const existingInspection = await Schedule.findOne({ client: user?._id, property });
  if (existingInspection)
    return next(new AppError("You've already scheduled an inspection for this property", 400));

  const realtor = propertyExists.user;
  if (!realtor) return next(new AppError('Realtor not found for this property.', 404));
  try {
    await new Email(
      realtor,
      `${envConfig.CLIENT_URL}/app/manage-property/${propertyExists?._id}`,
      message,
      {},
      '',
      { title: propertyExists?.title },
      {
        clientName: user?.fullname,
        clientEmail: user?.email,
        scheduleDate,
      }
    ).sendInspectionNotification();
  } catch (error) {
    return next(
      new AppError('A Problem occured while scheduling inspection. Please try again!', 500)
    );
  }

  const inspectionFee = propertyExists.inspectionCost || 0;
  const { platformCommission, totalPaid } = calculateInspectionPayment(inspectionFee);

  const tx_ref = `INSPECTRA_insp_${Date.now()}`;

  const schedule = await Schedule.create({
    txRef: tx_ref,
    property,
    client: user?._id,
    realtor: realtor?._id,
    clientName: user.fullname,
    clientEmail: user.email,
    message,
    scheduleDate,
    inspectionFee,
    platformCommission: payNow ? platformCommission : 0,
    totalPaid: payNow ? totalPaid : 0,
    isPaid: false, // updated after successful payment webhook
  });

  propertyExists.schedules += 1;
  await propertyExists.save();

  if (payNow && inspectionFee > 0) {
    const payload = {
      tx_ref,
      amount: totalPaid,
      currency: 'NGN',
      payment_options: 'card,transfer,ussd',
      redirect_url: `${envConfig.CLIENT_URL}/client/schedules`,
      customer: { email: user.email, name: user.fullname },
      customizations: {
        title: `Inspectra Inspection Payment`,
        description: `Payment to Realtor for Inspection Schedule`,
        logo: 'https://res.cloudinary.com/dpvelfbzm/image/upload/v1748566398/jkj5pgvmdwquylegpvmd.png',
      },
      meta: { scheduleId: schedule._id.toString(), type: 'inspection' },
    };

    const fwResponse = await axios.post('https://api.flutterwave.com/v3/payments', payload, {
      headers: {
        Authorization: `Bearer ${envConfig.FLUTTERWAVE_LIVE_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    return res.status(201).json({
      status: 'success',
      data: {
        message: 'Inspection Scheduled. Awaiting payment.',
        schedule,
        paymentLink: fwResponse?.data?.data?.link,
      },
    });
  }
  res.status(201).json({
    status: 'success',
    data: {
      message: 'Inspection scheduled successfully. No payment required at this time.',
      schedule,
    },
  });
});

export const getInspectionSchedulesForRealtor = catchAsync(async (req, res, next) => {
  const features = new APIFeatures(
    Schedule.find({ realtor: req.user._id })
      .populate('property', 'title location images')
      .populate('client', 'fullname email')
      .sort({ createdAt: -1 }),
    req.query
  )
    .sort()
    .search(['clientName', 'clientEmail'])
    .limitFields()
    .paginate();

  const schedules = await features.query;
  const totalCount = await Schedule.countDocuments();

  res.status(200).json({
    status: 'success',
    results: schedules.length,
    data: { schedules, totalCount, page: req.query.page || 1, limit: req.query.limit || 10 },
  });
});

export const getInspectionSchedulesForClient = catchAsync(async (req, res, next) => {
  const features = new APIFeatures(
    Schedule.find({ client: req.user._id })
      .populate('property', 'title location images slug')
      .populate('realtor', 'fullname email profile')
      .sort({ createdAt: -1 }),
    req.query
  )
    .sort()
    .limitFields()
    .paginate();

  const schedules = await features.query;
  const totalCount = await Schedule.countDocuments({ client: req.user._id });

  res.status(200).json({
    status: 'success',
    results: schedules.length,
    data: { schedules, totalCount, page: req.query.page || 1, limit: req.query.limit || 10 },
  });
});

export const getInspectionSchedules = catchAsync(async (req, res, next) => {
  const features = new APIFeatures(Schedule.find().populate('property'), req.query)
    .sort()
    .search(['clientName', 'clientEmail'])
    .limitFields()
    .paginate();

  const schedules = await features.query;
  const totalCount = await Schedule.countDocuments();

  res.status(200).json({
    status: 'success',
    results: schedules.length,
    data: { schedules, totalCount, page: req.query.page || 1, limit: req.query.limit || 10 },
  });
});

export const getInspectionScheduleDetails = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const schedule = await Schedule.findById(id)
    .populate('property', 'title location images slug')
    .populate('client', 'fullname email profile')
    .populate('realtor', 'fullname email profile');

  if (!schedule) return next(new AppError('Inspection Schedule not found', 404));

  const isRealtor = schedule.realtor._id.toString() === req.user._id.toString();
  const isClient = schedule.client._id.toString() === req.user._id.toString();
  const isAdmin = req.user.role === 'admin';

  if (!isRealtor && !isClient && !isAdmin)
    return next(new AppError('You are not authorized to view this schedule', 403));

  return res.status(200).json({ status: 'success', data: { schedule } });
});

export const updateInspectionScheduleStatus = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { status } = req.body;

  const validStatuses = ['pending', 'rescheduled', 'accepted', 'rejected', 'completed'];
  if (!validStatuses.includes(status)) return next(new AppError('Invalid Status Value', 400));

  const schedule = await Schedule.findById(id);
  if (!schedule) return next(new AppError('Inspection Schedule not found', 404));

  const isRealtor = schedule.realtor.toString() === req.user._id.toString();
  const isAdmin = req.user.role === 'admin';

  if (!isRealtor && !isAdmin)
    return next(new AppError('You are not authorized to update this schedule', 403));

  schedule.status = status;
  await schedule.save();
  res.status(200).json({
    status: 'success',
    message: `Schedule Status updated to ${status.toUpperCase()}`,
    data: { schedule },
  });
});
