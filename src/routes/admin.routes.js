
// src/routes/admin.routes.js


import express from 'express';
import {
  getAllTutors,
  getAllStudents,
  updateTutorStatus,
  deleteUser,
  blockUnblockUser,
  updateStudentByAdmin,
  updateTutorByAdmin,
  getDashboardSummary,
   getPendingVerifications,
  verifyTutorProfile,
  adminDeleteProfilePhoto,
  sendUserMessage,
  sendBulkUserMessage,
  createTutorByAdmin,
  bulkUploadTutors,
   getStudentEnquiries
} from '../controllers/admin.controller.js';
import multer from 'multer';

const upload = multer({ dest: 'uploads/' });

import { authenticate, authorize } from '../middlewares/auth.middleware.js';

const router = express.Router();
router.use(authenticate);
router.use(authorize('admin'));

// Dashboard Summary Route
router.get('/dashboard-summary', getDashboardSummary);

// View all
router.get('/students', getAllStudents);
router.get('/tutors', getAllTutors);

//  Update
router.patch('/tutors/:user_id/status', updateTutorStatus);
router.patch('/students/:user_id', updateStudentByAdmin);
router.patch('/tutors/:user_id', updateTutorByAdmin);

// Block/Unblock
router.patch('/users/:user_id/block', blockUnblockUser);

// Delete
router.delete('/users/:user_id', deleteUser);

// Get pending verifications
router.get('/verifications/pending', getPendingVerifications);

// Approve/Reject tutor
router.patch('/verifications/tutor/:user_id', verifyTutorProfile);


// Admin delete user profile photo
router.delete('/photo/:user_id/:role', authenticate, authorize(['admin']), adminDeleteProfilePhoto);

router.post('/users/send-message', sendUserMessage); // individual tutor/student
router.post('/users/send-bulk-message', sendBulkUserMessage); // bulk by role

router.post('/tutors', createTutorByAdmin); // single tutor
router.post(
  '/tutors/bulk',
  upload.single('file'),   //accept only one file with key "file"
  bulkUploadTutors
);
router.get("/enquiries", getStudentEnquiries);

export default router;
