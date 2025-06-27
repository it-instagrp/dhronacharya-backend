import express from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
import {
  getProfile,
  updateLocation,
  updateTutorProfile,
  updateStudentProfile,
  deleteProfile
} from '../controllers/profile.controller.js';

const router = express.Router();

router.use(authenticate);

router.get('/', getProfile);
router.put('/location', updateLocation);
router.put('/tutor', updateTutorProfile);
router.put('/student', updateStudentProfile);
router.delete('/', deleteProfile);

export default router;
