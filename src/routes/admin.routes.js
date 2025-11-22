
// // src/routes/admin.routes.js


// import express from 'express';
// import {
//   getAllTutors,
//   getAllStudents,
//   updateTutorStatus,
//   deleteUser,
//   blockUnblockUser,
//   updateStudentByAdmin,
//   updateTutorByAdmin,
//   getDashboardSummary,
//    getPendingVerifications,
//   verifyTutorProfile,
//   adminDeleteProfilePhoto,
//   sendUserMessage,
//   sendBulkUserMessage,
//   createTutorByAdmin,
//   bulkUploadTutors,
//    getStudentEnquiries,
//    deleteStudentEnquiry,
//    createStudentByAdmin, 
//    bulkUploadStudents
// } from '../controllers/admin.controller.js';
// import multer from 'multer';

// const upload = multer({ dest: 'uploads/' });

// import { authenticate, authorize } from '../middlewares/auth.middleware.js';

// const router = express.Router();
// router.use(authenticate);
// router.use(authorize('admin', 'super_admin'));


// // Dashboard Summary Route
// router.get('/dashboard-summary', getDashboardSummary);

// // View all
// router.get('/students', getAllStudents);
// router.get('/tutors', getAllTutors);

// //  Update
// router.patch('/tutors/:user_id/status', updateTutorStatus);
// router.patch('/students/:user_id', updateStudentByAdmin);
// router.patch('/tutors/:user_id', updateTutorByAdmin);

// // Block/Unblock
// router.patch('/users/:user_id/block', blockUnblockUser);

// // Delete
// router.delete('/users/:user_id', deleteUser);

// // Get pending verifications
// router.get('/verifications/pending', getPendingVerifications);

// // Approve/Reject tutor
// router.patch('/verifications/tutor/:user_id', verifyTutorProfile);


// // Admin delete user profile photo
// router.delete('/photo/:user_id/:role', authenticate, authorize(['admin','super_admin']), adminDeleteProfilePhoto);

// router.post('/users/send-message', sendUserMessage); // individual tutor/student
// router.post('/users/send-bulk-message', sendBulkUserMessage); // bulk by role

// router.post('/tutors', createTutorByAdmin); // single tutor
// router.post(
//   '/tutors/bulk',
//   upload.single('file'),   //accept only one file with key "file"
//   bulkUploadTutors
// );
// router.get("/enquiries", getStudentEnquiries);
// router.delete("/enquiries/:enquiryId", deleteStudentEnquiry);

// router.post('/students', createStudentByAdmin);
// router.post('/students/bulk-upload', upload.single('file'), bulkUploadStudents);

// export default router;

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
  getStudentEnquiries,
  deleteStudentEnquiry,
  createStudentByAdmin,
  bulkUploadStudents,
   getAllEnquiries,
  getAllEnquiryMessages,
  deleteEnquiry,
  deleteMessage,
  getEnquiryStats,
   getAllMessages,
  getMessagesByUser,
  getMessageStats
} from '../controllers/admin.controller.js';

import multer from 'multer';
const upload = multer({ dest: 'uploads/' });

import { authenticate, authorize } from '../middlewares/auth.middleware.js';

const router = express.Router();

// First authenticate all admin routes
router.use(authenticate);

// Allow both admin + super_admin
router.use(authorize('admin', 'super_admin'));

// Dashboard Summary
router.get('/dashboard-summary', getDashboardSummary);

// View all
router.get('/students', getAllStudents);
router.get('/tutors', getAllTutors);

// Update
router.patch('/tutors/:user_id/status', updateTutorStatus);
router.patch('/students/:user_id', updateStudentByAdmin);
router.patch('/tutors/:user_id', updateTutorByAdmin);

// Block/Unblock
router.patch('/users/:user_id/block', blockUnblockUser);

// Delete
router.delete('/users/:user_id', deleteUser);

// Pending verifications
router.get('/verifications/pending', getPendingVerifications);

// Approve / Reject tutor
router.patch('/verifications/tutor/:user_id', verifyTutorProfile);

// Delete profile photo
router.delete('/photo/:user_id/:role',
  authenticate,
  authorize('admin','super_admin'),
  adminDeleteProfilePhoto
);

// Messages
router.post('/users/send-message', sendUserMessage);
router.post('/users/send-bulk-message', sendBulkUserMessage);

// Tutor create/bulk
router.post('/tutors', createTutorByAdmin);
router.post('/tutors/bulk', upload.single('file'), bulkUploadTutors);

// Enquiries
router.get("/enquiries", getStudentEnquiries);
router.delete("/enquiries/:enquiryId", deleteStudentEnquiry);

// Students create/bulk
router.post('/students', createStudentByAdmin);
router.post('/students/bulk-upload', upload.single('file'), bulkUploadStudents);

// Enquiry Management (Admin only)
router.get('/enquiries', getAllEnquiries); // Get all enquiries
router.get('/enquiries/stats', getEnquiryStats); // Get enquiry statistics
router.get('/enquiries/:enquiry_id/messages', getAllEnquiryMessages); // Get messages for any enquiry
router.delete('/enquiries/:enquiry_id', deleteEnquiry); // Delete enquiry and its messages
router.delete('/messages/:message_id', deleteMessage); // Delete specific message
router.get('/messages', getAllMessages); // Get ALL messages from ALL users
router.get('/messages/stats', getMessageStats); // Get message statistics
router.get('/users/:user_id/messages', getMessagesByUser); // Get messages by specific user

export default router;
