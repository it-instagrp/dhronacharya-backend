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
  deleteTutorDocument,
  getPublicTutorById,
  getPublicTutors,
  getPublicStudentById
} from '../controllers/profile.controller.js';

const router = express.Router();



// Get a tutor profile (public view, hides contact details)
router.get('/public/tutors/:id', getPublicTutorById);




// Get all tutors (public view, hides contact details)
router.get('/public/tutors', getPublicTutors);

/**
 * Authenticated Routes
 */
router.use(authenticate);

// Get own profile (student/tutor, includes contact info)
router.get('/', getProfile);

// Update location
router.put('/location', updateLocation);

// Update student profile
router.put('/student', updateStudentProfile);

// Update tutor profile
router.put('/tutor', updateTutorProfile);

// Step 1: Request OTP for email/mobile update
router.post('/field/request', updateProfileField);

// Step 2: Verify OTP and update the field
router.post('/field/verify', updateProfileField);

// Upload or update profile photo
router.patch('/photo', uploadProfilePhoto.single('photo'), updateProfilePhoto);

// Delete profile photo
router.delete('/photo', deleteProfilePhoto);

// Upload Aadhar / PAN documents
router.post('/documents', uploadDocuments.any(), uploadTutorDocuments);

// Delete specific document (aadhar/pan)
router.delete('/documents/:type?', deleteTutorDocument);


// Delete entire user + profile
router.delete('/', deleteUserAndProfile);



router.get('/public/students/:id', getPublicStudentById);


export default router;
