// ================================
// 📁 src/controllers/admin.controller.js
// ================================

import db from '../models/index.js';
import { Op } from 'sequelize';
import fs from 'fs';
import path from 'path';

const {
  User,
  Student,
  Tutor,
  Location,
  Enquiry,
  UserSubscription,
  SubscriptionPlan
} = db;

// 🧑‍🎓 Get all Students
export const getAllStudents = async (req, res) => {
  try {
    const students = await Student.findAll({
      attributes: ['user_id', 'name', 'class', 'subjects', 'profile_photo'], // 🆕 include photo
      include: [
        { model: User, attributes: ['id', 'email', 'mobile_number', 'is_active'] },
        Location
      ]
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
      attributes: [
        'user_id',
        'name',
        'subjects',
        'classes',
        'degrees',
        'profile_status',
        'profile_photo',
        'languages',
        'experience',
        'pricing_per_hour',
        'teaching_modes',
        'introduction_video',
        'documents',
        'createdAt',
        'updatedAt'
      ],
      include: [
        { model: User, attributes: ['id', 'email', 'mobile_number', 'is_active'] },
        Location
      ]
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

// 📊 Admin Dashboard Summary
export const getDashboardSummary = async (req, res) => {
  try {
    const totalStudents = await Student.count();
    const totalTutors = await Tutor.count({ where: { profile_status: 'approved' } });
    const totalSubscriptions = await UserSubscription.count({ where: { is_active: true } });
    const totalEnquiries = await Enquiry.count();

    const recentTutors = await Tutor.findAll({
      include: [{ model: User, attributes: ['email', 'created_at'] }],
      order: [['created_at', 'DESC']],
      limit: 5
    });

    const recentStudents = await Student.findAll({
      include: [{ model: User, attributes: ['email', 'created_at'] }],
      order: [['created_at', 'DESC']],
      limit: 5
    });

    const recentSubscriptions = await UserSubscription.findAll({
      include: [
        { model: User, attributes: ['email', 'role'] },
        { model: SubscriptionPlan, attributes: ['plan_name', 'price'] }
      ],
      order: [['created_at', 'DESC']],
      limit: 5
    });

    res.status(200).json({
      totalStudents,
      totalTutors,
      totalSubscriptions,
      totalEnquiries,
      recentTutors,
      recentStudents,
      recentSubscriptions
    });
  } catch (error) {
    console.error('❌ Dashboard error:', error);
    res.status(500).json({ message: 'Failed to load dashboard data', error: error.message });
  }
};

// 🕵️ Get all pending tutor verifications
export const getPendingVerifications = async (req, res) => {
  try {
    const pendingTutors = await db.Tutor.findAll({
      where: { profile_status: 'pending' },
      include: [{ model: db.User, attributes: ['email'] }]
    });

    res.status(200).json({ pendingTutors });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch pending verifications', error: error.message });
  }
};

// ✅ Verify Tutor Profile (approve/reject)
export const verifyTutorProfile = async (req, res) => {
  const { user_id } = req.params;
  const { action } = req.body;

  if (!['approved', 'rejected'].includes(action)) {
    return res.status(400).json({ message: 'Invalid action. Must be "approved" or "rejected"' });
  }

  try {
    const tutor = await db.Tutor.findOne({ where: { user_id } });
    if (!tutor) return res.status(404).json({ message: 'Tutor not found' });

    tutor.profile_status = action;
    await tutor.save();

    return res.status(200).json({ message: `Tutor has been ${action}` });
  } catch (error) {
    res.status(500).json({ message: 'Verification failed', error: error.message });
  }
};

// 🧹 Admin delete user profile photo (student/tutor)
export const adminDeleteProfilePhoto = async (req, res) => {
  const { user_id, role } = req.params;

  if (!['student', 'tutor'].includes(role)) {
    return res.status(400).json({ message: 'Invalid role. Must be "student" or "tutor".' });
  }

  try {
    let profile;
    if (role === 'student') {
      profile = await Student.findOne({ where: { user_id } });
    } else {
      profile = await Tutor.findOne({ where: { user_id } });
    }

    if (!profile) {
      return res.status(404).json({ message: `${role} not found` });
    }

    const photoPath = profile.profile_photo;

    // Remove from DB
    await profile.update({ profile_photo: null });

    // Remove file from disk
    if (photoPath) {
      const fullPath = path.join(process.cwd(), photoPath);
      if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    }

    res.status(200).json({ message: 'Profile photo deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete profile photo', error: error.message });
  }
};

// src/controllers/admin.controller.js
export const getContactLogs = async (req, res) => {
  try {
    const logs = await db.ContactLog.findAll({
      include: [
        { model: db.User, as: 'Viewer', attributes: ['id', 'email', 'role'] },
        { model: db.User, as: 'Target', attributes: ['id', 'email', 'role'] },
      ],
      order: [['timestamp', 'DESC']]
    });

    return res.status(200).json({ logs });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to fetch contact logs', error: err.message });
  }
};
