
//  src/controllers/admin.controller.js
import HttpStatus from 'http-status-codes';

import db from '../models/index.js';
import { Op } from 'sequelize';
import fs from 'fs';
import path from 'path';
import { sendNotification } from '../utils/notification.js';
import { differenceInDays } from 'date-fns';
import bcrypt from 'bcrypt';
import csv from 'csv-parser';
import XLSX from 'xlsx';
import { getPlaceDetailsFromGoogle } from '../utils/googlePlacesService.js';
const {
  User,
  Student,
  Tutor,
  Location,
  Enquiry,
  UserSubscription,
  SubscriptionPlan
} = db;

// Get all Students
export const getAllStudents = async (req, res) => {
  try {
    const students = await Student.findAll({
      attributes: [
        'user_id',
        'name',
        'class',
        'subjects',
        'profile_photo',
        'board',
        'availability',
        'hourly_charges',
        'start_timeline',
        'tutor_gender_preference',
        'createdAt',
        'updatedAt'
      ],
      include: [
        {
          model: User,
          attributes: ['id', 'email', 'mobile_number', 'is_active'],
          where: { is_active: true },   // ✅ Only active (verified) users
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

// Get all Tutors
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
        'introduction_text',
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
                  attributes: ['plan_name']
                }
              ]
            }
          ]
        },
        Location
      ]
    });

    const tutorList = tutors.map((tutor) => {
      const sub = tutor.User?.UserSubscriptions?.[0];
      let subscription_status = 'Unsubscribed';
      let plan_name = null;
      let days_remaining = null;

      if (sub) {
        subscription_status = 'Subscribed';
        plan_name = sub.SubscriptionPlan?.plan_name;
        days_remaining = differenceInDays(new Date(sub.end_date), new Date());
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

// Update Tutor Status (approve/reject)
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

// Delete User (and profile)
export const deleteUser = async (req, res) => {
  const { user_id } = req.params;

  try {
    const user = await User.findByPk(user_id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Delete profile and files
    if (user.role === 'student') {
      const student = await Student.findOne({ where: { user_id } });

      if (student) {
        if (student.profile_photo) {
          const photoPath = path.join(process.cwd(), student.profile_photo);
          if (fs.existsSync(photoPath)) fs.unlinkSync(photoPath);
        }
        await student.destroy();
      }
    } else if (user.role === 'tutor') {
      const tutor = await Tutor.findOne({ where: { user_id } });

      if (tutor) {
        if (tutor.profile_photo) {
          const photoPath = path.join(process.cwd(), tutor.profile_photo);
          if (fs.existsSync(photoPath)) fs.unlinkSync(photoPath);
        }

        if (tutor.documents && Array.isArray(tutor.documents)) {
          for (const docPath of tutor.documents) {
            const fullPath = path.join(process.cwd(), docPath);
            if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
          }
        }
        await tutor.destroy();
      }
    }

    // Delete user subscriptions
    await UserSubscription.destroy({ where: { user_id } });

    // Delete enquiries (your enquiry model uses sender_id/receiver_id)
    await Enquiry.destroy({
      where: { [Op.or]: [{ sender_id: user_id }, { receiver_id: user_id }] }
    });

    //  Skip ContactLog since it's not defined in db
    // await db.ContactLog.destroy({
    //   where: { [Op.or]: [{ viewer_id: user_id }, { target_id: user_id }] }
    // });

    // Delete notifications
    await db.Notification.destroy({ where: { user_id } });

    // Finally, delete the user
    await user.destroy();

    return res.status(200).json({ message: 'User, profile, and all related data deleted successfully' });
  } catch (err) {
    console.error('Delete user error:', err);
    return res.status(500).json({ message: 'Failed to delete user', error: err.message });
  }
};

// Block / Unblock User
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

// Update Student (extended)
export const updateStudentByAdmin = async (req, res) => {
  const { user_id } = req.params;
  const {
    name,
    class: studentClass,
    subjects,
    class_modes,
    languages,
    school_name,
    sms_alerts,
    board,
    availability,
    start_timeline,
    tutor_gender_preference,
    hourly_charges,
    profile_photo
  } = req.body;

  try {
    const student = await Student.findOne({ where: { user_id } });
    if (!student) return res.status(404).json({ message: 'Student not found' });

    await student.update({
      name,
      class: studentClass,
      subjects,
      class_modes,
      languages,
      school_name,
      sms_alerts,
      board,
      availability,
      start_timeline,
      tutor_gender_preference,
      hourly_charges,
      profile_photo
    });

    return res.status(200).json({ message: 'Student updated successfully', student });
  } catch (err) {
    return res.status(500).json({ message: 'Update failed', error: err.message });
  }
};

// Update Tutor (extended)
export const updateTutorByAdmin = async (req, res) => {
  const { user_id } = req.params;
  const {
    name,
    subjects,
    classes,
    degrees,
    profile_status,
    languages,
    experience,
    pricing_per_hour,
    teaching_modes,
     introduction_text,
    introduction_video,
    documents,
    profile_photo
  } = req.body;

  try {
    const tutor = await Tutor.findOne({ where: { user_id } });
    if (!tutor) return res.status(404).json({ message: 'Tutor not found' });

    await tutor.update({
      name,
      subjects,
      classes,
      degrees,
      profile_status,
      languages,
      experience,
      pricing_per_hour,
      teaching_modes,
       introduction_text,
      introduction_video,
      documents,
      profile_photo
    });

    return res.status(200).json({ message: 'Tutor updated successfully', tutor });
  } catch (err) {
    return res.status(500).json({ message: 'Update failed', error: err.message });
  }
};

// Admin Dashboard Summary
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
    console.error('Dashboard error:', error);
    res.status(500).json({ message: 'Failed to load dashboard data', error: error.message });
  }
};

// Get all pending tutor verifications
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

// Verify Tutor Profile (approve/reject)
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

// Admin delete user profile photo (student/tutor)
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

//  Contact logs
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


// Templates that should use formatted content

const templatesWithFormatting = [
  'general',
  'ImportantUpdate',
  'subscriptionReminder',
  'enquiryReceived'
];

// Format message content based on role + template
const generateRoleBasedContent = (role, content, template_name, formatted) => {
  const name = role === 'tutor' ? 'Tutor' : 'Student';

  const useFormatted = typeof formatted === 'boolean'
    ? formatted
    : templatesWithFormatting.includes(template_name);

  if (useFormatted) {
    return { ...content, name };
  }

  const greeting = `Dear ${name},`;
  return {
    ...content,
    message: `${greeting}\n\n${content.message}\n\nStay connected and keep learning!\n\nRegards,\nTeam Dronacharya`
  };
};

// Helper: get recipient based on notification type
const getRecipient = (user, type) => {
  switch (type) {
    case 'email':
      return user.email;
    case 'sms':
      return user.mobile_number; // use correct DB field
    case 'whatsapp': {
      let to = user.mobile_number; //not user.mobile
      if (!to) return null;
      if (!to.startsWith('+')) {
        to = `+91${to}`; // default India country code
      }
      return to;
    }
    default:
      return null;
  }
};



//  Send message/alert to single user
//  Single message to a user
export const sendUserMessage = async (req, res) => {
  const { user_id, name, type, template_name, content, formatted } = req.body;
  const senderId = req.user?.id;

  try {
    let user;

    if (user_id) {
      // fetch by ID
      user = await db.User.findByPk(user_id);
    } else if (name) {
      //  fetch by name
      user = await db.User.findOne({ where: { name } });
    } else {
      return res.status(400).json({ message: 'Either user_id or name is required' });
    }

    const senderUser = await db.User.findByPk(senderId);

    if (!user || !['tutor', 'student'].includes(user.role)) {
      return res.status(404).json({ message: 'User not found or invalid role' });
    }

    const recipient = getRecipient(user, type);
    if (!recipient) {
      return res.status(400).json({ message: `User does not have a valid ${type} recipient` });
    }

    const roleBasedContent = generateRoleBasedContent(
      user.role,
      content,
      template_name,
      formatted
    );

    const notification = await db.Notification.create({
      user_id: user.id, // always store the real ID in DB
      type,
      template_name,
      recipient,
      content: roleBasedContent,
      status: 'pending',
      sent_by: senderId,
      sent_by_role: senderUser?.role || 'admin-system'
    });

    await sendNotification({
      type,
      recipient,
      subject: template_name,
      template_name,
      params: roleBasedContent
    });

    notification.status = 'sent';
    notification.sent_at = new Date();
    await notification.save();

    res.status(200).json({
      message: `${type} sent to ${user.role}`,
      notification: {
        ...notification.toJSON(),
        sent_by_role: senderUser?.role || 'admin-system',
        user_name: user.name || `${user.first_name} ${user.last_name}`
      }
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ message: 'Failed to send message', error: error.message });
  }
};


// Bulk send to tutors or students with filters
export const sendBulkUserMessage = async (req, res) => {
  const { role, type, template_name, content, formatted, filter = {} } = req.body;
  const senderId = req.user?.id;

  try {
    if (!['tutor', 'student'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role. Must be tutor or student' });
    }

    const senderUser = await db.User.findByPk(senderId);

    const userWhere = { role, is_active: true };
    const includeModel = role === 'tutor' ? db.Tutor : db.Student;

    // normalize filters (array fields)
    const normalizeArrayFields = [
      'classes', 'subjects', 'teaching_modes', 'languages',
      'board', 'availability', 'tutor_gender_preference'
    ];
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
      const recipient = getRecipient(user, type);
      if (!recipient) continue; // skip if user doesn’t have valid contact

      const roleBasedContent = generateRoleBasedContent(
        user.role,
        content,
        template_name,
        formatted
      );

      await db.Notification.create({
        user_id: user.id,
        type,
        template_name,
        recipient,
        content: roleBasedContent,
        status: 'sent',
        sent_at: new Date(),
        sent_by: senderId,
        sent_by_role: senderUser?.role || 'admin-system'
      });

      await sendNotification({
        type,
        recipient,
        subject: template_name,
        template_name,
        params: roleBasedContent
      });

      sentTo.push({ id: user.id, recipient });
    }

    res.status(200).json({
      message: `Message sent to ${sentTo.length} ${role}${sentTo.length > 1 ? 's' : ''}`,
      recipients: sentTo,
      sent_by_role: senderUser?.role || 'admin-system'
    });
  } catch (err) {
    console.error('Bulk message error:', err);
    res.status(500).json({ message: 'Bulk message failed', error: err.message });
  }
};

export const createTutorByAdmin = async (req, res) => {
  const {
    name,
    email,
    mobile_number,
    subjects,
    classes,
    degrees,
    profile_status,
    profile_photo,
    languages,
    experience,
    pricing_per_hour,
    introduction_text,
    teaching_modes,
    introduction_video,
    documents,
    place_id,
    location_id,
    gender,
    tutor_gender_preference,
    board,
    availability,
    degree_status,
    school_name
  } = req.body;

  try {
    const defaultPassword = "Tutor@123";
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    let finalLocationId = location_id || null;

    // ✅ Handle Google place_id
    if (place_id) {
      let location = await db.Location.findOne({ where: { place_id } });
      if (!location) {
        const details = await getPlaceDetailsFromGoogle(place_id);
        location = await db.Location.create(details);
      }
      finalLocationId = location.id;
    }

    // ✅ Check existing user
    let user = await db.User.findOne({
      where: { [Op.or]: [{ email }, { mobile_number }] },
    });

    if (user) {
      // Update user
      await user.update({
        name,
        email,
        mobile_number,
        is_active: true,
      });

      // Update tutor profile if exists
      let tutor = await db.Tutor.findOne({ where: { user_id: user.id } });
      if (tutor) {
        await tutor.update({
          name,
          subjects,
          classes,
          degrees,
          profile_status: profile_status || tutor.profile_status,
          profile_photo,
          languages,
          experience,
          pricing_per_hour,
          introduction_text,
          teaching_modes,
          introduction_video,
          documents,
          location_id: finalLocationId,
          gender,
          tutor_gender_preference,
          board,
          availability,
          degree_status,
          school_name
        });

        const fullTutor = await db.Tutor.findOne({ where: { user_id: user.id } });
        return res.status(200).json({
          message: "Tutor updated successfully",
          user,
          tutor: fullTutor,
        });
      }

      // Create new tutor profile
      const newTutor = await db.Tutor.create({
        user_id: user.id,
        name,
        subjects,
        classes,
        degrees,
        profile_status: profile_status || "approved",
        profile_photo,
        languages,
        experience,
        pricing_per_hour,
        introduction_text,
        teaching_modes,
        introduction_video,
        documents,
        location_id: finalLocationId,
        gender,
        tutor_gender_preference,
        board,
        availability,
        degree_status,
        school_name
      });

      const fullTutor = await db.Tutor.findOne({ where: { user_id: newTutor.user_id } });
      return res.status(201).json({
        message: "Tutor profile created for existing user",
        user,
        tutor: fullTutor,
      });
    }

    // Create new user + tutor
    user = await db.User.create({
      name,
      email,
      mobile_number,
      role: "tutor",
      password_hash: hashedPassword,
      is_active: true,
    });

    const tutor = await db.Tutor.create({
      user_id: user.id,
      name,
      subjects,
      classes,
      degrees,
      profile_status: profile_status || "approved",
      profile_photo,
      languages,
      experience,
      pricing_per_hour,
      introduction_text,
      teaching_modes,
      introduction_video,
      documents,
      location_id: finalLocationId,
      gender,
      tutor_gender_preference,
      board,
      availability,
      degree_status,
      school_name
    });

    const fullTutor = await db.Tutor.findOne({ where: { user_id: tutor.user_id } });

    return res.status(201).json({
      message: "Tutor created successfully by Admin",
      user,
      tutor: fullTutor,
      defaultPassword,
    });
  } catch (error) {
    console.error("❌ Create/Update tutor error:", error);
    return res.status(500).json({
      message: "Failed to create or update tutor",
      error: error.message,
    });
  }
};



export const bulkUploadTutors = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const filePath = req.file.path;
    const originalName = req.file.originalname.toLowerCase();
    let tutors = [];

    // 1️Excel (.xlsx / .xls)
    if (originalName.endsWith('.xlsx') || originalName.endsWith('.xls')) {
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      tutors = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
    }
    // 2️CSV
    else if (originalName.endsWith('.csv')) {
      const rows = [];
      await new Promise((resolve, reject) => {
        fs.createReadStream(filePath)
          .pipe(csv())
          .on('data', (row) => rows.push(row))
          .on('end', () => {
            tutors = rows;
            resolve();
          })
          .on('error', reject);
      });
    }
    // 3️⃣ Unsupported file type
    else {
      return res
        .status(400)
        .json({ message: 'Unsupported file format. Use CSV or Excel.' });
    }

    // 🔧 Normalize helper
    const normalizeArray = (val) => {
      if (!val) return [];
      if (Array.isArray(val)) return val;
      return String(val)
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
    };

    let createdCount = 0;
    const defaultPassword = 'Tutor@123';
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    for (const row of tutors) {
      // Handle location
      let location_id = null;
      if (row.place_id) {
        const locationDetails = await getPlaceDetailsFromGoogle(row.place_id);
        const [loc] = await db.Location.upsert(
          { place_id: row.place_id, ...locationDetails },
          { returning: true }
        );
        location_id = loc.id;
      } else if (row.location_id) {
        location_id = row.location_id; // direct id
      }

      // Create User
      const [user] = await db.User.findOrCreate({
        where: { email: row.email },
        defaults: {
          name: row.name,
          email: row.email,
          mobile_number: row.mobile_number,
          role: 'tutor',
          password_hash: hashedPassword,
          is_active: true,
        },
      });

      // Create Tutor
      const [tutor, tutorCreated] = await db.Tutor.findOrCreate({
        where: { user_id: user.id },
        defaults: {
          name: row.name,
          subjects: normalizeArray(row.subjects),
          classes: normalizeArray(row.classes),
          degrees: normalizeArray(row.degrees),
          profile_status: row.profile_status || 'approved',
          profile_photo: row.profile_photo,
          languages: normalizeArray(row.languages),
          experience: row.experience,
          pricing_per_hour: row.pricing_per_hour,
          introduction_text: row.introduction_text,
          teaching_modes: normalizeArray(row.teaching_modes),
          introduction_video: row.introduction_video,
          documents: normalizeArray(row.documents),
          location_id, // added
        },
      });

      if (tutorCreated) createdCount++;
    }

    //  Cleanup
    fs.unlink(filePath, (err) => {
      if (err) console.error('Failed to delete temp file:', err);
    });

    return res.json({
      message: 'Bulk tutors uploaded successfully',
      count: createdCount,
      defaultPassword,
    });
  } catch (error) {
    console.error('Bulk upload error:', error);
    return res
      .status(500)
      .json({ message: 'Bulk upload failed', error: error.message });
  }
};

