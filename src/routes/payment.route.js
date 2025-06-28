import express from 'express';
import * as paymentController from '../controllers/payment.controller.js';

const router = express.Router();

router.post('/create-order', paymentController.createOrder); // ✅ THIS
router.post('/verify-payment', paymentController.verifyPayment);

export default router;
