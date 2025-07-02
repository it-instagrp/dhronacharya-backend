// ================================
// 📁 src/controllers/admin.controller.js
// ================================

import db from '../models/index.js';
const { User, Student, Tutor, Location } = db;

// 🧑‍🎓 Get all Students
export const getAllStudents = async (req, res) => {
  try {
    const students = await Student.findAll({
      include: [{ model: User, attributes: ['id', 'email', 'mobile_number', 'is_active'] }, Location]
    });
    res.json({ students });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch students', error: error.message });
  }
};

// 🧑‍🏫 Get all Tutors
export const getAllTutors = async (req, res) => {
  try {
    const tutors = await Tutor.findAll({
      include: [{ model: User, attributes: ['id', 'email', 'mobile_number', 'is_active'] }, Location]
    });
    res.json({ tutors });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch tutors', error: error.message });
  }
};

// ✅ Update Tutor Status (approve/reject)
export const updateTutorStatus = async (req, res) => {
  const { user_id } = req.params;
  const { profile_status } = req.body;

  if (!['approved', 'pending', 'rejected'].includes(profile_status)) {
    return res.status(400).json({ message: 'Invalid profile status' });
  }

  try {
    const tutor = await Tutor.findOne({ where: { user_id } });
    if (!tutor) return res.status(404).json({ message: 'Tutor not found' });

    tutor.profile_status = profile_status;
    await tutor.save();

    res.json({ message: `Tutor profile ${profile_status}` });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update tutor status', error: error.message });
  }
};

// ❌ Delete User (and profile)
export const deleteUser = async (req, res) => {
  const { user_id } = req.params;
  try {
    const user = await User.findByPk(user_id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (user.role === 'student') {
      await Student.destroy({ where: { user_id } });
    } else if (user.role === 'tutor') {
      await Tutor.destroy({ where: { user_id } });
    }

    await User.destroy({ where: { id: user_id } });

    return res.status(200).json({ message: 'User and profile deleted' });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to delete user', error: err.message });
  }
};

// 🔒 Block / Unblock User
export const blockUnblockUser = async (req, res) => {
  const { user_id } = req.params;
  const { is_active } = req.body;

  try {
    const user = await User.findByPk(user_id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.is_active = is_active;
    await user.save();

    return res.status(200).json({ message: `User has been ${is_active ? 'unblocked' : 'blocked'}` });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to update user status', error: err.message });
  }
};

// ✏️ Update Student
export const updateStudentByAdmin = async (req, res) => {
  const { user_id } = req.params;
  const { name, class: studentClass, subjects, preferred_modes } = req.body;

  try {
    const student = await Student.findOne({ where: { user_id } });
    if (!student) return res.status(404).json({ message: 'Student not found' });

    await student.update({ name, class: studentClass, subjects, preferred_modes });
    return res.status(200).json({ message: 'Student updated successfully', student });
  } catch (err) {
    return res.status(500).json({ message: 'Update failed', error: err.message });
  }
};

// ✏️ Update Tutor
export const updateTutorByAdmin = async (req, res) => {
  const { user_id } = req.params;
  const { name, subjects, classes, degrees, profile_status } = req.body;

  try {
    const tutor = await Tutor.findOne({ where: { user_id } });
    if (!tutor) return res.status(404).json({ message: 'Tutor not found' });

    await tutor.update({ name, subjects, classes, degrees, profile_status });
    return res.status(200).json({ message: 'Tutor updated successfully', tutor });
  } catch (err) {
    return res.status(500).json({ message: 'Update failed', error: err.message });
  }
};
