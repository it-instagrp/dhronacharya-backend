import express from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
import { updateLocation, getProfile, updateTutorProfile } from '../controllers/profile.controller.js';
// import { updateLocation, getProfile } from '../controllers/profile.controller.js';

const router = express.Router();

router.use(authenticate);

router.get('/', getProfile);
router.put('/location', updateLocation);

router.put('/tutor', updateTutorProfile); // ✅ New endpoint to update degrees and intro video

export default router;
