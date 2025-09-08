import express from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
import { getBillingHistory } from '../controllers/billing.controller.js';

const router = express.Router();

router.get('/history', authenticate, getBillingHistory);

export default router;
