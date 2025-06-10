import Profile from '../model/profileModel.js';
import User from '../model/userModel.js';
import { APIFeatures } from '../utils/apiFeatures.js';
import AppError from '../utils/appError.js';
import catchAsync from '../utils/catchAsync.js';

// Middleware: Match the params id with the req.user id
export function getMe(req, res, next) {
  req.params.id = req.user.id;
  next();
}

// Find a user (realtor or admin)
export const getUser = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) return next(new AppError('No user with that ID', 404));

  res.status(200).json({ status: 'success', data: { user } });
});

// Get All Realtors
export const getAllRealtors = catchAsync(async (req, res, next) => {
  const filter = {};
  if (req.query.verified) filter.verified = Boolean(req.query.verified) === true;
  const features = new APIFeatures(Profile.find(filter), req.query)
    .sort()
    .search([
      'firstname',
      'middlename',
      'lastname',
      'specialization',
      'city',
      'telephone',
      'state',
      'email',
    ])
    .limitFields()
    .paginate();
  // .filter()

  const realtors = await features.query;
  const totalCount = await Profile.countDocuments(filter);

  res.status(200).json({
    status: 'success',
    results: realtors.length,
    data: {
      realtors,
      totalCount,
      page: req.query.page || 1,
      limit: req.query.limit || 10,
    },
  });
});