export const getStudentEnquiries = async (req, res) => {
  try {
    const enquiries = await Student.findAll({
      include: [
        {
          model: User,
          attributes: ["id", "name", "email", "mobile_number", "is_active"],
          required: false,
        },
        {
          model: Location,
          attributes: ["id", "country", "state", "city", "pincode"],
        },
      ],
      order: [["created_at", "DESC"]],
    });

    // Count total enquiries & verified enquiries
    const enquiryCountMap = {};
    const verifiedCountMap = {};

    enquiries.forEach((student) => {
      const key = student.user_id || `guest-${student.mobile_number || student.name}`;
      enquiryCountMap[key] = (enquiryCountMap[key] || 0) + 1;

      if (student.User && student.User.is_active) {
        verifiedCountMap[key] = (verifiedCountMap[key] || 0) + 1;
      }
    });

    // ✅ Format response
    const formatted = enquiries.map((student) => {
      const key = student.user_id || `guest-${student.mobile_number || student.name}`;
      const totalEnquiries = enquiryCountMap[key];
      const verifiedEnquiries = verifiedCountMap[key] || 0;

      // ✅ Determine user status
      let status = "not registered";
      if (student.User) {
        if (student.User.is_active) status = "verified";
        else if (!student.User.is_active && totalEnquiries > 1)
          status = "resent"; // <-- unverified but sent again
        else status = "pending";
      }

      return {
        id: student.id,
        name: student.name,
        class: student.class,
        subjects: student.subjects,
        board: student.board,
        availability: student.availability,
        start_timeline: student.start_timeline,
        class_modes: student.class_modes,
        tutor_gender_preference: student.tutor_gender_preference,
        hourly_charges: student.hourly_charges,
        profile_photo: student.profile_photo,
        languages: student.languages,
        school_name: student.school_name,
        sms_alerts: student.sms_alerts,
        created_at: student.created_at,
        updated_at: student.updated_at,
        enquiry_count: totalEnquiries,
        verified_enquiry_count: verifiedEnquiries,
        user: student.User
          ? {
              id: student.User.id,
              name: student.User.name,
              email: student.User.email,
              mobile_number: student.User.mobile_number,
              status, // ✅ pending / verified / resent
            }
          : {
              status: "not registered",
              email: student.email || null,
              mobile_number: student.mobile_number || null,
            },
        location: student.Location
          ? {
              country: student.Location.country,
              state: student.Location.state,
              city: student.Location.city,
              pincode: student.Location.pincode,
            }
          : null,
      };
    });

    return res.status(HttpStatus.OK).json(formatted);
  } catch (err) {
    console.error("Get Student Enquiries Error:", err);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      message: "Failed to fetch student enquiries",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

export const deleteStudentEnquiry = async (req, res) => {
  try {
    const { enquiryId } = req.params; // from URL

    // Check if enquiry exists
    const enquiry = await db.Student.findByPk(enquiryId);

    if (!enquiry) {
      return res.status(404).json({ message: "Enquiry not found" });
    }

    // Delete the enquiry
    await enquiry.destroy();

    return res.status(200).json({
      message: `Enquiry with ID ${enquiryId} deleted successfully`,
    });
  } catch (error) {
    console.error("Delete Student Enquiry Error:", error);
    return res.status(500).json({
      message: "Failed to delete enquiry",
      error: error.message,
    });
  }
};


// Create Student by Admin
// Create Student by Admin (final JSON version)
export const createStudentByAdmin = async (req, res) => {
  const {
    name,
    email,
    mobile_number,
    class: studentClass,
    subjects,
    class_modes,
    languages,
    school_name,
    sms_alerts,
    board,
    availability,
    start_timeline,
    tutor_gender_preference,
    hourly_charges,
    profile_photo,
    place_id,
    location_id
  } = req.body;

  try {
    let finalLocationId = location_id || null;

    // Handle Google place_id
    if (place_id) {
      let location = await db.Location.findOne({ where: { place_id } });
      if (!location) {
        const details = await getPlaceDetailsFromGoogle(place_id);
        location = await db.Location.create(details);
      }
      finalLocationId = location.id;
    }

    // Default password (for login)
    const defaultPassword = "Student@123";
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    // Check existing user
    const existingUser = await db.User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ message: `User with email ${email} already exists` });
    }

    // Create new user
    const user = await db.User.create({
      name,
      email,
      mobile_number,
      role: "student",
      password_hash: hashedPassword,
      is_active: true
    });

    // Helper for array normalization
    const normalizeArray = (val) => {
      if (!val) return [];
      if (Array.isArray(val)) return val;
      if (typeof val === 'string') {
        return val.split(',').map((v) => v.trim()).filter(Boolean);
      }
      return [];
    };

    // Normalize languages → must be an array of JSON
    const normalizeLanguages = (val) => {
      if (!val) return [];
      if (Array.isArray(val)) {
        return val.map((v) =>
          typeof v === 'string' ? { language: v, proficiency: 'Unknown' } : v
        );
      }
      if (typeof val === 'string') {
        // comma-separated list
        return val.split(',').map((lang) => ({
          language: lang.trim(),
          proficiency: 'Unknown'
        }));
      }
      return [];
    };

    // Create student profile
    const student = await db.Student.create({
      user_id: user.id,
      name,
      class: studentClass,
      subjects: normalizeArray(subjects),
      class_modes: normalizeArray(class_modes),
      languages: normalizeLanguages(languages),
      school_name,
      sms_alerts,
      board,
      availability: normalizeArray(availability),
      start_timeline,
      tutor_gender_preference,
      hourly_charges,
      profile_photo,
      location_id: finalLocationId
    });

    return res.status(201).json({
      message: "Student created successfully by Admin",
      user,
      student,
      defaultPassword
    });
  } catch (error) {
    console.error(" Create student error:", error);
    return res.status(500).json({
      message: "Failed to create student",
      error: error.message
    });
  }
};

