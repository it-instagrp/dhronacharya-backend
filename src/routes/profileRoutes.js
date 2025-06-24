import express from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
import { updateLocation, getProfile } from '../controllers/profile.controller.js';

const router = express.Router();

router.use(authenticate);

router.get('/', getProfile);
router.put('/location', updateLocation);

export default router;
