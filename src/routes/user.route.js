import * as userController from '../controllers/user.controller.js';
import express from 'express';
const router = express.Router();

router.get('/', userController.getAllUsers);

export default router;