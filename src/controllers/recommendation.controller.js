import db from '../models/index.js';
import { Op } from 'sequelize';

const { Tutor, Student, User, Location } = db;

/**
 * 🧑‍🎓 For Students: Recommend Tutors
 */
export const getRecommendedTutors = async (req, res) => {
  const userId = req.user.id;
  const { budgetMin, budgetMax, name } = req.query; // ✅ added name filter

  try {
    // 1. Fetch student profile
    const student = await Student.findOne({
      where: { user_id: userId },
      include: [Location],
    });

    if (!student) {
      return res.status(404).json({ message: 'Student profile not found' });
    }

    const {
      subjects,
      class: studentClass,
      class_modes,
      languages,
      board,
      availability,
      tutor_gender_preference,
    } = student;

    const studentLocation = student.Location;

    // 2. Build tutor filters
    const tutorWhere = { profile_status: 'approved' };

    if (subjects?.length) tutorWhere.subjects = { [Op.overlap]: subjects };
    if (studentClass) tutorWhere.classes = { [Op.overlap]: [studentClass] };
    if (class_modes?.length) tutorWhere.teaching_modes = { [Op.overlap]: class_modes };
    if (languages?.length) tutorWhere.languages = { [Op.overlap]: languages };
    if (board?.length) tutorWhere.board = { [Op.overlap]: board };
    if (availability?.length) tutorWhere.availability = { [Op.overlap]: availability };
    if (tutor_gender_preference && tutor_gender_preference !== 'Any') {
      tutorWhere.gender = tutor_gender_preference;
    }
    if (budgetMin || budgetMax) {
      tutorWhere.pricing_per_hour = {};
      if (budgetMin) tutorWhere.pricing_per_hour[Op.gte] = budgetMin;
      if (budgetMax) tutorWhere.pricing_per_hour[Op.lte] = budgetMax;
    }
    if (name) {
      tutorWhere.name = { [Op.iLike]: `%${name}%` }; // ✅ case-insensitive search
    }

    // 3. Fetch tutors
    const tutors = await Tutor.findAll({
      where: tutorWhere,
      include: [
        {
          model: User,
          attributes: ['id', 'email', 'mobile_number', 'is_active'],
        },
        {
          model: Location,
          where: studentLocation
            ? {
                [Op.or]: [
                  { city: { [Op.iLike]: `%${studentLocation.city}%` } },
                  { state: { [Op.iLike]: `%${studentLocation.state}%` } },
                  { country: { [Op.iLike]: `%${studentLocation.country}%` } }
                ]
              }
            : undefined,
          required: !!studentLocation,
        }
      ],
      order: [['created_at', 'DESC']], // default order
    });

    return res.status(200).json({ recommendedTutors: tutors });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to fetch recommended tutors',
      error: error.message,
    });
  }
};

/**
 * 🧑‍🏫 For Tutors: Recommend Students
 */
export const getRecommendedStudents = async (req, res) => {
  const userId = req.user.id;
  const { name } = req.query; // ✅ added name filter

  try {
    // 1. Fetch tutor profile
    const tutor = await Tutor.findOne({
      where: { user_id: userId },
      include: [Location],
    });

    if (!tutor) {
      return res.status(404).json({ message: 'Tutor profile not found' });
    }

    const {
      subjects,
      classes,
      teaching_modes,
      languages,
      board,
      availability,
    } = tutor;

    const tutorLocation = tutor.Location;

    // 2. Build student filters
    const studentWhere = {};
    if (subjects?.length) studentWhere.subjects = { [Op.overlap]: subjects };
    if (classes?.length) studentWhere.class = { [Op.overlap]: classes };
    if (teaching_modes?.length) studentWhere.class_modes = { [Op.overlap]: teaching_modes };
    if (languages?.length) studentWhere.languages = { [Op.overlap]: languages };
    if (board?.length) studentWhere.board = { [Op.overlap]: board };
    if (availability?.length) studentWhere.availability = { [Op.overlap]: availability };
    if (name) {
      studentWhere.name = { [Op.iLike]: `%${name}%` }; // ✅ case-insensitive search
    }

    // 3. Fetch students
    const students = await Student.findAll({
      where: studentWhere,
      include: [
        {
          model: User,
          attributes: ['id', 'email', 'mobile_number', 'is_active'],
        },
        {
          model: Location,
          where: tutorLocation
            ? {
                [Op.or]: [
                  { city: { [Op.iLike]: `%${tutorLocation.city}%` } },
                  { state: { [Op.iLike]: `%${tutorLocation.state}%` } },
                  { country: { [Op.iLike]: `%${tutorLocation.country}%` } }
                ]
              }
            : undefined,
          required: !!tutorLocation,
        }
      ],
      order: [['created_at', 'DESC']],
    });

    return res.status(200).json({ recommendedStudents: students });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to fetch recommended students',
      error: error.message,
    });
  }
};
