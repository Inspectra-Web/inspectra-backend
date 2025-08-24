import { Schema, model } from 'mongoose';

const chatRoomSchema = new Schema(
  {
    property: { type: Schema.Types.ObjectId, ref: 'Property', required: true },
    client: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    realtor: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    inquiry: { type: Schema.Types.ObjectId, ref: 'Inquiry' },
    lastMessage: { type: String, default: '' },
    lastMessageAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const ChatRoom = model('ChatRoom', chatRoomSchema);
export default ChatRoom;
