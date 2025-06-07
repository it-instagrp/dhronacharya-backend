import express from 'express';
import { newUserValidator, loginValidator } from '../validators/user.validator.js';
import * as authController from '../controllers/auth.controller.js';

const router = express.Router();

router.post('/signup', newUserValidator, authController.signup);
router.post('/login', loginValidator, authController.login);

export default router;
