import Profile from '../model/profileModel.js';
import AppError from '../utils/appError.js';
import catchAsync from '../utils/catchAsync.js';
import User from '../model/userModel.js';
import { deleteFromCloudinary, resizeImage, uploadToCloudinary } from '../utils/upload.js';
import { Email } from '../utils/email.js';
import { envConfig } from '../configuration/environmentConfig.js';
import { realtorStats } from '../helpers/realtorHelpers.js';

// Update Realtor Profile
export const updateProfile = catchAsync(async (req, res, next) => {
  let avatarUrl = null;
  let avatarId = null;

  const profile = await Profile.findOne({ user: req.params.id });

  if (!profile) return next(new AppError('No profile found', 404));

  if (req.file) {
    if (profile.avatarId) await deleteFromCloudinary(profile.avatarId);

    const resizedImage = await resizeImage(req.file?.buffer);
    const { secure_url, public_id } = await uploadToCloudinary(resizedImage, 'realtor_avatars');
    avatarUrl = secure_url;
    avatarId = public_id;

    req.body.avatar = avatarUrl;
    req.body.avatarId = avatarId;
  }

  if (avatarUrl) req.body.avatar = avatarUrl;

  const updatedProfile = await Profile.findOneAndUpdate(
    { user: req.params.id },
    { ...req.body },
    {
      new: true,
      runValidators: true,
    }
  );

  await User.findByIdAndUpdate(req.params.id, {
    fullname: `${req.body.firstname || updatedProfile?.firstname} ${
      req.body.middlename || updatedProfile?.middlename
    } ${req.body.lastname || updatedProfile?.lastname}`,
  });

  res.status(200).json({
    status: 'success',
    message: 'Profile updated successfully',
    data: { profile: updatedProfile },
  });
});

// Read Realtor Profile
export const readProfile = catchAsync(async (req, res, next) => {
  const profile = await Profile.findById(req.params.id).populate('user', 'property');

  if (!profile) return next(new AppError('No profile found', 404));

  res.status(200).json({ status: 'success', data: { profile } });
});

// Upload Verification Documents
export const uploadVerificationDocs = catchAsync(async (req, res, next) => {
  if (!req.file) return next(new AppError('No file provided!', 400));

  const { secure_url, public_id } = await uploadToCloudinary(req.file?.buffer, 'realtor_docs');

  const profile = await Profile.findOneAndUpdate(
    { user: req.params.id },
    {
      $push: { verificationImages: { url: secure_url, publicId: public_id, type: req.body.type } },
    },
    { new: true, runValidators: true }
  );

  const realtor = await User.findById(profile?.user);

  if (!profile && !realtor) return next(new AppError('Profile not found', 404));

  await new Email(
    realtor,
    `${envConfig.CLIENT_URL}/app/profile/${profile._id}`,
    '',
    req.body,
    envConfig.EMAIL_FROM
  ).sendUploadNotice();

  res.status(200).json({
    status: 'success',
    message: 'Document uploaded successfully. You will get an email within 24 hours.',
    data: { verificationImages: profile.verificationImages },
  });
});

// Manage Verification Documents
export const manageVerificationDoc = catchAsync(async (req, res, next) => {
  const { status, rejectionReason } = req.body;

  if (!['verified', 'rejected'].includes(status))
    return next(new AppError('Invalid status provided. Must be "verified" or "rejected".'));

  const profile = await Profile.findOne({ 'verificationImages._id': req.params.docId });

  if (!profile) return next(new AppError('Document not found or Profile not found', 404));

  const realtor = await User.findById(profile.user);

  if (!realtor) return next(new AppError('No Realtor Found'));

  const document = profile.verificationImages.id(req.params.docId);

  if (!document) return next(new AppError('Document not found in the profile', 404));

  if (status === 'rejected') {
    await deleteFromCloudinary(document.publicId);

    profile.verificationImages = profile.verificationImages.filter(
      doc => doc._id.toString() !== req.params.docId
    );

    await new Email(
      realtor,
      `${envConfig.CLIENT_URL}/app/profile/${profile._id}`,
      rejectionReason,
      document
    ).sendRejectionNotice();

    await profile.save();

    res.status(200).json({
      status: 'success',
      message: 'Document rejected and deleted successfully. Notification email sent to realtor.',
    });
  } else if (status === 'verified') {
    document.status = 'verified';
    profile.verified = true;
    await profile.save();
    await new Email(
      realtor,
      `${envConfig.CLIENT_URL}/app/profile/${profile._id}`,
      '',
      document
    ).sendVerificationNotice();

    res.status(200).json({ status: 'success', message: 'Document verified successfully.' });
  }
});

// Get Realtors Statistics
export const getRealtorStats = catchAsync(async (req, res, next) => {
  const statistics = await realtorStats();

  res.status(200).json({ status: 'success', data: { statistics: statistics[0] } });
});
