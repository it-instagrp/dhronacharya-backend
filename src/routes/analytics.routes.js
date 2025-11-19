// src/routes/analytics.routes.js
import express from 'express';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import {
  getAnalyticsSummary,
  exportSubscriptionsCSV,
  exportRevenuePDF,
  exportReferralsCSV,
  exportClassAttendanceCSV,
  exportEnquiriesCSV,
  exportUserReportCSV,
  getClassAttendanceChart,
  getEnquiriesChart,
  getUsersChart,
  exportClassAttendancePDF,
  exportEnquiriesPDF,
  exportUsersPDF
} from '../controllers/analytics.controller.js';

const router = express.Router();

// Summary
router.get('/summary', authenticate, authorize('admin','super_admin'), getAnalyticsSummary);

// CSV Exports
router.get('/subscriptions/csv', authenticate, authorize('admin','super_admin'), exportSubscriptionsCSV);
router.get('/referrals/csv', authenticate, authorize('admin','super_admin'), exportReferralsCSV);
router.get('/classes/csv', authenticate, authorize('admin','super_admin'), exportClassAttendanceCSV);
router.get('/enquiries/csv', authenticate, authorize('admin','super_admin'), exportEnquiriesCSV);
router.get('/users/csv', authenticate, authorize('admin','super_admin'), exportUserReportCSV);

// PDF Exports
router.get('/revenue/pdf', authenticate, authorize('admin','super_admin'), exportRevenuePDF);
router.get('/classes/pdf', authenticate, authorize('admin','super_admin'), exportClassAttendancePDF);
router.get('/enquiries/pdf', authenticate, authorize('admin','super_admin'), exportEnquiriesPDF);
router.get('/users/pdf', authenticate, authorize('admin','super_admin'), exportUsersPDF);

// Chart Data
router.get('/classes/chart', authenticate, authorize('admin','super_admin'), getClassAttendanceChart);
router.get('/enquiries/chart', authenticate, authorize('admin','super_admin'), getEnquiriesChart);
router.get('/users/chart', authenticate, authorize('admin','super_admin'), getUsersChart);

export default router;
