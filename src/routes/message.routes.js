import express from 'express';
import { getMessagesByEnquiry, sendMessage } from '../controllers/message.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.get('/:id/messages', authenticate, getMessagesByEnquiry);
router.post('/:id/messages', authenticate, sendMessage);

export default router;
