// ================================
// 📁 src/controllers/admin.controller.js
// ================================

import db from '../models/index.js';
import { Op } from 'sequelize';
import fs from 'fs';
import path from 'path';
import { sendNotification } from '../utils/notification.js';
import { differenceInDays } from 'date-fns';
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
      attributes: ['user_id', 'name', 'class', 'subjects', 'profile_photo'],
      include: [
        {
          model: User,
          attributes: ['id', 'email', 'mobile_number', 'is_active'],
          include: [
            {
              model: UserSubscription,
              where: { is_active: true },
              required: false,
              include: [
                {
                  model: SubscriptionPlan,
                  attributes: ['plan_name']
                }
              ]
            }
          ]
        },
        Location
      ]
    });

    const studentList = students.map((student) => {
      const sub = student.User?.UserSubscriptions?.[0];

      let subscription_status = 'Unsubscribed';
      let plan_name = null;
      let days_remaining = null;

      if (sub) {
        subscription_status = 'Subscribed';
        plan_name = sub.SubscriptionPlan?.plan_name || null;
        days_remaining = differenceInDays(new Date(sub.end_date), new Date());
      }

      return {
        ...student.toJSON(),
        subscription_status,
        plan_name,
        days_remaining
      };
    });

    res.json({ students: studentList });
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
        {
          model: User,
          attributes: ['id', 'email', 'mobile_number', 'is_active'],
          include: [
            {
              model: UserSubscription,
              where: { is_active: true },
              required: false,
              include: [
                {
                  model: SubscriptionPlan,
                  attributes: ['plan_name'] // ❌ Remove `end_date` here
                }
              ]
            }
          ]
        },
        Location
      ]
    });

    const tutorList = tutors.map((tutor) => {
      const sub = tutor.User?.UserSubscriptions?.[0]; // since it's hasMany
      let subscription_status = 'Unsubscribed';
      let plan_name = null;
      let days_remaining = null;

      if (sub) {
        subscription_status = 'Subscribed';
        plan_name = sub.SubscriptionPlan?.plan_name;
        days_remaining = differenceInDays(new Date(sub.end_date), new Date()); // ✅ Correct
      }

      return {
        ...tutor.toJSON(),
        subscription_status,
        plan_name,
        days_remaining
      };
    });

    res.json({ tutors: tutorList });
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


// ✅ Send message/alert to a single user (tutor or student)
export const sendUserMessage = async (req, res) => {
  const { user_id, type, template_name, content } = req.body;
  const senderId = req.user?.id;

  try {
    const [user, senderUser] = await Promise.all([
      db.User.findByPk(user_id),
      db.User.findByPk(senderId),
    ]);

    if (!user || !['tutor', 'student'].includes(user.role)) {
      return res.status(404).json({ message: 'User not found or invalid role' });
    }

    const senderRole = senderUser?.role || 'admin-system';

    const notification = await db.Notification.create({
      user_id,
      type,
      template_name,
      recipient: user.email || user.mobile_number,
      content,
      status: 'pending',
      sent_by: senderRole // ⬅️ Use role instead of ID
    });

    await sendNotification({
      type,
      recipient: user.email || user.mobile_number,
      subject: template_name,
      template_name,
      params: content
    });

    notification.status = 'sent';
    notification.sent_at = new Date();
    await notification.save();

    res.status(200).json({
      message: `${type} sent to ${user.role}`,
      notification: {
        ...notification.toJSON(),
        sent_by: senderRole
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to send message', error: error.message });
  }
};


// ✅ Bulk send to tutors or students based on role and optional filter
// ✅ Bulk send to tutors or students based on role and optional filter
// ✅ Bulk send to tutors or students based on role and optional filter
export const sendBulkUserMessage = async (req, res) => {
  const { role, type, template_name, content, filter = {} } = req.body;
  const senderId = req.user?.id;

  try {
    if (!['tutor', 'student'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role. Must be tutor or student' });
    }

    const senderUser = await db.User.findByPk(senderId);
    const senderRole = senderUser?.role || 'admin-system';

    const userWhere = { role, is_active: true };
    const includeModel = role === 'tutor' ? db.Tutor : db.Student;

    // 🛡️ Normalize potential array fields in filter (adjust field names as per DB)
    const normalizeArrayFields = ['classes', 'subjects', 'teaching_modes', 'languages'];
    for (const key of normalizeArrayFields) {
      if (filter[key] && !Array.isArray(filter[key])) {
        filter[key] = [filter[key]];
      }
    }

    const profileInclude = {
      model: includeModel,
      ...(Object.keys(filter).length ? { where: filter } : {}),
    };

    const users = await db.User.findAll({
      where: userWhere,
      include: [profileInclude],
    });

    if (!users.length) {
      return res.status(404).json({ message: 'No users found for given filter' });
    }

    const sentTo = [];

    for (const user of users) {
      await db.Notification.create({
        user_id: user.id,
        type,
        template_name,
        recipient: user.email || user.mobile_number,
        content,
        status: 'sent',
        sent_at: new Date(),
        sent_by: senderRole
      });

      await sendNotification({
        type,
        recipient: user.email || user.mobile_number,
        subject: template_name,
        template_name,
        params: content
      });

      sentTo.push({ id: user.id, email: user.email });
    }

    res.status(200).json({
      message: `✅ Message sent to ${sentTo.length} ${role}${sentTo.length > 1 ? 's' : ''}`,
      recipients: sentTo,
      sent_by: senderRole
    });
  } catch (err) {
    console.error('❌ Bulk message error:', err);
    res.status(500).json({ message: 'Bulk message failed', error: err.message });
  }
};
