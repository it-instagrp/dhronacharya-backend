import express from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
import {
  getProfile,
  updateLocation,
  updateTutorProfile,
  updateStudentProfile,
  updateProfileField,     // 🆕 new
  deleteUserAndProfile    // 🆕 updated version
} from '../controllers/profile.controller.js';

const router = express.Router();

router.use(authenticate);

// 📘 Get profile for student/tutor (includes email, mobile)
router.get('/', getProfile);

// 🌍 Update location (shared)
router.put('/location', updateLocation);

// 🎓 Update student profile
router.put('/student', updateStudentProfile);

// 👨‍🏫 Update tutor profile
router.put('/tutor', updateTutorProfile);

// ✏️ Update specific field (email / mobile_number)
router.put('/field', updateProfileField); // 🆕 New route

// ❌ Delete user + profile
router.delete('/', deleteUserAndProfile); // 🆕 Replaces deleteProfile

export default router;
