import express from 'express';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import {
  createClass,
  getMyClasses,
  updateClass,
  cancelClass,
  getAllClasses
} from '../controllers/class.controller.js'; // ✅ Named imports

const router = express.Router();

// 🔐 Apply auth middleware for all class routes
router.use(authenticate);

// 📅 Schedule a class (student/tutor)
router.post('/', createClass);

// 📆 Get my scheduled classes (student/tutor)
router.get('/', getMyClasses);

// ✏️ Update a class (student/tutor/admin)
router.patch('/:id', updateClass);

// ❌ Cancel a class (student/tutor/admin)
router.delete('/:id', cancelClass);

// 🛠 Admin: View all scheduled classes
router.get('/all', authorize('admin'), getAllClasses);

export default router;
