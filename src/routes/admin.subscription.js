import express from 'express';
import { getAllSubscriptions } from '../controllers/admin.subscription.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';

const router = express.Router();
router.use(authenticate);
router.use(authorize('admin'));

router.get('/', getAllSubscriptions);

export default router;
