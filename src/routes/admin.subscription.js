// 📁 src/routes/admin.subscription.routes.js

import express from 'express';
import {
  getAllSubscriptions,
  createSubscriptionPlan,
  updateSubscriptionPlan,
  deleteSubscriptionPlan,
   getAllSubscriptionPlans
} from '../controllers/admin.subscription.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';

const router = express.Router();
router.use(authenticate);
router.use(authorize('admin'));

// 👉 GET all user subscriptions
router.get('/', getAllSubscriptions);
// ✅ Create a new subscription plan
router.post('/plans', createSubscriptionPlan);

// ✏️ Update a subscription plan
router.put('/plans/:id', updateSubscriptionPlan);

// ❌ Delete a subscription plan
router.delete('/plans/:id', deleteSubscriptionPlan);
router.get('/plans', getAllSubscriptionPlans);  // ✅ new route for admin to fetch all plans


export default router;
