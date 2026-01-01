import HttpStatus from 'http-status-codes';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import db from '../models/index.js';
import logger from '../config/logger.js';
import { sendEmail } from '../utils/email.js';
import { sendSMS } from '../utils/sms.js';
import { templates } from '../templates/index.js';
import { getPlaceDetailsFromGoogle, getLocationFromPincode } from "../utils/googlePlacesService.js";

const { User, Admin, Tutor, Student, Location } = db;
import sequelize from '../config/database.js';
// Generate JWT Token
const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );
};


// Generate 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};


// Signup Controller
export const signup = async (req, res) => {
  const {
    email,
    mobile_number,
    password,
    role,
    name,
    class: studentClass,
    subjects,
    classes,
    temp_student_id,       // reverse flow
    location_id,
    place_id,
    pincode,               // NEW
    country,               // NEW
    class_modes,
    profile_photo,
    languages,
    school_name,
    sms_alerts,
    board,
    availability,
    start_timeline,
    tutor_gender_preference,
    hourly_charges
  } = req.body;


  try {
    const now = new Date();


    const existingUser = await User.findOne({
      where: {
        [sequelize.Sequelize.Op.or]: [{ email }, { mobile_number }]
      }
    });


    if (existingUser) {
      // Already verified
      if (existingUser.is_active) {
        return res.status(HttpStatus.CONFLICT).json({
          message: "Email or mobile number already registered"
        });
      }


      // Stale account (>30min) → delete & allow fresh signup
      const createdAt = new Date(existingUser.created_at);
      if (now - createdAt > 30 * 60 * 1000) {
        await User.destroy({ where: { id: existingUser.id } });
      } else {
        // Unverified user → always resend OTP
        const otp = generateOTP();
        const otpHash = crypto.createHash("sha256").update(otp).digest("hex");


        await existingUser.update({
          otp_secret: otpHash,
          otp_expires_at: new Date(Date.now() + 10 * 60 * 1000),
          last_otp_sent_at: now
        });


        if (existingUser.email) {
          await sendEmail(
            existingUser.email,
            "Verify Your Dronacharya Account",
            templates.otp.signup.email({ otp, userName: existingUser.name })
          );
        }
        if (existingUser.mobile_number) {
          await sendSMS(
            existingUser.mobile_number,
            templates.otp.signup.sms({ otp })
          );
        }


        return res.status(HttpStatus.CONFLICT).json({
          message: "Account already exists but not verified. New OTP sent.",
          user_id: existingUser.id
        });
      }
    }


    // Fresh signup flow
    const otp = generateOTP();
    const otpHash = crypto.createHash("sha256").update(otp).digest("hex");


    let user;


    if (role === "student") {
      user = await User.create({
        name,
        email,
        mobile_number,
        role,
        password_hash: null,
        otp_secret: otpHash,
        otp_expires_at: new Date(Date.now() + 10 * 60 * 1000),
        last_otp_sent_at: now,
        is_active: false
      });


      if (temp_student_id) {
        await Student.update(
          { user_id: user.id },
          { where: { id: temp_student_id, user_id: null } }
        );
      } else {
        let finalLocationId = location_id || null;


        if (place_id) {
          const details = await getPlaceDetailsFromGoogle(place_id);
          let location = await Location.findOne({ where: { place_id } });
          if (!location) {
            location = await Location.create(details);
          }
          finalLocationId = location.id;
        } else if (pincode && country) {
          const details = await getLocationFromPincode(pincode, country);
          let location = await Location.findOne({
            where: { pincode: details.pincode, country: details.country }
          });
          if (!location) {
            location = await Location.create(details);
          }
          finalLocationId = location.id;
        }


        await Student.create({
          user_id: user.id,
          name,
          class: studentClass,
          subjects,
          location_id: finalLocationId,
          class_modes,
          profile_photo,
          languages,
          school_name,
          sms_alerts,
          board,
          availability,
          start_timeline,
          tutor_gender_preference,
          hourly_charges
        });
      }
    } else {
      if (!password) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          message: "Password is required for this role"
        });
      }


      const hashedPassword = await bcrypt.hash(password, 10);


      user = await User.create({
        name,
        email,
        mobile_number,
        password_hash: hashedPassword,
        role,
        otp_secret: otpHash,
        otp_expires_at: new Date(Date.now() + 10 * 60 * 1000),
        last_otp_sent_at: now,
        is_active: false
      });


      if (role === "admin") {
  return res.status(403).json({
    message: "Admins cannot self-register. Only Super Admin can create admins."
  });
}
 else if (role === "tutor") {
        await Tutor.create({
          user_id: user.id,
          name,
          subjects,
          classes,
          profile_status: "pending"
        });
      }
    }


    // Send OTP to email & SMS
    if (email) {
      await sendEmail(
        email,
        "Verify Your Dronacharya Account",
        templates.otp.signup.email({ otp, userName: name })
      );
    }
    if (mobile_number) {
      await sendSMS(mobile_number, templates.otp.signup.sms({ otp }));
    }


    return res.status(HttpStatus.CREATED).json({
      message: "User created. OTP sent to email and SMS.",
      user_id: user.id
    });
  } catch (err) {
    logger.error("Signup error:", err);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      message: "Signup failed",
      error: process.env.NODE_ENV === "development" ? err.message : undefined
    });
  }
};


