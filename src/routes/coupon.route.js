import express from 'express';
import * as couponController from '../controllers/coupon.controller.js';

const router = express.Router();

router.post('/apply', couponController.applyCoupon);

export default router;
