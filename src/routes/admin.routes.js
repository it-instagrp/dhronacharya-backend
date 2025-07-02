// ============================
// 📁 src/routes/admin.routes.js
// ============================

import express from 'express';
import {
  getAllTutors,
  getAllStudents,
  updateTutorStatus,
  deleteUser,
  blockUnblockUser,
  updateStudentByAdmin,
  updateTutorByAdmin
} from '../controllers/admin.controller.js';

import { authenticate, authorize } from '../middlewares/auth.middleware.js';

const router = express.Router();
router.use(authenticate);
router.use(authorize('admin'));

// 🔍 View all
router.get('/students', getAllStudents);
router.get('/tutors', getAllTutors);

// ✏️ Update
router.patch('/tutors/:user_id/status', updateTutorStatus);
router.patch('/students/:user_id', updateStudentByAdmin);
router.patch('/tutors/:user_id', updateTutorByAdmin);

// 🔒 Block/Unblock
router.patch('/users/:user_id/block', blockUnblockUser);

// ❌ Delete
router.delete('/users/:user_id', deleteUser);

export default router;
