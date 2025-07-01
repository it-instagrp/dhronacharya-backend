import HttpStatus from 'http-status-codes';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import db from '../models/index.js';
import logger from '../config/logger.js';
import { sendEmail } from '../utils/email.js';
import { sendSMS } from '../utils/sms.js';

const { User, Admin, Tutor, Student, Location } = db;
import sequelize from '../config/database.js';

// 🔐 Generate JWT Token
const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );
};

// 🔐 Generate 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// ✅ Signup + Send OTP
export const signup = async (req, res) => {
  const {
    email, mobile_number, password, role,
    name, class: studentClass, subjects,
    classes
  } = req.body;

  try {
    if (!email || !mobile_number || !password) {
      return res.status(HttpStatus.BAD_REQUEST).json({ message: 'Email, mobile number, and password are required' });
    }

    const existingUser = await User.findOne({
      where: {
        [sequelize.Sequelize.Op.or]: [{ email }, { mobile_number }]
      }
    });
    if (existingUser) {
      return res.status(HttpStatus.CONFLICT).json({ message: 'Email or Mobile already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const otp = generateOTP();
    const otpHash = crypto.createHash('sha256').update(otp).digest('hex');

    const user = await User.create({
      email,
      mobile_number,
      password_hash: hashedPassword,
      role,
      otp_secret: otpHash,
      otp_expires_at: new Date(Date.now() + 10 * 60 * 1000),
      is_active: false
    });

    if (role === 'admin') {
      await Admin.create({ user_id: user.id, name });
    } else if (role === 'tutor') {
      await Tutor.create({
        user_id: user.id,
        name,
        subjects,
        classes,
        profile_status: 'pending'
      });
    } else if (role === 'student') {
      await Student.create({
        user_id: user.id,
        name,
        class: studentClass,
        subjects
      });
    }

    await sendEmail(email, 'OTP Verification', `Your OTP is ${otp}`);
    await sendSMS(mobile_number, `Your OTP is ${otp}`);

    return res.status(HttpStatus.CREATED).json({
      message: 'User created. OTP sent to email and SMS.',
      user_id: user.id
    });
  } catch (err) {
    logger.error('Signup error:', err);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: 'Signup failed', error: err.message });
  }
};

// ✅ Verify Signup OTP
export const verifyOTP = async (req, res) => {
  const { user_id, otp } = req.body;

  try {
    const user = await User.findByPk(user_id, {
      include: [
        { model: Tutor, include: [Location] },
        { model: Student, include: [Location] }
      ]
    });

    if (!user) return res.status(HttpStatus.NOT_FOUND).json({ message: 'User not found' });

    const otpHash = crypto.createHash('sha256').update(otp).digest('hex');
    if (user.otp_secret !== otpHash || new Date() > user.otp_expires_at) {
      return res.status(HttpStatus.BAD_REQUEST).json({ message: 'Invalid or expired OTP' });
    }

    user.is_active = true;
    user.otp_secret = null;
    user.otp_expires_at = null;
    await user.save();

    const token = generateToken(user);
    const userData = {
      id: user.id,
      email: user.email,
      mobile_number: user.mobile_number,
      role: user.role,
      profile: user.Tutor || user.Student || null,
      profile_status: user.Tutor?.profile_status || null
    };

    return res.status(HttpStatus.OK).json({ message: 'OTP verified', token, user: userData });
  } catch (err) {
    logger.error('OTP Verification Error:', err);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: 'OTP verification failed' });
  }
};

// ✅ Login with email or mobile + password
export const login = async (req, res) => {
  const { emailOrMobile, password } = req.body;

  try {
    const user = await User.findOne({
      where: {
        [sequelize.Sequelize.Op.or]: [
          { email: emailOrMobile },
          { mobile_number: emailOrMobile }
        ]
      },
      include: [
        { model: Tutor, include: [Location] },
        { model: Student, include: [Location] }
      ]
    });

    if (!user || !user.is_active) {
      return res.status(HttpStatus.UNAUTHORIZED).json({ message: 'User not found or not verified' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(HttpStatus.UNAUTHORIZED).json({ message: 'Invalid credentials' });
    }

    // ❌ Block admin login
    if (user.role === 'admin') {
      return res.status(HttpStatus.FORBIDDEN).json({ message: 'Admins are not allowed to login here.' });
    }

    // ✅ Allow tutor login even if profile_status is pending or rejected
    const token = generateToken(user);
    const userData = {
      id: user.id,
      email: user.email,
      mobile_number: user.mobile_number,
      role: user.role,
      profile_status: user.Tutor?.profile_status || null,
      profile: user.Tutor || user.Student || null
    };

    return res.status(HttpStatus.OK).json({ token, user: userData });
  } catch (err) {
    logger.error('Login Error:', err);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: 'Login failed' });
  }
};

