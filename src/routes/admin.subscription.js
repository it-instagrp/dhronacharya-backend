// 📁 src/routes/admin.subscription.routes.js

import express from 'express';
import {
  getAllSubscriptions,
  getUnsubscribedUsers,           // ✅ Add this import
  createSubscriptionPlan,
  updateSubscriptionPlan,
  deleteSubscriptionPlan,
  getAllSubscriptionPlans
} from '../controllers/admin.subscription.controller.js';

import { authenticate, authorize } from '../middlewares/auth.middleware.js';

const router = express.Router();
router.use(authenticate);
router.use(authorize('admin','super_admin'));

// 👉 GET all subscribed users (optional: ?role=tutor or ?role=student)
router.get('/', getAllSubscriptions);

// 👉 GET all unsubscribed users (requires ?role=tutor or ?role=student)
router.get('/unsubscribed', getUnsubscribedUsers);  // ✅ NEW ROUTE

// ✅ Create a new subscription plan
router.post('/plans', createSubscriptionPlan);

// ✏️ Update a subscription plan
router.put('/plans/:id', updateSubscriptionPlan);

// ❌ Delete a subscription plan
router.delete('/plans/:id', deleteSubscriptionPlan);

// 📦 Get all available plans
router.get('/plans', getAllSubscriptionPlans);

export default router;
