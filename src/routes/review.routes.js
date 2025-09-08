// src/routes/review.routes.js
import express from 'express';
import * as reviewController from '../controllers/review.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Reviews
router.post('/', authenticate, reviewController.createReview);
router.get('/tutor/:tutor_id', reviewController.getReviewsByTutor);
router.get('/tutor/:tutor_id/summary', reviewController.getReviewSummary);
router.patch('/:id', authenticate, reviewController.updateReview);
router.delete('/:id', authenticate, reviewController.deleteReview);

// Comments
router.post('/:id/comments', authenticate, reviewController.addComment);
router.get('/:id/comments', reviewController.getComments);

export default router;
