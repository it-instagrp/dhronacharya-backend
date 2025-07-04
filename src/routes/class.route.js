import express from 'express';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import * as classController from '../controllers/class.controller.js';

const router = express.Router();

// 🔐 Apply auth middleware for all class routes
router.use(authenticate);

// 📅 Schedule a class (student/tutor)
router.post('/', classController.createClass);

// 📆 Get my scheduled classes (student/tutor)
router.get('/', classController.getMyClasses);

// ✏️ Update a class (student/tutor/admin)
router.patch('/:id', classController.updateClass);

// ❌ Cancel a class (student/tutor/admin)
router.delete('/:id', classController.cancelClass);

// 🛠 Admin: View all scheduled classes
router.get('/all', authorize('admin'), classController.getAllClasses);

export default router;
