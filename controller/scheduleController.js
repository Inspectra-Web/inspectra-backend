import { envConfig } from '../configuration/environmentConfig.js';
import Property from '../model/propertyModel.js';
import Schedule from '../model/scheduleModel.js';
import { APIFeatures } from '../utils/apiFeatures.js';
import catchAsync from '../utils/catchAsync.js';
import { Email } from '../utils/email.js';

export const sendInspectionSchedule = catchAsync(async (req, res, next) => {
  const { property, clientName, clientEmail, message, scheduleDate } = req.body;

  const propertyExists = await Property.findById(property).populate('user');

  if (!propertyExists) return next(new AppError('Property Not Found', 404));

  const realtor = propertyExists.user;

  if (!realtor) return next(new AppError('Realtor not found for this property.', 404));

  const schedule = await Schedule.create({
    property,
    realtor: realtor?._id,
    clientName,
    clientEmail,
    message,
    scheduleDate,
  });

  propertyExists.schedules += 1;
  await propertyExists.save();

  await new Email(
    realtor,
    `${envConfig.CLIENT_URL}/app/manage-property/${propertyExists._id}`,
    message,
    {},
    '',
    { title: propertyExists.title },
    { clientName, clientEmail, scheduleDate }
  ).sendInspectionNotification();

  res
    .status(201)
    .json({ status: 'success', message: 'Inspection Scheduled successfully.', data: schedule });
});

export const getInspectionSchedulesForRealtor = catchAsync(async (req, res, next) => {
  const features = new APIFeatures(
    Schedule.find({ realtor: req.user._id }).populate('property'),
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