// 📱 Send OTP for Mobile Login
export const sendLoginOTP = async (req, res) => {
  const { mobile_number } = req.body;

  try {
    const user = await User.findOne({ where: { mobile_number } });

    if (!user || !user.is_active) {
      return res.status(HttpStatus.NOT_FOUND).json({ message: 'User not found or not active' });
    }

    const otp = generateOTP();
    const otpHash = crypto.createHash('sha256').update(otp).digest('hex');

    user.otp_secret = otpHash;
    user.otp_expires_at = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    await sendEmail(user.email, 'Login OTP', `Your OTP is ${otp}`);
    await sendSMS(user.mobile_number, `Your OTP is ${otp}`);

    return res.status(HttpStatus.OK).json({
      message: 'OTP sent to registered email and SMS',
      user_id: user.id
    });
  } catch (err) {
    logger.error('Send Login OTP Error:', err);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: 'Failed to send OTP' });
  }
};

// ✅ Verify Mobile OTP Login
export const verifyLoginOTP = async (req, res) => {
  const { user_id, otp } = req.body;

  try {
    const user = await User.findByPk(user_id, {
      include: [
        { model: Tutor, include: [Location] },
        { model: Student, include: [Location] }
      ]
    });

    if (!user) return res.status(HttpStatus.NOT_FOUND).json({ message: 'User not found' });

    const otpHash = crypto.createHash('sha256').update(otp).digest('hex');
    if (user.otp_secret !== otpHash || new Date() > user.otp_expires_at) {
      return res.status(HttpStatus.BAD_REQUEST).json({ message: 'Invalid or expired OTP' });
    }

    user.otp_secret = null;
    user.otp_expires_at = null;
    await user.save();

    const token = generateToken(user);
    const userData = {
      id: user.id,
      email: user.email,
      mobile_number: user.mobile_number,
      role: user.role,
      profile_status: user.Tutor?.profile_status || null,
      profile: user.Tutor || user.Student || null
    };

    return res.status(HttpStatus.OK).json({
      message: 'OTP verified and logged in',
      token,
      user: userData
    });
  } catch (err) {
    logger.error('Verify Login OTP Error:', err);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: 'OTP verification failed' });
  }
};

// ✅ Forgot Password - Send OTP
export const forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(HttpStatus.NOT_FOUND).json({ message: 'User not found' });

    const otp = generateOTP();
    const otpHash = crypto.createHash('sha256').update(otp).digest('hex');

    user.otp_secret = otpHash;
    user.otp_expires_at = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    await sendEmail(email, 'Reset Password OTP', `Your OTP is ${otp}`);
    await sendSMS(user.mobile_number, `Your OTP is ${otp}`);

    return res.status(HttpStatus.OK).json({ message: 'OTP sent to email and SMS' });
  } catch (err) {
    logger.error('Forgot Password Error:', err);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: 'Error sending OTP' });
  }
};

// ✅ Reset Password (after OTP)
export const resetPassword = async (req, res) => {
  const { email, otp, new_password } = req.body;

  try {
    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(HttpStatus.NOT_FOUND).json({ message: 'User not found' });

    const otpHash = crypto.createHash('sha256').update(otp).digest('hex');
    if (user.otp_secret !== otpHash || new Date() > user.otp_expires_at) {
      return res.status(HttpStatus.BAD_REQUEST).json({ message: 'Invalid or expired OTP' });
    }

    user.password_hash = await bcrypt.hash(new_password, 10);
    user.otp_secret = null;
    user.otp_expires_at = null;
    await user.save();

    return res.status(HttpStatus.OK).json({ message: 'Password reset successful' });
  } catch (err) {
    logger.error('Reset Password Error:', err);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: 'Password reset failed' });
  }
};

// 🔒 Change Password (Authenticated)
export const changePassword = async (req, res) => {
  const { old_password, new_password } = req.body;
  const userId = req.user.id;

  try {
    const user = await User.findByPk(userId);
    const isMatch = await bcrypt.compare(old_password, user.password_hash);

    if (!isMatch) return res.status(HttpStatus.BAD_REQUEST).json({ message: 'Old password incorrect' });

    user.password_hash = await bcrypt.hash(new_password, 10);
    await user.save();

    return res.status(HttpStatus.OK).json({ message: 'Password changed successfully' });
  } catch (err) {
    logger.error('Change Password Error:', err);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: 'Error changing password' });
  }
};
