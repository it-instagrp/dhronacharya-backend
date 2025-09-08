import express from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
import * as enquiryController from '../controllers/enquiry.controller.js';
import { getMessagesByEnquiry, sendMessage } from '../controllers/message.controller.js'; // ✅ Required

const router = express.Router();
router.get('/recent', enquiryController.getRecentEnquiries);
router.use(authenticate);

router.post('/', enquiryController.createEnquiry);
router.get('/', enquiryController.getEnquiries);
router.patch('/:id/status', enquiryController.updateEnquiryStatus);

// Messages related to enquiries
router.get('/:id/messages', getMessagesByEnquiry);
router.post('/:id/messages', sendMessage);

export default router;