// Verify Signup OTP
export const verifyOTP = async (req, res) => {
  const {
    user_id,
    otp,
    class: studentClass,
    subjects,
    location_id,
    place_id,
    pincode,
    country,
    class_modes,
    profile_photo,
    languages,
    school_name,
    sms_alerts,
    board,
    availability,
    start_timeline,
    tutor_gender_preference,
    hourly_charges
  } = req.body;


  try {
    const user = await User.findByPk(user_id, {
      include: [
        { model: Tutor, include: [Location] },
        { model: Student, include: [Location] }
      ]
    });


    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }


    // Validate OTP
    const otpHash = crypto.createHash("sha256").update(otp).digest("hex");
    if (
      user.otp_secret !== otpHash ||
      !user.otp_expires_at ||
      new Date() > user.otp_expires_at
    ) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }


    // Activate user
    user.is_active = true;
    user.otp_secret = null;
    user.otp_expires_at = null;
    await user.save();


    // Ensure student record exists after verification
    if (user.role === "student") {
      let student = await Student.findOne({ where: { user_id: user.id } });


      if (!student) {
        let finalLocationId = location_id || null;


        if (place_id) {
          const details = await getPlaceDetailsFromGoogle(place_id);
          let location = await Location.findOne({ where: { place_id } });
          if (!location) {
            location = await Location.create(details);
          }
          finalLocationId = location.id;
        } else if (pincode && country) {
          const details = await getLocationFromPincode(pincode, country);
          let location = await Location.findOne({
            where: { pincode: details.pincode, country: details.country }
          });
          if (!location) {
            location = await Location.create(details);
          }
          finalLocationId = location.id;
        }


        student = await Student.create({
          user_id: user.id,
          name: user.name,
          class: studentClass || null,
          subjects: subjects || null,
          location_id: finalLocationId,
          class_modes: class_modes || null,
          profile_photo: profile_photo || null,
          languages: languages || null,
          school_name: school_name || null,
          sms_alerts: sms_alerts ?? false,
          board: board || null,
          availability: availability || null,
          start_timeline: start_timeline || null,
          tutor_gender_preference: tutor_gender_preference || null,
          hourly_charges: hourly_charges || null
        });
      }
    }


    // Generate JWT
    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );


    return res.status(200).json({
      message: "OTP verified, account activated",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        mobile_number: user.mobile_number,
        role: user.role
      }
    });
  } catch (err) {
    console.error("OTP Verification Error:", err);
    return res.status(500).json({ message: "OTP verification failed" });
  }
};


