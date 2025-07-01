import express from 'express';
import { viewContact } from '../controllers/contact.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { checkSubscriptionAndContactLimit } from '../middlewares/subscription.middleware.js';

const router = express.Router();

// GET /api/contacts/view/:id
router.get('/view/:id', authenticate, checkSubscriptionAndContactLimit, viewContact);

export default router;
