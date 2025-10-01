import express from 'express';
import { newUserValidator, loginValidator } from '../validators/user.validator.js';
import * as authController from '../controllers/auth.controller.js';

const router = express.Router();

//  User Registration
router.post('/signup', newUserValidator, authController.signup);

//pre registration process
router.post('/student/pre-register', authController.preRegisterStudent);

//  Email/Mobile + Password Login
router.post('/login', loginValidator, authController.login);

//  Verify Signup OTP (after /signup)
router.post('/verify-otp', authController.verifyOTP);

// Mobile Login via OTP
router.post('/login/send-otp', authController.sendLoginOTP);
router.post('/login/verify-otp', authController.verifyLoginOTP);

// Forgot & Reset Password (Optional Enhancements)
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

// Authenticated route to change password (needs middleware protection in route group)
router.post('/change-password', authController.changePassword); // apply `authenticate` middleware where used


// logout
// Resend OTP
router.post('/resend-otp', authController.resendOTP);


router.post('/login/send-otp', authController.sendLoginOTP);


export default router;
