// routes/invoice.route.js
import express from 'express';
import {
  generateInvoice,
  getMyInvoices,
  getAllInvoicesForAdmin,
   exportAllInvoicesCSV
} from '../controllers/invoice.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.use(authenticate);

// For student/tutor
router.get('/my', getMyInvoices);

// For admin
router.get('/admin/all', authorize('admin'), getAllInvoicesForAdmin);

// Common invoice PDF (all roles)
router.get('/:payment_id/pdf', generateInvoice);

router.get('/admin/csv', authorize('admin'), exportAllInvoicesCSV);
export default router;
