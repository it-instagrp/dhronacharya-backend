import express from 'express';
import { getStudents, getTutors } from '../controllers/search.controller.js';

const router = express.Router();

router.get('/students', getStudents);
router.get('/tutors', getTutors);

export default router;
