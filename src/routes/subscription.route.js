// src/routes/subscription.routes.js

import express from 'express';
import {
  getPlansByUserType,
  addDefaultPlans,
  getSubscriptionStatus
} from '../controllers/subscription.controller.js';

import { verifyToken } from '../middlewares/auth.middleware.js';

const router = express.Router();

// ✅ Get current user's active subscription status (Requires auth)
router.get('/status', verifyToken, getSubscriptionStatus);

// ✅ Add all default subscription plans (Admin/Dev-only)
router.post('/add-defaults', addDefaultPlans);

// ✅ Get plans by user type: /subscriptions/student or /subscriptions/tutor
router.get('/:type', getPlansByUserType);

export default router;
