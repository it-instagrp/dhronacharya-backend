// src/controllers/tutor.controller.js

import db from '../models/index.js';
const { User, Tutor } = db;

// ✅ Get All Approved Tutors
export const getAllTutors = async (req, res) => {
  try {
    const tutors = await User.findAll({
      where: { role: 'tutor', is_active: true },
      include: [{ model: Tutor, where: { profile_status: 'approved' } }],
      attributes: ['id', 'email', 'mobile_number']
    });

    res.status(200).json({ tutors });
  } catch (error) {
    console.error('Failed to fetch tutors:', error);
    res.status(500).json({ message: 'Failed to fetch tutors', error: error.message });
  }
};
