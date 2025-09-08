import express from 'express';
import { getAllTutors } from '../controllers/tutor.controller.js';
const router = express.Router();

router.get('/tutors', getAllTutors);

export default router;
