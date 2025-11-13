// src/controllers/review.controller.js
import HttpStatus from 'http-status-codes';
import db from '../models/index.js';
import { Op } from 'sequelize';

const { Review, ReviewComment, User, Tutor, Student, sequelize } = db;

// Create a review
export const createReview = async (req, res) => {
  try {
    const reviewer_id = req.user?.id;
    const { tutor_id, rating, title, comment } = req.body;

    if (!tutor_id || !rating) {
      return res.status(HttpStatus.BAD_REQUEST).json({ message: 'tutor_id and rating required' });
    }

    const tutor = await Tutor.findOne({ where: { user_id: tutor_id } });
    if (!tutor) return res.status(HttpStatus.NOT_FOUND).json({ message: 'Tutor not found' });

    const review = await Review.create({ reviewer_id, tutor_id, rating, title, comment });

    // summary
    const summaryRaw = await Review.findAll({
      where: { tutor_id, status: { [Op.ne]: 'deleted' } },
      attributes: [
        [sequelize.fn('AVG', sequelize.col('rating')), 'avgRating'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
      ],
      raw: true,
    });

    const avg = parseFloat(summaryRaw[0].avgRating || 0).toFixed(2);
    const count = parseInt(summaryRaw[0].count || 0, 10);

    const fullReview = await Review.findByPk(review.id, {
      include: [
        { model: User, as: 'Reviewer', attributes: ['id', 'name'] },
        { model: Student, as: 'StudentReviewer', attributes: ['user_id', 'name'] },
        { model: Tutor, as: 'Tutor', attributes: ['user_id', 'name'] },
      ],
    });

    return res.status(HttpStatus.CREATED).json({
      review: fullReview,
      summary: { average_rating: avg, total_reviews: count },
    });
  } catch (err) {
    console.error('Create review error', err);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: err.message });
  }
};

// Get reviews for a tutor
export const getReviewsByTutor = async (req, res) => {
  try {
    const tutor_id = req.params.tutor_id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const reviews = await Review.findAll({
      where: { tutor_id, status: 'published' },
      include: [
        { model: User, as: 'Reviewer', attributes: ['id', 'name'] },
        { model: Student, as: 'StudentReviewer', attributes: ['user_id', 'name'] },
        { model: Tutor, as: 'Tutor', attributes: ['user_id', 'name'] },
        {
          model: ReviewComment,
          as: 'comments',
          include: [{ model: User, as: 'Commenter', attributes: ['id', 'name'] }],
        },
      ],
      order: [['created_at', 'DESC']],
      limit,
      offset,
    });

    const summaryRaw = await Review.findAll({
      where: { tutor_id, status: { [Op.ne]: 'deleted' } },
      attributes: [
        [sequelize.fn('AVG', sequelize.col('rating')), 'avgRating'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
      ],
      raw: true,
    });

    const avg = parseFloat(summaryRaw[0].avgRating || 0).toFixed(2);
    const count = parseInt(summaryRaw[0].count || 0, 10);

    return res.status(HttpStatus.OK).json({
      reviews,
      summary: { average_rating: avg, total_reviews: count },
    });
  } catch (err) {
    console.error('Get reviews error', err);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: err.message });
  }
};

// Get summary only
export const getReviewSummary = async (req, res) => {
  try {
    const tutor_id = req.params.tutor_id;
    const summaryRaw = await Review.findAll({
      where: { tutor_id, status: { [Op.ne]: 'deleted' } },
      attributes: [
        [sequelize.fn('AVG', sequelize.col('rating')), 'avgRating'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
      ],
      raw: true,
    });
    const avg = parseFloat(summaryRaw[0].avgRating || 0).toFixed(2);
    const count = parseInt(summaryRaw[0].count || 0, 10);
    return res.status(HttpStatus.OK).json({ average_rating: avg, total_reviews: count });
  } catch (err) {
    console.error('Get summary error', err);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: err.message });
  }
};

// Update review
export const updateReview = async (req, res) => {
  try {
    const userId = req.user?.id;
    const id = req.params.id;
    const review = await Review.findByPk(id);
    if (!review) return res.status(HttpStatus.NOT_FOUND).json({ message: 'Review not found' });
    if (review.reviewer_id !== userId) return res.status(HttpStatus.FORBIDDEN).json({ message: 'Not allowed' });

    await review.update(req.body);
    return res.status(HttpStatus.OK).json({ review });
  } catch (err) {
    console.error('Update review error', err);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: err.message });
  }
};

// Delete review
export const deleteReview = async (req, res) => {
  try {
    const userId = req.user?.id;
    const isAdmin = req.user?.role === 'admin';
    const id = req.params.id;
    const review = await Review.findByPk(id);
    if (!review) return res.status(HttpStatus.NOT_FOUND).json({ message: 'Review not found' });
    if (review.reviewer_id !== userId && !isAdmin) return res.status(HttpStatus.FORBIDDEN).json({ message: 'Not allowed' });

    review.status = 'deleted';
    await review.save();
    return res.status(HttpStatus.OK).json({ message: 'Review deleted' });
  } catch (err) {
    console.error('Delete review error', err);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: err.message });
  }
};

// Add comment
export const addComment = async (req, res) => {
  try {
    const commenter_id = req.user?.id;
    const review_id = req.params.id;
    const { comment } = req.body;
    if (!comment) return res.status(HttpStatus.BAD_REQUEST).json({ message: 'comment required' });

    const review = await Review.findByPk(review_id);
    if (!review) return res.status(HttpStatus.NOT_FOUND).json({ message: 'Review not found' });

    const rc = await ReviewComment.create({ review_id, commenter_id, comment });
    return res.status(HttpStatus.CREATED).json({ comment: rc });
  } catch (err) {
    console.error('Add comment error', err);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: err.message });
  }
};

// Get comments
export const getComments = async (req, res) => {
  try {
    const review_id = req.params.id;
    const comments = await ReviewComment.findAll({
      where: { review_id, status: 'visible' },
      include: [{ model: User, as: 'Commenter', attributes: ['id', 'name'] }],
      order: [['created_at', 'ASC']],
    });
    return res.status(HttpStatus.OK).json({ comments });
  } catch (err) {
    console.error('Get comments error', err);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: err.message });
  }
};
