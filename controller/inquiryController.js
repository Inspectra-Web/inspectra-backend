import { envConfig } from '../configuration/environmentConfig.js';
import ChatRoom from '../model/chatRoomModel.js';
import GuestUser from '../model/guestUserModel.js';
import Inquiry from '../model/inquiryModel.js';
import Property from '../model/propertyModel.js';
import { APIFeatures } from '../utils/apiFeatures.js';
import AppError from '../utils/appError.js';
import catchAsync from '../utils/catchAsync.js';
import { Email } from '../utils/email.js';
import crypto from 'crypto';

// Send an Inquiry
export const sendInquiryMessage = catchAsync(async (req, res, next) => {
  const { property, clientName, clientEmail, message, urgencyLevel, preferredContactMethod } =
    req.body;

  const propertyExists = await Property.findById(property).populate('user');
  if (!propertyExists) return next(new AppError('Property Not Found', 404));

  const realtor = propertyExists.user;
  if (!realtor) return next(new AppError('Realtor not found for this property.', 404));

  let guestUser = await GuestUser.findOne({ email: clientEmail });

  if (!guestUser) {
    const token = crypto.randomBytes(32).toString('hex');
    guestUser = await GuestUser.create({
      name: clientName,
      email: clientEmail,
      chatAccessToken: token,
    });
  }

  // 🟡
  let chatRoom = await ChatRoom.findOne({
    property,
    client: guestUser._id,
    realtor: realtor._id,
  });

  if (!chatRoom) {
    chatRoom = await ChatRoom.create({
      property,
      client: guestUser._id,
      realtor: realtor._id,
    });

    // 🟢
    await new Email(
      guestUser,
      `${envConfig.CLIENT_URL}/guest-chat/${guestUser.chatAccessToken}`,
      '',
      {},
      '',
      { title: propertyExists.title },
      { clientName }
    ).sendGuestChatLink();
  }

  // 🔵
  const inquiry = await Inquiry.create({
    property,
    realtor: realtor._id,
    clientName,
    clientEmail,
    message,
    urgencyLevel,
    preferredContactMethod,
  });

  propertyExists.inquiries += 1;
  await propertyExists.save();

  // 🔴
  await new Email(
    realtor,
    `${envConfig.CLIENT_URL}/app/manage-property/${propertyExists._id}`,
    message,
    {},
    '',
    { title: propertyExists.title },
    { clientName, clientEmail, urgencyLevel }
  ).sendInquiryNotification();

  res.status(201).json({
    status: 'success',
    message: 'Inquiry submitted successfully. Check your mail to access your chat room!',
    data: { inquiry, chatRoomId: chatRoom._id },
  });
});

export const getInquiriesForRealtor = catchAsync(async (req, res, next) => {
  const features = new APIFeatures(Inquiry.find({ realtor: req.user._id }), req.query)
    .sort()
    .search(['clientName', 'clientEmail'])
    .limitFields()
    .paginate();

  const inquiries = await features.query;
  const totalCount = await Inquiry.countDocuments();

  res.status(200).json({
    status: 'success',
    results: inquiries.length,
    data: { inquiries, totalCount, page: req.query.page || 1, limit: req.query.limit || 10 },
  });
});

export const getInquiries = catchAsync(async (req, res, next) => {
  const features = new APIFeatures(Inquiry.find(), req.query)
    .sort()
    .search(['clientName', 'clientEmail'])
    .limitFields()
    .paginate();

  const inquiries = await features.query;
  const totalCount = await Inquiry.countDocuments();

  res.status(200).json({
    status: 'success',
    results: inquiries.length,
    data: { inquiries, totalCount, page: req.query.page || 1, limit: req.query.limit || 10 },
  });
});
