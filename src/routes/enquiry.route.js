import express from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
import * as enquiryController from '../controllers/enquiry.controller.js';

const router = express.Router();

router.use(authenticate);

router.post('/', enquiryController.createEnquiry);
router.get('/', enquiryController.getEnquiries);
router.patch('/:id/status', enquiryController.updateEnquiryStatus);

export default router;
