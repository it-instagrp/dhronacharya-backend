import express from 'express';
import {
  generateReferralCode,
  getMyReferralCodes,
  applyReferralCode,
  getAllReferrals,
  markRewardGiven,
} from '../controllers/referral.controller.js';

// ✅ Use combined middleware file
import { authenticate, authorize } from '../middlewares/auth.middleware.js';

const router = express.Router();

// ✅ User routes
router.post('/generate', authenticate, generateReferralCode);
router.get('/my-codes', authenticate, getMyReferralCodes);
router.post('/apply', authenticate, applyReferralCode);

// ✅ Admin routes (using role-based guard)
router.get('/all', authenticate, authorize('admin'), getAllReferrals);
router.put('/reward/:id', authenticate, authorize('admin'), markRewardGiven);

export default router;