export const bulkUploadStudents = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const filePath = req.file.path;
    const originalName = req.file.originalname.toLowerCase();
    let students = [];

    // Read Excel or CSV
    if (originalName.endsWith(".xlsx") || originalName.endsWith(".xls")) {
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      students = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
    } else if (originalName.endsWith(".csv")) {
      const rows = [];
      await new Promise((resolve, reject) => {
        fs.createReadStream(filePath)
          .pipe(csv())
          .on("data", (row) => rows.push(row))
          .on("end", () => {
            students = rows;
            resolve();
          })
          .on("error", reject);
      });
    } else {
      return res.status(400).json({ message: "Unsupported file format. Use Excel or CSV." });
    }

    // Helper functions
    const normalizeArray = (val) => {
      if (!val) return [];
      if (Array.isArray(val)) return val;
      if (typeof val === "string")
        return val.split(",").map((s) => s.trim()).filter(Boolean);
      return [];
    };

    const normalizeLanguages = (val) => {
      if (!val) return [];
      if (Array.isArray(val)) {
        return val.map((v) =>
          typeof v === "string" ? { language: v, proficiency: "Unknown" } : v
        );
      }
      if (typeof val === "string") {
        return val.split(",").map((lang) => ({
          language: lang.trim(),
          proficiency: "Unknown",
        }));
      }
      return [];
    };

    const defaultPassword = "Student@123";
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);
    let createdCount = 0;
    let skippedCount = 0;
    let updatedCount = 0;

    for (const row of students) {
      try {
        let finalLocationId = row.location_id || null;

        // Handle Google Place ID
        if (row.place_id) {
          let location = await db.Location.findOne({ where: { place_id: row.place_id } });
          if (!location) {
            const details = await getPlaceDetailsFromGoogle(row.place_id);
            location = await db.Location.create(details);
          }
          finalLocationId = location.id;
        }

        // Check if user already exists (by email OR mobile_number)
        let existingUser = await db.User.findOne({
          where: {
            [Op.or]: [
              { email: row.email },
              { mobile_number: row.mobile_number },
            ],
          },
        });

        let user;
        if (existingUser) {
          user = existingUser;
          updatedCount++;
        } else {
          user = await db.User.create({
            name: row.name,
            email: row.email,
            mobile_number: row.mobile_number,
            role: "student",
            password_hash: hashedPassword,
            is_active: true,
          });
          createdCount++;
        }

        // ✅ Check if student already exists
        const existingStudent = await db.Student.findOne({ where: { user_id: user.id } });
        if (existingStudent) {
          await existingStudent.update({
            name: row.name || existingStudent.name,
            class: row.class || existingStudent.class,
            subjects: normalizeArray(row.subjects),
            class_modes: normalizeArray(row.class_modes),
            languages: normalizeLanguages(row.languages),
            school_name: row.school_name,
            sms_alerts: row.sms_alerts === "true" || row.sms_alerts === true,
            board: row.board,
            availability: normalizeArray(row.availability),
            start_timeline: row.start_timeline,
            tutor_gender_preference: row.tutor_gender_preference,
            hourly_charges: row.hourly_charges,
            profile_photo: row.profile_photo,
            location_id: finalLocationId,
          });
        } else {
          await db.Student.create({
            user_id: user.id,
            name: row.name,
            class: row.class,
            subjects: normalizeArray(row.subjects),
            class_modes: normalizeArray(row.class_modes),
            languages: normalizeLanguages(row.languages),
            school_name: row.school_name,
            sms_alerts: row.sms_alerts === "true" || row.sms_alerts === true,
            board: row.board,
            availability: normalizeArray(row.availability),
            start_timeline: row.start_timeline,
            tutor_gender_preference: row.tutor_gender_preference,
            hourly_charges: row.hourly_charges,
            profile_photo: row.profile_photo,
            location_id: finalLocationId,
          });
        }
      } catch (err) {
        console.error(`Skipped student ${row.name} due to:`, err.message);
        skippedCount++;
        continue; // continue processing others
      }
    }

    fs.unlink(filePath, () => {}); // cleanup file

    return res.status(200).json({
      message: "Bulk upload completed",
      createdCount,
      updatedCount,
      skippedCount,
      defaultPassword,
    });
  } catch (error) {
    console.error("Bulk upload student error:", error);
    return res.status(500).json({
      message: "Bulk upload failed",
      error: error.message,
    });
  }
};