// Login
export const login = async (req, res) => {
  const { emailOrMobile, password, role } = req.body;

  try {
    const user = await User.findOne({
      where: {
        [sequelize.Sequelize.Op.or]: [
          { email: emailOrMobile },
          { mobile_number: emailOrMobile }
        ]
      },
      include: [
        { model: Tutor },
        { model: Student },
        { model: Admin }
      ]
    });

    // ✅ CASE 1: Email/Mobile NOT found → Signup first
    if (!user) {
      return res.status(HttpStatus.NOT_FOUND).json({
        message: "Account not found. Please sign up first."
      });
    }

    // Check tutor profile status BEFORE checking if account is active
    if (user.role === 'tutor' && user.Tutor) {
      // ✅ ONLY BLOCK REJECTED TUTORS
      if (user.Tutor.profile_status === 'rejected') {
        return res.status(HttpStatus.FORBIDDEN).json({
          message: 'Your tutor profile has been rejected. Please contact Dronacharya Team.'
        });
      }
      // ✅ ALLOW PENDING TUTORS TO LOGIN - No blocking code here
    }

    // ✅ Account not verified
    if (!user.is_active) {
      return res.status(HttpStatus.UNAUTHORIZED).json({
        message: "Account not verified. Please verify first."
      });
    }

    // ✅ Role mismatch
    if (user.role !== role) {
      return res.status(HttpStatus.FORBIDDEN).json({
        message: `Cannot login as ${role}. Your account role is ${user.role}`
      });
    }

    // ✅ Admin validation
    if (user.role === "admin" && !user.Admin) {
      return res.status(HttpStatus.FORBIDDEN).json({
        message: "Admin access not approved yet."
      });
    }
    
    // ✅ Student must login via OTP
    if (user.role === "student") {
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: "Students must login using OTP."
      });
    }

    // ✅ CASE 2: Email/Mobile exists BUT password is wrong
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(HttpStatus.UNAUTHORIZED).json({
        message: "Incorrect password"
      });
    }

    // ✅ Login success - Include tutor profile status in response
    const token = generateToken(user);

    const userResponse = {
      id: user.id,
      name: user.name,
      email: user.email,
      mobile_number: user.mobile_number,
      role: user.role,
    };

    // ✅ Add tutor-specific info if user is a tutor
    if (user.role === 'tutor' && user.Tutor) {
      userResponse.profile_status = user.Tutor.profile_status;
      userResponse.admin_remarks = user.Tutor.admin_remarks;
    }

    return res.status(HttpStatus.OK).json({
      token,
      user: userResponse
    });

  } catch (err) {
    logger.error("Login Error:", err);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      message: "Login failed"
    });
  }
};


// Send OTP for Student Login
// sendLoginOTP Resolver Fix
export const sendLoginOTP = async (req, res) => {
  const { emailOrMobile } = req.body;


  try {
    const user = await User.findOne({
      where: {
        [sequelize.Sequelize.Op.or]: [
          { email: emailOrMobile },
          { mobile_number: emailOrMobile }
        ]
      }
    });


    if (!user) {
      return res.status(HttpStatus.NOT_FOUND).json({ message: 'User not found' });
    }


    if (!user.is_active) {
      return res.status(HttpStatus.UNAUTHORIZED).json({ message: 'Account not verified' });
    }


    // Restrict OTP login to student only
    if (user.role !== "student") {
      return res.status(HttpStatus.BAD_REQUEST).json({ message: 'This role must log in with password' });
    }


    const otp = generateOTP();
    const otpHash = crypto.createHash('sha256').update(otp).digest('hex');


    user.otp_secret = otpHash;
    user.otp_expires_at = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();


    if (user.email) {
      await sendEmail(
        user.email,
        'Your Dronacharya Login OTP',
        templates.otp.login.email({ otp, userName: user.name })
      );
    }


    if (user.mobile_number) {
      await sendSMS(
        user.mobile_number,
        templates.otp.login.sms({ otp })
      ).then(()=>{console.log("Executed")}).catch((error)=>{console.error("OTP sending failed: ", error)});
    }


    return res.status(HttpStatus.OK).json({ message: 'OTP sent', user_id: user.id });
  } catch (err) {
    logger.error('Send Login OTP Error:', err);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: 'Failed to send OTP' });
  }
};


