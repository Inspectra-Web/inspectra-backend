import { envConfig } from '../configuration/environmentConfig.js';
import ChatRoom from '../model/chatRoomModel.js';
import GuestUser from '../model/guestUserModel.js';
import Property from '../model/propertyModel.js';
import AppError from '../utils/appError.js';
import catchAsync from '../utils/catchAsync.js';
import { Email } from '../utils/email.js';

// Create a chat room for realtor and client
export const createChatRoom = catchAsync(async (req, res, next) => {
  const { propertyId, clientName, clientEmail } = req.body;

  const property = await Property.findById(propertyId).populate('user');
  if (!property) return next(new AppError('Property Not Found', 404));

  const realtor = property.user;
  if (!realtor) return next(new AppError('Realtor not found for this property.', 404));

  let guest = await GuestUser.findOne({ email: clientEmail });

  if (!guest) {
    const token = crypto.randomBytes(32).toString('hex');
    guest = await GuestUser.create({
      name: clientName,
      email: clientEmail,
      chatAccessToken: token,
    });
  }

  let chatRoom = await ChatRoom.findOne({
    property: propertyId,
    client: guest._id,
    realtor: realtor._id,
  });

  if (!chatRoom)
    chatRoom = await ChatRoom.create({
      property: propertyId,
      client: guest._id,
      realtor: realtor._id,
    });

  // Send client chat access email
  await new Email(
    guest,
    `${envConfig.CLIENT_URL}/guest-chat/${guest.chatAccessToken}`,
    '',
    {},
    '',
    { title: property.title },
    { clientName }
  ).sendGuestChatLink();

  res.status(201).json({ status: 'success', message: 'Chat room ready', data: chatRoom });
});

// Get guest chat rooms
export const getClientChatRooms = catchAsync(async (req, res, next) => {
  const guestUser = req.user;
  const chatRooms = await ChatRoom.find({ client: guestUser._id })
    .populate('property', 'title address.city images')
    .populate('realtor', 'fullname email role profile');

  res.status(200).json({
    status: 'success',
    data: { guest: { name: guestUser.name, email: guestUser.email }, chatRooms },
  });
});

// Get realtor chat rooms
export const getRealtorChatRooms = catchAsync(async (req, res, next) => {
  const realtorId = req.user?._id;

  if (!realtorId) return next(new AppError('Unauthorized Realtor', 401));

  const chatRooms = await ChatRoom.find({ realtor: realtorId })
    .populate('property', 'title address.city images')
    .populate('client', 'fullname email profile role');

  res.status(200).json({ status: 'success', data: { chatRooms } });
});

// Get Guest User
export const getGuestUser = catchAsync(async (req, res, next) => {
  const { guestId } = req.params;

  const guestUser = await GuestUser.findById(guestId);

  if (!guestUser) return next(new AppError('Guest User NOT Found', 404));

  res.status(200).json({ status: 'success', data: { guestUser } });
});
