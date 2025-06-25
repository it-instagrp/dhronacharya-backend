import express from 'express';
import { newUserValidator, loginValidator } from '../validators/user.validator.js';
import * as authController from '../controllers/auth.controller.js';
import {
  sendLoginOTP,
  verifyLoginOTP
} from '../controllers/auth.controller.js';

const router = express.Router();

router.post('/signup', newUserValidator, authController.signup);
router.post('/login', loginValidator, authController.login);
router.post('/auth/login/send-otp', sendLoginOTP);
router.post('/auth/login/verify-otp', verifyLoginOTP);
router.post('/verify-otp', authController.verifyOTP);

export default router;
