import ChatRoom from '../model/chatRoomModel.js';
import Message from '../model/messageModel.js';
import User from '../model/userModel.js';
import AppError from '../utils/appError.js';

export const saveMessage = async ({ chatroom, content, sender, senderModel }) => {
  const senderData = await User.findById(sender);
  if (!senderData) throw new AppError('Sender not found.', 404);

  const chatRoom = await ChatRoom.findById(chatroom);
  if (!chatRoom) throw new AppError('Chat Room not found.', 404);

  const message = await Message.create({
    chatroom,
    sender,
    senderModel,
    content,
  });

  chatRoom.lastMessage = content;
  chatRoom.lastMessageAt = Date.now();
  await chatRoom.save();

  return message;
};
