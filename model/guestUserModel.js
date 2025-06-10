import { model, Schema } from 'mongoose';

const guestUserSchema = new Schema({
  name: String,
  email: { type: String, required: true },
  chatAccessToken: String,
  createdAt: { type: Date, default: Date.now },
});

const GuestUser = model('GuestUser', guestUserSchema);

export default GuestUser;
