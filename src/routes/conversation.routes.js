// import express from 'express';
// import { authenticate } from '../middlewares/auth.middleware.js';
// import {
//   getOrCreateConversation,
//   getConversationMessages,
//   sendConversationMessage,
// } from '../controllers/conversation.controller.js';

// const router = express.Router();
// router.use(authenticate);

// // Start (or fetch existing) conversation between logged-in user & other
// router.post('/', getOrCreateConversation);

// // Messages in that conversation
// router.get('/:id/messages', getConversationMessages);
// router.post('/:id/messages', sendConversationMessage);

// export default router;
// src/routes/conversation.routes.js (or wherever your routes are)
import express from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
import {
  getOrCreateConversation,
  getConversationMessages,
  sendConversationMessage,
  getUserConversations,
  markMessagesAsRead
} from '../controllers/conversation.controller.js';

const router = express.Router();
router.use(authenticate);

// Get all conversations for current user
router.get('/', getUserConversations);

// Start (or fetch existing) conversation between logged-in user & other
router.post('/', getOrCreateConversation);

// Mark messages as read
router.post('/:id/read', markMessagesAsRead);

// Messages in that conversation
router.get('/:id/messages', getConversationMessages);
router.post('/:id/messages', sendConversationMessage);

export default router;