import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/userModel.js';
import AuthToken from '../models/authTokenModel.js';
import Otp from '../models/otpModel.js';
import { sendOtpEmail, sendLockNotification } from './emailService.js';

const JWT_EXPIRES_SEC = 60 * 60; // 1h

/** Tạo JWT và lưu AuthToken (dùng cho local + OAuth). */
export const issueAuthToken = async (userId, authType) => {
  const token = jwt.sign(
    { userId, authType },
    process.env.JWT_SECRET || 'dummysecret',
    { expiresIn: JWT_EXPIRES_SEC },
  );
  const expiresAt = new Date(Date.now() + JWT_EXPIRES_SEC * 1000);
  await AuthToken.create({ userId, token, expiresAt });
  return { token, expiresAt };
};

const generateOtp = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

export const registerRequest = async (email) => {
  const existingUser = await User.findOne({ email, authType: 'local' });
  if (existingUser) throw new Error('Email already registered locally');

  const code = generateOtp();
  const expiresAt = new Date(Date.now() + 15 * 60000); // 15 mins

  await Otp.findOneAndUpdate(
    { email, action: 'REGISTER' },
    { otpCode: code, expiresAt },
    { upsert: true, returnDocument: 'after' },
  );

  await sendOtpEmail(email, code, 'REGISTER');
  return { message: 'OTP sent to email' };
};

export const verifyRegister = async (email, password, otpCode, name) => {
  const otpRecord = await Otp.findOne({ email, otpCode, action: 'REGISTER' });
  if (!otpRecord) throw new Error('Invalid or expired OTP');
  if (otpRecord.expiresAt < new Date()) throw new Error('OTP expired');

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await User.create({
    email,
    name,
    password: hashedPassword,
    authType: 'local',
  });

  await Otp.deleteOne({ _id: otpRecord._id });
  return user;
};

export const login = async (email, password, deviceId) => {
  const user = await User.findOne({ email, authType: 'local' });
  if (!user) throw new Error('Invalid credentials');

  // Check locks
  if (user.lockUntil && user.lockUntil > new Date()) {
    throw new Error(`Tài khoàn đang bị khóa vui lòng thử lại sau.`);
  }

  const match = await bcrypt.compare(password, user.password);

  if (!match) {
    user.failedLoginAttempts += 1;
    if (user.failedLoginAttempts >= 5) {
      user.lockUntil = new Date(Date.now() + 10 * 60000); // 10 mins
      user.failedLoginAttempts = 0; // reset after locking
      await user.save();
      await sendLockNotification(user.email);
      throw new Error('Tài khoản bị khóa 10 phút do nhiều lần đăng nhập sai.');
    } else if (user.failedLoginAttempts === 3) {
      user.lockUntil = new Date(Date.now() + 5 * 60000); // 5 mins
      await user.save();
      throw new Error('Tài khoản bị khóa 5 phút do nhiều lần đăng nhập sai.');
    }
    await user.save();
    throw new Error('Invalid credentials');
  }

  // Success
  user.failedLoginAttempts = 0;
  user.lockUntil = undefined;
  await user.save();

  // Device verification
  if (!deviceId) throw new Error('Device ID is required');

  const device = user.devices.find((d) => d.deviceId === deviceId);

  if (!device) {
    // New device detected -> require OTP
    const code = generateOtp();
    const expiresAt = new Date(Date.now() + 15 * 60000);
    await Otp.findOneAndUpdate(
      { email, action: 'NEW_DEVICE' },
      { otpCode: code, expiresAt },
      { upsert: true, returnDocument: 'after' },
    );
    await sendOtpEmail(email, code, 'NEW_DEVICE');
    return {
      requireOtp: true,
      message: 'New device detected. OTP sent to email.',
    };
  }

  // Known device, complete log in
  device.lastLogin = new Date();
  await user.save();

  const { token } = await issueAuthToken(user._id, 'local');
  return { user, token };
};

export const verifyDeviceLogin = async (email, otpCode, deviceId) => {
  const otpRecord = await Otp.findOne({ email, otpCode, action: 'NEW_DEVICE' });
  if (!otpRecord) throw new Error('Invalid or expired OTP');
  if (otpRecord.expiresAt < new Date()) throw new Error('OTP expired');

  const user = await User.findOne({ email, authType: 'local' });
  if (!user) throw new Error('User not found');

  // add trusted device
  user.devices.push({
    deviceId,
    isTrusted: true,
    lastLogin: new Date(),
  });
  await user.save();
  await Otp.deleteOne({ _id: otpRecord._id });

  const { token } = await issueAuthToken(user._id, 'local');
  return { user, token };
};

export const logout = async (token) => {
  const result = await AuthToken.deleteOne({ token });
  return { revoked: result.deletedCount > 0 };
};

export const forgotPassword = async (email) => {
  const user = await User.findOne({ email, authType: 'local' });
  if (!user)
    throw new Error('User not found or not registered with email/password');

  const code = generateOtp();
  const expiresAt = new Date(Date.now() + 15 * 60000);

  await Otp.findOneAndUpdate(
    { email, action: 'RESET_PASSWORD' },
    { otpCode: code, expiresAt },
    { upsert: true, returnDocument: 'after' },
  );

  await sendOtpEmail(email, code, 'RESET_PASSWORD');
  return { message: 'Reset password OTP sent' };
};

export const resetPassword = async (email, otpCode, newPassword) => {
  const otpRecord = await Otp.findOne({
    email,
    otpCode,
    action: 'RESET_PASSWORD',
  });
  if (!otpRecord) throw new Error('Invalid or expired OTP');
  if (otpRecord.expiresAt < new Date()) throw new Error('OTP expired');

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  const user = await User.findOneAndUpdate(
    { email, authType: 'local' },
    { password: hashedPassword, failedLoginAttempts: 0, lockUntil: null },
  );

  await Otp.deleteOne({ _id: otpRecord._id });
  return { message: 'Password reset successfully' };
};
