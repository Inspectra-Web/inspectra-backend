import { Schema, model } from 'mongoose';

const messageSchema = new Schema(
  {
    chatroom: { type: Schema.Types.ObjectId, ref: 'ChatRoom', required: true },
    sender: { type: Schema.Types.ObjectId, required: true },
    senderModel: { type: String, required: true, enum: ['User', 'GuestUser'] },
    content: { type: String, required: true },
    seen: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const Message = model('Message', messageSchema);
export default Message;
