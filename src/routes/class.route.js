import express from 'express';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import {
  createClass,
  getMyClasses,
  updateClass,
  cancelClass,
  getAllClasses,
  deleteClassPermanently,
  getAcceptedStudentsForTutor,
  getAcceptedTutorsForStudent,
  getAllMyAcceptedConnections
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
router.put('/:id', cancelClass);

//  Admin: View all scheduled classes

// Permanently delete a class (admin/tutor/student)
router.delete('/:id/permanent', deleteClassPermanently);

//newly added 29-11-2025 for class schedule getaccepted tutor and  student 
router.get("/accepted-students", authenticate, getAcceptedStudentsForTutor);
router.get("/accepted-tutors", authenticate, getAcceptedTutorsForStudent);

router.get('/my-connections', authenticate, getAllMyAcceptedConnections);

export default router;