// Verify Login OTP
// verifyLoginOTP Resolver (Updated for student auto-activation)
export const verifyLoginOTP = async (req, res) => {
  const { user_id, otp } = req.body;


  try {
    const user = await User.findByPk(user_id);


    if (!user) {
      return res.status(HttpStatus.NOT_FOUND).json({ message: 'User not found' });
    }


    // Restrict OTP login only to students
    if (user.role !== "student") {
      return res.status(HttpStatus.BAD_REQUEST).json({ message: 'This role must log in with password' });
    }


    // Verify OTP
    const otpHash = crypto.createHash('sha256').update(otp).digest('hex');
    if (
      user.otp_secret !== otpHash ||
      !user.otp_expires_at ||
      new Date() > user.otp_expires_at
    ) {
      return res.status(HttpStatus.BAD_REQUEST).json({ message: 'Invalid or expired OTP' });
    }


    // If student, mark as active after successful OTP verification
    if (!user.is_active) {
      user.is_active = true;
    }


    // Clear OTP after successful login
    user.otp_secret = null;
    user.otp_expires_at = null;
    await user.save();


    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );


    return res.status(HttpStatus.OK).json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        mobile_number: user.mobile_number,
        role: user.role,
      },
    });
  } catch (err) {
    logger.error('Verify Login OTP Error:', err);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: 'Failed to verify OTP' });
  }
};


// Forgot Password - Send OTP
export const forgotPassword = async (req, res) => {
  const { email } = req.body;


  try {
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(HttpStatus.NOT_FOUND).json({
        message: 'If this email is registered, you will receive a reset link'
      });
    }


    const otp = generateOTP();
    const otpHash = crypto.createHash('sha256').update(otp).digest('hex');


    user.otp_secret = otpHash;
    user.otp_expires_at = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();


    // Send password reset OTP using templates
    await sendEmail(
      email,
      'Reset Your Dronacharya Password',
      templates.otp.forgotPassword.email({ otp, userName: user.name })
    );
   
    await sendSMS(
      user.mobile_number,
      templates.otp.forgotPassword.sms({ otp })
    );


    return res.status(HttpStatus.OK).json({
      message: 'OTP sent to registered email and mobile number'
    });
  } catch (err) {
    logger.error('Forgot Password Error:', err);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      message: 'Error sending OTP'
    });
  }
};


// Reset Password (after OTP verification)
export const resetPassword = async (req, res) => {
  const { email, otp, new_password } = req.body;


  try {
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(HttpStatus.NOT_FOUND).json({
        message: 'User not found'
      });
    }


    const otpHash = crypto.createHash('sha256').update(otp).digest('hex');
    if (user.otp_secret !== otpHash || new Date() > user.otp_expires_at) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: 'Invalid or expired OTP'
      });
    }


    user.password_hash = await bcrypt.hash(new_password, 10);
    user.otp_secret = null;
    user.otp_expires_at = null;
    await user.save();


    return res.status(HttpStatus.OK).json({
      message: 'Password reset successful'
    });
  } catch (err) {
    logger.error('Reset Password Error:', err);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      message: 'Password reset failed'
    });
  }
};


// Change Password (Authenticated)
export const changePassword = async (req, res) => {
  const { old_password, new_password } = req.body;
  const userId = req.user.id;


  try {
    const user = await User.findByPk(userId);
    const isMatch = await bcrypt.compare(old_password, user.password_hash);


    if (!isMatch) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: 'Current password is incorrect'
      });
    }


    user.password_hash = await bcrypt.hash(new_password, 10);
    await user.save();


    return res.status(HttpStatus.OK).json({
      message: 'Password changed successfully'
    });
  } catch (err) {
    logger.error('Change Password Error:', err);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      message: 'Error changing password'
    });
  }
};


// Student Pre-Registration (Reverse Process)
export const preRegisterStudent = async (req, res) => {
  const {
    name,
    class: studentClass,
    subjects,
    location_id,
    place_id,          // Accept place_id
    class_modes,
    profile_photo,
    languages,
    school_name,
    sms_alerts,


    // 🆕 new fields
    board,
    availability,
    start_timeline,
    tutor_gender_preference,
    hourly_charges
  } = req.body;


  try {
    if (!name || !studentClass || !subjects) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: "Name, class, and subjects are required"
      });
    }


    let finalLocationId = location_id || null;


    // If place_id provided, fetch details & create/find Location
    if (place_id) {
      let location = await Location.findOne({ where: { place_id } });


      if (!location) {
        const details = await getPlaceDetailsFromGoogle(place_id);


        location = await Location.create({
          place_id,
          country: details.country,
          state: details.state,
          city: details.city,
          pincode: details.pincode,
          latitude: details.latitude,
          longitude: details.longitude
        });
      }


      finalLocationId = location.id;
    }


    const student = await Student.create({
      name,
      class: studentClass,
      subjects,
      location_id: finalLocationId,   // Save resolved location_id
      class_modes: class_modes || null,
      profile_photo: profile_photo || null,
      languages: languages || null,
      school_name: school_name || null,
      sms_alerts: sms_alerts ?? false,
      user_id: null,


      // new fields
      board: board || null,
      availability: availability || null,
      start_timeline: start_timeline || null,
      tutor_gender_preference: tutor_gender_preference || null,
      hourly_charges: hourly_charges || null
    });


    return res.status(HttpStatus.CREATED).json({
      message: "Student details saved. Please continue with account creation.",
      temp_student_id: student.id
    });
  } catch (err) {
    logger.error("Pre-register student error:", err);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      message: "Failed to save student details",
      error: process.env.NODE_ENV === "development" ? err.message : undefined
    });
  }
};


