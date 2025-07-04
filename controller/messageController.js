import { saveMessage } from '../helpers/sendMessageHelper.js';
import Message from '../model/messageModel.js';

import AppError from '../utils/appError.js';
import catchAsync from '../utils/catchAsync.js';

// Send new message
export const sendMessage = catchAsync(async (req, res, next) => {
  const message = await saveMessage(req.body)
    .status(201)
    .json({ status: 'success', message: 'Message sent.', data: message });
});

// Get all messages for a specific chat room
export const getMessagesForChatRoom = catchAsync(async (req, res, next) => {
  const { chatroomId } = req.params;

  const messages = await Message.find({ chatroom: chatroomId })
    .sort({ createdAt: 1 })
    .populate('sender');

  res.status(200).json({ status: 'success', data: messages });
});

// Mark messages as seen
export const markMessagesAsSeen = catchAsync(async (req, res, next) => {
  const { chatroomId, userId } = req.body;

  if (!chatroomId && !userId) return next(new AppError('No Chat room, No User!', 404));

  await Message.updateMany(
    { chatroom: chatroomId, sender: { $ne: userId }, seen: false },
    { $set: { seen: true } }
  );

  res.status(200).json({ message: 'Messages marked as seen.' });
});
