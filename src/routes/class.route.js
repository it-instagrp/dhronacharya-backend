import express from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
import * as classController from '../controllers/class.controller.js';

const router = express.Router();

router.use(authenticate);

router.post('/', classController.createClass);         // Schedule class
router.get('/', classController.getMyClasses);         // Get my calendar view

export default router;