//  Resend OTP (for signup or login)
export const resendOTP = async (req, res) => {
  const { user_id } = req.body;


  try {
    const user = await User.findByPk(user_id);


    if (!user) {
      return res.status(HttpStatus.NOT_FOUND).json({ message: "User not found" });
    }


    if (user.is_active && !user.otp_secret) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: "Account already verified. Please login."
      });
    }


    // Prevent spamming: allow resend only if at least 60s have passed since last send
    const now = new Date();
    if (user.last_otp_sent_at && now - user.last_otp_sent_at < 60 * 1000) {
      return res.status(HttpStatus.TOO_MANY_REQUESTS).json({
        message: "Please wait before requesting a new OTP"
      });
    }


    // Generate new OTP
    const otp = generateOTP();
    const otpHash = crypto.createHash("sha256").update(otp).digest("hex");


    user.otp_secret = otpHash;
    user.otp_expires_at = new Date(Date.now() + 10 * 60 * 1000);
    user.last_otp_sent_at = now;
    await user.save();


    // Send via Email
    if (user.email) {
      await sendEmail(
        user.email,
        "Your OTP Code - Dronacharya",
        templates.otp.signup.email({ otp, userName: user.name })
      );
    }


    // Send via SMS
    if (user.mobile_number) {
      await sendSMS(
        user.mobile_number,
        templates.otp.signup.sms({ otp })
      );
    }


    return res.status(HttpStatus.OK).json({
      message: "New OTP sent successfully",
      user_id: user.id
    });
  } catch (err) {
    logger.error("Resend OTP Error:", err);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      message: "Failed to resend OTP"
    });
  }
};


// Resend Login OTP for Students
export const resendLoginOTP = async (req, res) => {
  const { user_id } = req.body;


  try {
    const user = await User.findByPk(user_id);


    if (!user) {
      return res.status(HttpStatus.NOT_FOUND).json({ message: "User not found" });
    }


    // Restrict only to students
    if (user.role !== "student") {
      return res.status(HttpStatus.BAD_REQUEST).json({ message: "Only students can login via OTP" });
    }


    if (!user.is_active) {
      return res.status(HttpStatus.UNAUTHORIZED).json({ message: "Account not verified" });
    }


    // Prevent spamming (min 60s gap)
    const now = new Date();
    if (user.last_otp_sent_at && now - user.last_otp_sent_at < 60 * 1000) {
      return res.status(HttpStatus.TOO_MANY_REQUESTS).json({
        message: "Please wait before requesting a new OTP"
      });
    }


    // Generate new OTP
    const otp = generateOTP();
    const otpHash = crypto.createHash("sha256").update(otp).digest("hex");


    user.otp_secret = otpHash;
    user.otp_expires_at = new Date(Date.now() + 10 * 60 * 1000); // 10 min expiry
    user.last_otp_sent_at = now;
    await user.save();


    // Send via Email
    if (user.email) {
      await sendEmail(
        user.email,
        "Your Dronacharya Login OTP",
        templates.otp.login.email({ otp, userName: user.name })
      );
    }


    // Send via SMS
    if (user.mobile_number) {
      await sendSMS(
        user.mobile_number,
        templates.otp.login.sms({ otp })
      );
    }


    return res.status(HttpStatus.OK).json({
      message: "New login OTP sent successfully",
      user_id: user.id
    });
  } catch (err) {
    logger.error("Resend Login OTP Error:", err);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      message: "Failed to resend login OTP"
    });
  }
};


