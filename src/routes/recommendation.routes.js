import express from 'express';
import {
  getRecommendedTutors,
  getRecommendedStudents
} from '../controllers/recommendation.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = express.Router();
router.use(authenticate);

router.get('/tutors/recommended', getRecommendedTutors);       // For student
router.get('/students/recommended', getRecommendedStudents);   // For tutor

export default router;
