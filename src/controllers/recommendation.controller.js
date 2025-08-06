import db from '../models/index.js';
import { Op } from 'sequelize';

const { Tutor, Student, User, Location } = db;

// 🧑‍🎓 For Students: Recommend Tutors
export const getRecommendedTutors = async (req, res) => {
  const userId = req.user.id;

  try {
    // 1. Fetch student profile
    const student = await Student.findOne({
      where: { user_id: userId },
      include: [Location],
    });

    if (!student) {
      return res.status(404).json({ message: 'Student profile not found' });
    }

    const { subjects, class: studentClass, class_modes, languages } = student;
    const studentLocation = student.Location;

    // 2. Find matching tutors
    const tutors = await Tutor.findAll({
      where: {
        profile_status: 'approved',
        subjects: { [Op.overlap]: subjects || [] },
        classes: { [Op.overlap]: [studentClass] },
        teaching_modes: { [Op.overlap]: class_modes || [] },
        languages: { [Op.overlap]: languages || [] },
      },
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
          required: !!studentLocation
        }
      ],
      order: [['created_at', 'DESC']],
    });

    return res.status(200).json({ recommendedTutors: tutors });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to fetch recommended tutors',
      error: error.message,
    });
  }
};

// 🧑‍🏫 For Tutors: Recommend Students
export const getRecommendedStudents = async (req, res) => {
  const userId = req.user.id;

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
      languages
    } = tutor;
    const tutorLocation = tutor.Location;

    // 2. Find matching students
    const students = await Student.findAll({
      where: {
        subjects: { [Op.overlap]: subjects || [] },
        class: { [Op.overlap]: classes || [] },
        class_modes: { [Op.overlap]: teaching_modes || [] },
        languages: { [Op.overlap]: languages || [] },
      },
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
          required: !!tutorLocation
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
