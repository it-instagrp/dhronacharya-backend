import express from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
import {
  uploadProfilePhoto,
  uploadDocuments
} from '../middlewares/upload.middleware.js';

import {
  getProfile,
  updateLocation,
  updateTutorProfile,
  updateStudentProfile,
  updateProfileField,
  deleteUserAndProfile,
  updateProfilePhoto,
  deleteProfilePhoto,
  uploadTutorDocuments,
  deleteTutorDocument
} from '../controllers/profile.controller.js';

const router = express.Router();

router.use(authenticate);

// 📘 Get profile for student/tutor (includes email, mobile)
router.get('/', getProfile);

// 🌍 Update location
router.put('/location', updateLocation);

// 🎓 Update student profile
router.put('/student', updateStudentProfile);

// 👨‍🏫 Update tutor profile
router.put('/tutor', updateTutorProfile);

// ✏️ Update specific field (email / mobile)
router.put('/field', updateProfileField);

// 🖼️ Upload or update profile photo
router.patch('/photo', uploadProfilePhoto.single('photo'), updateProfilePhoto);

// 🧹 Delete profile photo
router.delete('/photo', deleteProfilePhoto);

// 📥 Upload Aadhar / PAN documents
// 📥 Upload Aadhar / PAN documents
router.post(
  '/documents',
  uploadDocuments.any(),   // ✅ Accept any field names
  uploadTutorDocuments
);


// ❌ Delete specific document (aadhar/pan)
router.delete('/documents/:type', deleteTutorDocument);

// ❌ Delete entire user + profile
router.delete('/', deleteUserAndProfile);

export default router;
