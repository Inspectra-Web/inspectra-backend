import { envConfig } from '../configuration/environmentConfig.js';
import jwt from 'jsonwebtoken';
import User from '../model/userModel.js';
import AppError from '../utils/appError.js';
import { promisify } from 'util';

export const signToken = ({ id, otp }, type = 'id') => {
  let payload;
  let expiresIn;

  if (type === 'otp') {
    payload = { id, otp };
    expiresIn = envConfig.JWT_TOKENSECRET_EXPIRES;
  } else if (type === 'session') {
    payload = { id };
    expiresIn = envConfig.JWT_TOKENSECRET_SESSION_EXPIRES;
  } else {
    payload = { id };
    expiresIn = envConfig.JWT_TOKENSECRET_EXPIRES;
  }

  return jwt.sign(payload, envConfig.JWT_TOKENSECRET, { expiresIn });
};

export async function verifyToken(token, type = 'id') {
  const decoded = await promisify(jwt.verify)(token, envConfig.JWT_TOKENSECRET);

  if (type === 'otp') {
    if (decoded.otp && decoded.id) return decoded;
    throw new Error('Invalid OTP token');
  } else {
    if (decoded.id) return decoded.id;
    throw new Error('Invalid authentication token');
  }
}

export async function findAndValidateUser({ email, userId }) {
  const user = email ? await User.findOne({ email }) : await User.findById(userId);

  if (!user) throw new AppError('User does not exists', 400);

  if (user.emailVerified) throw new AppError('User is already verified', 400);

  return user;
}
