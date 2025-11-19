// import express from 'express';
// import {
//   createCoupon,
//   getAllCoupons,
//   applyCoupon,
//   toggleCouponStatus,
//   deleteCoupon,
//   getAvailableCoupons,
//   getCouponUsage
// } from '../controllers/coupon.controller.js';

// import { authenticate, authorize } from '../middlewares/auth.middleware.js';

// const router = express.Router();

// /**
//  * Admin Routes
//  */
// router.post('/', authenticate, authorize('admin'), createCoupon);            // Create a coupon
// router.get('/', authenticate, authorize('admin'), getAllCoupons);            // Get all coupons
// router.put('/toggle/:id', authenticate, authorize('admin'), toggleCouponStatus); // Toggle active/inactive
// router.delete('/:id', authenticate, authorize('admin'), deleteCoupon);       // Delete coupon
// router.get('/usage', authenticate, authorize('admin'), getCouponUsage);
// /**
//  * User Route
//  */
// router.post('/apply', authenticate, applyCoupon);                            // Apply coupon at checkout
// // Public route to get active coupons
// router.get('/available', getAvailableCoupons);


// export default router;

import express from 'express';
import {
  createCoupon,
  getAllCoupons,
  applyCoupon,
  toggleCouponStatus,
  deleteCoupon,
  getAvailableCoupons,
  getCouponUsage
} from '../controllers/coupon.controller.js';

import { authenticate, authorize } from '../middlewares/auth.middleware.js';

const router = express.Router();

/**
 * Admin + Super Admin Routes
 */
router.post('/', authenticate, authorize('admin', 'super_admin'), createCoupon);
router.get('/', authenticate, authorize('admin', 'super_admin'), getAllCoupons);
router.put('/toggle/:id', authenticate, authorize('admin', 'super_admin'), toggleCouponStatus);
router.delete('/:id', authenticate, authorize('admin', 'super_admin'), deleteCoupon);
router.get('/usage', authenticate, authorize('admin', 'super_admin'), getCouponUsage);

/**
 * User Route
 */
router.post('/apply', authenticate, applyCoupon);

/**
 * Public Route
 */
router.get('/available', getAvailableCoupons);

export default router;
