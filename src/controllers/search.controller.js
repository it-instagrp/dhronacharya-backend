import db from '../models/index.js';
import { Op } from 'sequelize';

const { Student, Tutor, User, Location } = db;

// 🧑‍🎓 Fetch Students with Filters (Fixed)
export const getStudents = async (req, res) => {
  try {
    let { subjects, classes, location } = req.query;
    const whereConditions = {};

    if (subjects) {
      if (!Array.isArray(subjects)) subjects = [subjects];
      whereConditions.subjects = { [Op.overlap]: subjects };
    }

    if (classes) {
      if (!Array.isArray(classes)) classes = [classes];
      whereConditions.class = { [Op.overlap]: classes };
    }

    const locationFilter = location ? {
      [Op.or]: [
        { city: { [Op.iLike]: `%${location}%` } },
        { state: { [Op.iLike]: `%${location}%` } },
        { country: { [Op.iLike]: `%${location}%` } }
      ]
    } : {};

    const students = await Student.findAll({
      where: whereConditions,
      include: [
        { model: User, attributes: ['id', 'email', 'mobile_number', 'is_active'] },
        { model: Location, where: locationFilter, required: !!location }
      ],
      order: [['created_at', 'DESC']]
    });

    // ✅ Not Found Check
    if (!students || students.length === 0) {
  return res.status(200).json({ students: [] }); // Instead of 404
}


    return res.status(200).json({ students });
  } catch (err) {
    console.error('❌ Failed to fetch students:', err);
    return res.status(500).json({ message: 'Failed to fetch students', error: err.message });
  }
};

// 🧑‍🏫 Fetch Tutors with Filters (Fixed)
export const getTutors = async (req, res) => {
  try {
    let { subjects, classes, location, profile_status = 'approved' } = req.query;

    const whereConditions = { profile_status };

    // ✅ Subjects handling
    if (subjects) {
      if (!Array.isArray(subjects)) subjects = [subjects];
      whereConditions.subjects = { [Op.overlap]: subjects };
    }

    // ✅ Classes handling
    if (classes) {
      if (!Array.isArray(classes)) classes = [classes];
      whereConditions.classes = { [Op.overlap]: classes };
    }

    // ✅ Location handling (city, state, country)
    const locationFilter = location ? {
      [Op.or]: [
        { city: { [Op.iLike]: `%${location}%` } },
        { state: { [Op.iLike]: `%${location}%` } },
        { country: { [Op.iLike]: `%${location}%` } }
      ]
    } : {};

    const tutors = await Tutor.findAll({
      where: whereConditions,
      include: [
        { model: User, attributes: ['id', 'email', 'mobile_number', 'is_active'] },
        { model: Location, where: locationFilter, required: !!location }
      ],
      order: [['created_at', 'DESC']]
    });

    return res.status(200).json({ tutors });
  } catch (err) {
    console.error('❌ Failed to fetch tutors:', err);
    return res.status(500).json({ message: 'Failed to fetch tutors', error: err.message });
  }
};
