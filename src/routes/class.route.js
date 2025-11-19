import express from 'express';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import {
  createClass,
  getMyClasses,
  updateClass,
  cancelClass,
  getAllClasses,
  deleteClassPermanently
} from '../controllers/class.controller.js'; // Named imports

const router = express.Router();

// Apply auth middleware for all class routes
router.use(authenticate);
router.get('/all', authorize('admin','super_admin'), getAllClasses);

// Schedule a class (student/tutor)
router.post('/', createClass);

// Get my scheduled classes (student/tutor)
router.get('/', getMyClasses);

// Update a class (student/tutor/admin)
router.patch('/:id', updateClass);

// Cancel a class (student/tutor/admin)
router.delete('/:id', cancelClass);

//  Admin: View all scheduled classes

// Permanently delete a class (admin/tutor/student)
router.delete('/:id/permanent', deleteClassPermanently);


export default router;
