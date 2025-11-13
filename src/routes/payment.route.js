import express from 'express';
import * as paymentController from '../controllers/payment.controller.js';
import { cancelPendingCoupon } from "../controllers/payment.controller.js";

const router = express.Router();

router.post('/create-order', paymentController.createOrder);
router.post('/verify-payment', paymentController.verifyPayment);
router.post('/removeCoupon', cancelPendingCoupon);

export default router;
