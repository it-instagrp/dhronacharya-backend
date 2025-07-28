import express from 'express';
import {
  createCoupon,
  getAllCoupons,
  applyCoupon,
  toggleCouponStatus,
  deleteCoupon,
  getAvailableCoupons
} from '../controllers/coupon.controller.js';

import { authenticate, authorize } from '../middlewares/auth.middleware.js';

const router = express.Router();

/**
 * ✅ Admin Routes
 */
router.post('/', authenticate, authorize('admin'), createCoupon);            // Create a coupon
router.get('/', authenticate, authorize('admin'), getAllCoupons);            // Get all coupons
router.put('/toggle/:id', authenticate, authorize('admin'), toggleCouponStatus); // Toggle active/inactive
router.delete('/:id', authenticate, authorize('admin'), deleteCoupon);       // Delete coupon

/**
 * ✅ User Route
 */
router.post('/apply', authenticate, applyCoupon);                            // Apply coupon at checkout
// ✅ Public route to get active coupons
router.get('/available', getAvailableCoupons);


export default router;
