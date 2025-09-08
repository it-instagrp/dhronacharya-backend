import db from '../models/index.js';
import { Op, fn, col } from 'sequelize';

const { Student, Tutor, User, Location,Review, ReviewComment } = db;

/**
 * 🧑‍🎓 Fetch Students with Filters
 */
export const getStudents = async (req, res) => {
  try {
    let {
      subjects,
      classes,
      board,
      availability,
      languages,
      location,
      name,
      tutor_gender_preference,
    } = req.query;

    const whereConditions = {};

    // ✅ Subjects
    if (subjects) {
      if (!Array.isArray(subjects)) subjects = [subjects];
      whereConditions.subjects = { [Op.overlap]: subjects };
    }

    // ✅ Classes
    if (classes) {
      if (!Array.isArray(classes)) classes = [classes];
      whereConditions.class = { [Op.overlap]: classes };
    }

    // ✅ Board
    if (board) {
      if (!Array.isArray(board)) board = [board];
      whereConditions.board = { [Op.overlap]: board };
    }

    // ✅ Availability
    if (availability) {
      if (!Array.isArray(availability)) availability = [availability];
      whereConditions.availability = { [Op.overlap]: availability };
    }

    // ✅ Languages
    if (languages) {
      if (!Array.isArray(languages)) languages = [languages];
      whereConditions.languages = { [Op.overlap]: languages };
    }

    // ✅ Gender Preference
    if (tutor_gender_preference && tutor_gender_preference !== 'Any') {
      whereConditions.tutor_gender_preference = tutor_gender_preference;
    }

    // ✅ Name Search
    if (name) {
      whereConditions.name = { [Op.iLike]: `%${name}%` };
    }

    // ✅ Location (city, state, country)
    const locationFilter = location
      ? {
          [Op.or]: [
            { city: { [Op.iLike]: `%${location}%` } },
            { state: { [Op.iLike]: `%${location}%` } },
            { country: { [Op.iLike]: `%${location}%` } },
          ],
        }
      : {};

    const students = await Student.findAll({
      where: whereConditions,
      include: [
        { model: User, attributes: ['id', 'email', 'mobile_number', 'is_active'] },
        { model: Location, where: locationFilter, required: !!location },
      ],
      order: [['created_at', 'DESC']],
    });

    return res.status(200).json({ students });
  } catch (err) {
    console.error('❌ Failed to fetch students:', err);
    return res
      .status(500)
      .json({ message: 'Failed to fetch students', error: err.message });
  }
};

/**
 * 🧑‍🏫 Fetch Tutors with Filters
 */

/**
 * 🧑‍🏫 Fetch Tutors with Filters + Ratings + Reviews + Comments
 */
export const getTutors = async (req, res) => {
  try {
    let {
      subjects,
      classes,
      board,
      availability,
      languages,
      teaching_modes,
      experience,
      budgetMin,
      budgetMax,
      location,
      name,
      gender,
      profile_status = 'approved',
    } = req.query;

    const whereConditions = { profile_status };

    // ✅ Subjects
    if (subjects) {
      if (!Array.isArray(subjects)) subjects = [subjects];
      whereConditions.subjects = { [Op.overlap]: subjects };
    }

    // ✅ Classes
    if (classes) {
      if (!Array.isArray(classes)) classes = [classes];
      whereConditions.classes = { [Op.overlap]: classes };
    }

    // ✅ Board
    if (board) {
      if (!Array.isArray(board)) board = [board];
      whereConditions.board = { [Op.overlap]: board };
    }

    // ✅ Availability
    if (availability) {
      if (!Array.isArray(availability)) availability = [availability];
      whereConditions.availability = { [Op.overlap]: availability };
    }

    // ✅ Languages
    if (languages) {
      if (!Array.isArray(languages)) languages = [languages];
      whereConditions.languages = { [Op.overlap]: languages };
    }

    // ✅ Teaching Modes
    if (teaching_modes) {
      if (!Array.isArray(teaching_modes)) teaching_modes = [teaching_modes];
      whereConditions.teaching_modes = { [Op.overlap]: teaching_modes };
    }

    // ✅ Experience (min years)
    if (experience) {
      whereConditions.experience = { [Op.gte]: experience };
    }

    // ✅ Pricing
    if (budgetMin || budgetMax) {
      whereConditions.pricing_per_hour = {};
      if (budgetMin) whereConditions.pricing_per_hour[Op.gte] = budgetMin;
      if (budgetMax) whereConditions.pricing_per_hour[Op.lte] = budgetMax;
    }

    // ✅ Gender
    if (gender && gender !== 'Any') {
      whereConditions.gender = gender;
    }

    // ✅ Name search
    if (name) {
      whereConditions.name = { [Op.iLike]: `%${name}%` };
    }

    // ✅ Location filter
    const locationFilter = location
      ? {
          [Op.or]: [
            { city: { [Op.iLike]: `%${location}%` } },
            { state: { [Op.iLike]: `%${location}%` } },
            { country: { [Op.iLike]: `%${location}%` } },
          ],
        }
      : {};

    // 🔹 Fetch tutors
    const tutors = await Tutor.findAll({
      where: whereConditions,
      include: [
        {
          model: User,
          attributes: ['id', 'email', 'mobile_number', 'is_active'],
        },
        {
          model: Location,
          where: locationFilter,
          required: !!location,
          attributes: ['city', 'state', 'country'],
        },
      ],
      order: [['created_at', 'DESC']],
    });

    // 🔹 Add ratings + all published reviews with comments
    const tutorsWithData = await Promise.all(
      tutors.map(async (tutor) => {
        // Ratings summary
        const summary = await Review.findAll({
          where: { tutor_id: tutor.user_id, status: { [Op.ne]: 'deleted' } },
          attributes: [
            [fn('AVG', col('rating')), 'avgRating'],
            [fn('COUNT', col('id')), 'count'],
          ],
          raw: true,
        });

        tutor.dataValues.average_rating = parseFloat(summary[0].avgRating || 0).toFixed(2);
        tutor.dataValues.total_reviews = parseInt(summary[0].count || 0, 10);

        // All published reviews + comments
        const allReviews = await Review.findAll({
          where: { tutor_id: tutor.user_id, status: 'published' },
          include: [
            {
              model: User,
              as: 'Reviewer',
              attributes: ['id', 'name'],
            },
            {
              model: ReviewComment,
              as: 'comments',
              required: false,
              include: [
                { model: User, as: 'Commenter', attributes: ['id', 'name'] },
              ],
            },
          ],
          order: [['created_at', 'DESC']],
        });

        tutor.dataValues.reviews = allReviews;

        return tutor;
      })
    );

    return res.status(200).json({ tutors: tutorsWithData });
  } catch (err) {
    console.error('❌ Failed to fetch tutors:', err);
    return res.status(500).json({
      message: 'Failed to fetch tutors',
      error: err.message,
    });
  }
};