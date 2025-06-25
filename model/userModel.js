import { Schema, model } from 'mongoose';
import { createHash, randomBytes } from 'crypto';
import pkg from 'bcryptjs';
import pkgs from 'validator';

const { isEmail } = pkgs;
const { hash, compare } = pkg;

const userSchema = new Schema(
  {
    fullname: {
      type: String,
      lowercase: true,
      trim: true,
      required: [true, 'Please tell us your name'],
    },
    email: {
      type: String,
      required: [true, 'Please provide your email'],
      unique: true,
      lowercase: true,
      trim: true,
      validate: [isEmail, 'Please provide a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minLength: 8,
      select: false,
    },
    passwordConfirm: {
      type: String,
      required: [true, 'Please confirm your password'],
      validate: {
        validator: function (el) {
          return el === this.password;
        },
        message: 'Passwords are not the same!',
      },
      select: false,
    },
    emailVerified: { type: Boolean, default: false },
    role: {
      type: String,
      enum: ['realtor', 'admin', 'agency', 'property owner', 'client'],
      default: 'realtor',
    },
    plan: { type: String, enum: ['Starter', 'Professional', 'Agency'], default: 'Starter' },
    planActivatedAt: { type: Date, default: Date.now() },
    planExpiresAt: { type: Date },
    planPaidType: { type: String, enum: ['monthly', 'yearly'], default: 'monthly' },
    otp: { type: String, default: undefined },
    passwordResetToken: String,
    passwordResetExpires: String,
    profile: { type: Schema.Types.ObjectId, ref: 'Profile' },
    property: [{ type: Schema.Types.ObjectId, ref: 'Property' }],
    referralCode: { type: String, unique: true },
    referredBy: { type: String },
    referrals: [{ type: Schema.Types.ObjectId, ref: 'User', default: [] }],
    totalReferrals: { type: Number, default: 0 },
  },
  { timestamps: true }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await hash(this.password, 12);
  this.passwordConfirm = undefined;

  next();
});

userSchema.methods.correctPassword = async function (candidatePassword) {
  return await compare(candidatePassword, this.password);
};

userSchema.methods.createPasswordResetToken = function () {
  const resetToken = randomBytes(32).toString('hex');
  this.passwordResetToken = createHash('sha256').update(resetToken).digest('hex');
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  console.log({ resetToken }, { passwordResetToken: this.passwordResetToken });

  return resetToken;
};

const User = model('User', userSchema);
export default User;
