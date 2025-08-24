import { envConfig } from '../configuration/environmentConfig.js';
import ChatRoom from '../model/chatRoomModel.js';
import Inquiry from '../model/inquiryModel.js';
import Property from '../model/propertyModel.js';
import User from '../model/userModel.js';
import { APIFeatures } from '../utils/apiFeatures.js';
import AppError from '../utils/appError.js';
import catchAsync from '../utils/catchAsync.js';
import { Email } from '../utils/email.js';

// Send an Inquiry
export const sendInquiryMessage = catchAsync(async (req, res, next) => {
  const { property, message, urgencyLevel, preferredContactMethod } = req.body;

  const client = req.user;

  if (req.user.role === 'realtor') {
    return next(new AppError('Realtors cannot submit inquiries.', 403));
  }

  const propertyExists = await Property.findById(property).populate('user');
  if (!propertyExists) return next(new AppError('Property Not Found', 404));

  const manager = propertyExists.user;
  if (!manager) return next(new AppError('Realtor not found for this property.', 404));
  const propertyManager = await User.findById(manager);

  // let guestUser = await GuestUser.findOne({ email: clientEmail });

  // if (!guestUser) {
  //   const token = crypto.randomBytes(32).toString('hex');
  //   guestUser = await GuestUser.create({
  //     name: clientName,
  //     email: clientEmail,
  //     chatAccessToken: token,
  //   });
  // }

  try {
    // 🔴
    await new Email(
      manager,
      `${envConfig.CLIENT_URL}/app/manage-property/${propertyExists._id}`,
      message,
      {},
      '',
      { title: propertyExists.title },
      { clientName: client.fullname, clientEmail: client.email, urgencyLevel }
    ).sendInquiryNotification();

    // 🔵
    const inquiry = await Inquiry.create({
      property,
      propertyManager: propertyManager.fullname,
      realtor: manager._id,
      client: client._id,
      clientName: client.fullname,
      clientEmail: client.email,
      message,
      urgencyLevel,
      preferredContactMethod,
    });

    propertyExists.inquiries += 1;
    await propertyExists.save();

    let chatRoom = await ChatRoom.findOne({
      property,
      client: client._id,
      realtor: manager._id,
    });

    if (!chatRoom) {
      chatRoom = await ChatRoom.create({
        property,
        client: client._id,
        realtor: manager._id,
        inquiry: inquiry._id,
      });
    }

    inquiry.chatRoom = chatRoom._id;
    inquiry.save();

    //   // 🟢
    //   await new Email(
    //     guestUser,
    //     `${envConfig.CLIENT_URL}/guest-chat/${guestUser.chatAccessToken}`,
    //     '',
    //     {},
    //     '',
    //     { title: propertyExists.title },
    //     { clientName }
    //   ).sendGuestChatLink();

    res.status(201).json({
      status: 'success',
      message: 'Inquiry submitted successfully. Check your mail to access your chat room!',
      data: { inquiry, chatRoomId: chatRoom._id },
    });
  } catch (error) {
    console.error(error);
    return next(
      new AppError('We couldn’t send your message to the realtor. Please try again later.', 500)
    );
  }
});

export const getInquiriesForRealtor = catchAsync(async (req, res, next) => {
  const features = new APIFeatures(
    Inquiry.find({ realtor: req.user._id }).populate('property', 'propertyId'),
    req.query
  )
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

export const getInquiriesForClient = catchAsync(async (req, res, next) => {
  const features = new APIFeatures(
    Inquiry.find({ client: req.user._id })
      .populate('realtor', 'profile')
      .populate('property', 'propertyId slug'),
    req.query
  )
    .sort()
    .search(['message'])
    .limitFields()
    .paginate();

  const inquiries = await features.query;
  const totalCount = await Inquiry.countDocuments({ client: req.user._id });

  res.status(200).json({
    status: 'success',
    results: inquiries.length,
    data: {
      inquiries,
      totalCount,
      page: req.query.page || 1,
      limit: req.query.limit || 10,
    },
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
