import HttpStatus from 'http-status-codes';
import db from '../models/index.js';
import logger from '../config/logger.js';
import fs from 'fs';
import path from 'path';
import { getPlaceDetailsFromGoogle } from '../utils/googlePlacesService.js';
import { differenceInDays } from 'date-fns';
import { Op, fn, col } from 'sequelize';

const { User, Tutor, Student, Location ,Review,ReviewComment} = db;

// 🔍 GET profile with subscription status
export const getProfile = async (req, res) => {
  const { user } = req;

  try {
    let profile;

    if (user.role === 'tutor') {
      // ✅ Tutor profile
      profile = await Tutor.findOne({
        where: { user_id: user.id },
        attributes: [
          'user_id',
          'name',
          'gender',
          'tutor_gender_preference',
          'subjects',
          'classes',
          'degrees',
          'board',
          'availability',
          'degree_status',
          'school_name',
          'introduction_video',
          'introduction_text',
          'profile_photo',
          'teaching_modes',
          'languages',
          'experience',
          'pricing_per_hour',
          'profile_status',
          'documents',
          'sms_alerts',
          'location_id',
          'created_at',
          'updated_at',
        ],
        include: [
          { model: User, attributes: ['id', 'email', 'mobile_number', 'is_active'] },
          Location,
        ],
      });

      if (profile) {
        // 🔹 Rating summary
        const summary = await Review.findAll({
          where: { tutor_id: profile.user_id, status: { [Op.ne]: 'deleted' } },
          attributes: [
            [fn('AVG', col('rating')), 'avgRating'],
            [fn('COUNT', col('id')), 'count'],
          ],
          raw: true,
        });

        profile.dataValues.average_rating = parseFloat(summary[0].avgRating || 0).toFixed(2);
        profile.dataValues.total_reviews = parseInt(summary[0].count || 0, 10);

        // 🔹 All reviews with comments
        const reviews = await Review.findAll({
          where: { tutor_id: profile.user_id, status: { [Op.ne]: 'deleted' } },
          include: [
            { model: User, as: 'Reviewer', attributes: ['id', 'name'] },
            {
              model: ReviewComment,
              as: 'comments',
              required: false, // show review even if no comments
              where: { status: 'visible' },
              include: [{ model: User, as: 'Commenter', attributes: ['id', 'name'] }],
            },
          ],
          order: [['created_at', 'DESC']],
        });

        profile.dataValues.reviews = reviews;
      }
    } else if (user.role === 'student') {
      // ✅ Student profile
      profile = await Student.findOne({
        where: { user_id: user.id },
        attributes: [
          'user_id',
          'name',
          'class',
          'subjects',
          'class_modes',
          'school_name',
          'sms_alerts',
          'languages',
          'location_id',
          'profile_photo',
          'board',
          'availability',
          'hourly_charges',
          'created_at',
          'updated_at',
        ],
        include: [
          { model: User, attributes: ['id', 'email', 'mobile_number', 'is_active'] },
          Location,
        ],
      });
    } else {
      return res.status(400).json({ message: 'Invalid user role' });
    }

    // ✅ Subscription info
    const subscription = await db.UserSubscription.findOne({
      where: { user_id: user.id, is_active: true },
      include: [{ model: db.SubscriptionPlan, attributes: ['plan_name'] }],
    });

    let subscriptionStatus = 'Unsubscribed';
    let planName = null;
    let remainingDays = null;

    if (subscription) {
      subscriptionStatus = 'Subscribed';
      planName = subscription.SubscriptionPlan?.plan_name || null;

      const today = new Date();
      const endDate = new Date(subscription.end_date);
      remainingDays = differenceInDays(endDate, today);

      if (remainingDays < 0) {
        subscriptionStatus = 'Expired';
        remainingDays = 0;
      }
    }

    return res.status(200).json({
      profile,
      subscription_status: subscriptionStatus,
      plan_name: planName,
      remaining_days: remainingDays,
    });
  } catch (err) {
    console.error('❌ Profile fetch error:', err);
    return res.status(500).json({ message: 'Failed to fetch profile', error: err.message });
  }
};

// 🌍 Update Location
export const updateLocation = async (req, res) => {
  const { user } = req;
  const { place_id } = req.body;
  try {
    const locationDetails = await getPlaceDetailsFromGoogle(place_id);
    const [location] = await Location.upsert({ place_id, ...locationDetails }, { returning: true });

    if (user.role === 'tutor') {
      await Tutor.update({ location_id: location.id }, { where: { user_id: user.id } });
    } else if (user.role === 'student') {
      await Student.update({ location_id: location.id }, { where: { user_id: user.id } });
    }

    return res.status(HttpStatus.OK).json({ message: 'Location updated successfully', location });
  } catch (err) {
    logger.error('Location update error:', err);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      message: 'Failed to update location',
      error: err.message
    });
  }
};

// ✏ Update Student Profile
export const updateStudentProfile = async (req, res) => {
  const {
    name,
    class: studentClass,
    subjects,
    class_modes,
    place_id,
    sms_alerts,
    languages,
    school_name,
    board,
    availability,
    hourly_charges,
    profile_photo
  } = req.body;

  const { id: user_id, role } = req.user;

  if (role !== 'student') {
    return res.status(403).json({ message: 'Only students can update this profile' });
  }

  try {
    let location = null;
    if (place_id) {
      const locationDetails = await getPlaceDetailsFromGoogle(place_id);
      const [loc] = await Location.upsert({ place_id, ...locationDetails }, { returning: true });
      location = loc;
    }

    let student = await Student.findOne({ where: { user_id } });

    const payload = {
      name,
      class: studentClass,
      subjects,
      class_modes,
      sms_alerts,
      languages,
      school_name,
      board,
      availability,
      hourly_charges,
      profile_photo,
      location_id: location?.id || student?.location_id || null
    };

    if (student) {
      await Student.update(payload, { where: { user_id } });
    } else {
      await Student.create({ user_id, ...payload });
    }

    const profile = await Student.findOne({
      where: { user_id },
      attributes: [
        'user_id', 'name', 'class', 'subjects', 'class_modes',
        'sms_alerts', 'languages', 'location_id', 'school_name',
        'board', 'availability', 'hourly_charges',
        'profile_photo', 'created_at', 'updated_at'
      ],
      include: [
        { model: User, attributes: ['id', 'email', 'mobile_number', 'is_active'] },
        Location
      ]
    });

    return res.status(200).json({ message: 'Student profile updated', profile });
  } catch (error) {
    return res.status(500).json({ message: 'Error saving student profile', error: error.message });
  }
};

// ✏ Update Tutor Profile
export const updateTutorProfile = async (req, res) => {
  const {
    name,
    gender,
    tutor_gender_preference,
    subjects,
    classes,
    degrees,
    board,
    availability,
    introduction_video,
    introduction_text,
    profile_photo,
    school_name,
    degree_status,
    teaching_modes,
    languages,
    experience,
    pricing_per_hour,
    documents,
    sms_alerts,
    place_id,
  } = req.body;

  const { id: user_id, role } = req.user;
  if (role !== 'tutor') {
    return res.status(403).json({ message: 'Only tutors can update this profile' });
  }

  try {
    // ✅ Handle Location
    let location = null;
    if (place_id) {
      const locationDetails = await getPlaceDetailsFromGoogle(place_id);
      const [loc] = await Location.upsert(
        { place_id, ...locationDetails },
        { returning: true }
      );
      location = loc;
    }

    // ✅ Build Payload
    const payload = {
      name,
      gender,
      tutor_gender_preference,
      subjects,
      classes,
      degrees,
      board,
      availability,
      introduction_video,
      introduction_text,
      profile_photo,
      school_name,
      degree_status,
      teaching_modes,
      languages,
      experience,
      pricing_per_hour,
      documents,
      sms_alerts,
      location_id: location?.id,
    };

    // ✅ Update or Create Tutor Profile
    let tutor = await Tutor.findOne({ where: { user_id } });

    if (!tutor) {
      tutor = await Tutor.create({ user_id, ...payload });
    } else {
      await Tutor.update(payload, { where: { user_id } });
    }

    // ✅ Return Updated Profile
    const profile = await Tutor.findOne({
      where: { user_id },
      include: [Location],
    });

    return res.status(200).json({ message: 'Tutor profile updated', profile });
  } catch (error) {
    console.error('❌ Error updating tutor profile:', error);
    return res.status(500).json({
      message: 'Error updating tutor profile',
      error: error.message,
    });
  }
};
// ✏ Update email or mobile number
export const updateProfileField = async (req, res) => {
  const { field, value } = req.body;
  const { id: user_id } = req.user;
  try {
    if (!['email', 'mobile_number'].includes(field)) {
      return res.status(400).json({ message: 'Invalid field to update' });
    }

    const user = await User.findByPk(user_id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user[field] = value;
    await user.save();
    return res.status(200).json({ message: `${field} updated successfully` });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to update field', error: err.message });
  }
};

// ❌ Delete Profile + User
export const deleteUserAndProfile = async (req, res) => {
  const { id: user_id, role } = req.user;
  try {
    if (role === 'student') {
      await Student.destroy({ where: { user_id } });
    } else if (role === 'tutor') {
      await Tutor.destroy({ where: { user_id } });
    }
    await User.destroy({ where: { id: user_id } });
    return res.status(200).json({ message: 'User and profile deleted successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to delete user', error: error.message });
  }
};

const BASE_URL = process.env.BASE_URL || 'http://15.206.81.98:3000';

// ✅ Upload/Update Profile Photo
export const updateProfilePhoto = async (req, res) => {
  const { user } = req;
  const file = req.file;
  if (!file) return res.status(400).json({ message: 'No file uploaded' });

  try {
    const photoPath = `${BASE_URL}/uploads/profile_photos/${file.filename}`;
    if (user.role === 'student') {
      await Student.update({ profile_photo: photoPath }, { where: { user_id: user.id } });
    } else if (user.role === 'tutor') {
      await Tutor.update({ profile_photo: photoPath }, { where: { user_id: user.id } });
    }

    return res.status(200).json({ message: 'Profile photo updated', profile_photo: photoPath });
  } catch (error) {
    return res.status(500).json({ message: 'Error uploading photo', error: error.message });
  }
};

// ✅ Delete Profile Photo
export const deleteProfilePhoto = async (req, res) => {
  const { user } = req;
  try {
    let photoPath;
    if (user.role === 'student') {
      const student = await Student.findOne({ where: { user_id: user.id } });
      photoPath = student.profile_photo;
      await student.update({ profile_photo: null });
    } else if (user.role === 'tutor') {
      const tutor = await Tutor.findOne({ where: { user_id: user.id } });
      photoPath = tutor.profile_photo;
      await tutor.update({ profile_photo: null });
    }

    if (photoPath) {
      const relativePath = photoPath.replace(BASE_URL, '');
      const filePath = path.join(process.cwd(), relativePath);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    return res.status(200).json({ message: 'Profile photo deleted' });
  } catch (error) {
    return res.status(500).json({ message: 'Error deleting profile photo', error: error.message });
  }
};

// ✅ Upload Tutor Documents
export const uploadTutorDocuments = async (req, res) => {
  const { user } = req;
  if (user.role !== 'tutor') {
    return res.status(403).json({ message: 'Only tutors allowed' });
  }

  try {
    const files = req.files;
    if (!files || files.length === 0) {
      return res.status(400).json({ message: 'No documents uploaded' });
    }

    const tutor = await Tutor.findOne({ where: { user_id: user.id } });
    if (!tutor) return res.status(404).json({ message: 'Tutor not found' });

    let currentDocs = tutor.documents || {};

    for (const file of files) {
      const fieldName = file.fieldname;

      if (currentDocs[fieldName]) {
        const oldPath = path.join(
          process.cwd(),
          currentDocs[fieldName].url.replace(BASE_URL, '')
        );
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }

      currentDocs[fieldName] = {
        name: file.originalname,
        url: `${BASE_URL}/uploads/documents/${file.filename}`,
      };
    }

    await Tutor.update(
      { documents: currentDocs },
      { where: { user_id: user.id } }
    );

    const updatedTutor = await Tutor.findOne({
      where: { user_id: user.id },
      attributes: ['documents'],
    });

    return res.status(200).json({
      message: 'Documents uploaded',
      documents: updatedTutor.documents,
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Upload failed',
      error: error.message,
    });
  }
};

// ✅ Delete Specific Tutor Document
export const deleteTutorDocument = async (req, res) => {
  const { user } = req;
  const { type } = req.params;
  if (user.role !== 'tutor') return res.status(403).json({ message: 'Only tutors allowed' });

  try {
    const tutor = await Tutor.findOne({ where: { user_id: user.id } });
    if (!tutor || !tutor.documents || !tutor.documents[type]) {
      return res.status(404).json({ message: `Document "${type}" not found` });
    }

    const docURL = tutor.documents[type].url;
    const relativePath = docURL.replace(BASE_URL, '');
    const docPath = path.join(process.cwd(), relativePath);

    if (fs.existsSync(docPath)) fs.unlinkSync(docPath);

    delete tutor.documents[type];
    await tutor.save();

    res.status(200).json({ message: `${type} document deleted successfully` });
  } catch (error) {
    return res.status(500).json({ message: 'Error deleting document', error: error.message });
  }
};


// 🌍 Public Tutors API
export const getPublicTutors = async (req, res) => {
  try {
    const tutors = await Tutor.findAll({
      where: { profile_status: 'approved' },
      attributes: [
        'user_id',
        'name',
        'gender',
        'subjects',
        'classes',
        'degrees',
        'board',
        'availability',
        'introduction_video',
        'introduction_text',
        'profile_photo',
        'school_name',
        'degree_status',
        'teaching_modes',
        'languages',
        'experience',
        'pricing_per_hour',
        'profile_status',
        'created_at',
        'updated_at'
      ],
      include: [
        {
          model: Location,
          attributes: ['city', 'state', 'country']
        }
      ],
      order: [['created_at', 'DESC']]
    });

    const tutorsWithRatings = await Promise.all(
      tutors.map(async (tutor) => {
        // 🔹 Ratings summary
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

        // 🔹 All published reviews
        const allReviews = await Review.findAll({
          where: { tutor_id: tutor.user_id, status: 'published' },
          include: [
            {
              model: User,
              as: 'Reviewer',
              attributes: ['id', 'name'],
            },
          ],
          order: [['created_at', 'DESC']],
        });

        tutor.dataValues.reviews = allReviews;

        return tutor;
      })
    );

    return res.status(200).json({ tutors: tutorsWithRatings });
  } catch (err) {
    console.error('❌ Error fetching public tutors:', err);
    return res.status(500).json({
      message: 'Failed to fetch tutors',
      error: err.message,
    });
  }
};

// 🌍 Get Single Tutor by ID (Public, with subscription check)
export const getPublicTutorById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user || null; // user may not be logged in

    const tutor = await Tutor.findOne({
      where: { user_id: id, profile_status: 'approved' },
      attributes: [
        'user_id',
        'name',
        'gender',
        'subjects',
        'classes',
        'degrees',
        'board',
        'availability',
        'introduction_video',
        'introduction_text',
        'profile_photo',
        'school_name',
        'degree_status',
        'teaching_modes',
        'languages',
        'experience',
        'pricing_per_hour',
        'profile_status',
        'created_at',
        'updated_at'
      ],
      include: [
        { model: Location, attributes: ['city', 'state', 'country'] },
        { model: User, attributes: ['id', 'email', 'mobile_number', 'is_active'] }
      ]
    });

    if (!tutor) {
      return res.status(404).json({ message: 'Tutor not found' });
    }

    // 🔹 Ratings summary
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

    // 🔹 Reviews
    const reviews = await Review.findAll({
      where: { tutor_id: tutor.user_id, status: 'published' },
      include: [{ model: User, as: 'Reviewer', attributes: ['id', 'name'] }],
      order: [['created_at', 'DESC']],
    });

    tutor.dataValues.reviews = reviews;

    // 🔒 Hide contact info unless student has active subscription
    if (!user) {
      // Guest user (not logged in)
      delete tutor.User.dataValues.email;
      delete tutor.User.dataValues.mobile_number;
    } else {
      const subscription = await db.UserSubscription.findOne({
        where: { user_id: user.id, is_active: true },
        include: [{ model: db.SubscriptionPlan, attributes: ['plan_name'] }],
      });

      let subscriptionStatus = 'Unsubscribed';
      let planName = null;
      let remainingDays = null;

      if (subscription) {
        subscriptionStatus = 'Subscribed';
        planName = subscription.SubscriptionPlan?.plan_name || null;

        const today = new Date();
        const endDate = new Date(subscription.end_date);
        remainingDays = differenceInDays(endDate, today);

        if (remainingDays < 0) {
          subscriptionStatus = 'Expired';
          remainingDays = 0;
        }
      }

      tutor.dataValues.subscription_status = subscriptionStatus;
      tutor.dataValues.plan_name = planName;
      tutor.dataValues.remaining_days = remainingDays;

      // If unsubscribed/expired → hide email & phone
      if (subscriptionStatus !== 'Subscribed') {
        delete tutor.User.dataValues.email;
        delete tutor.User.dataValues.mobile_number;
      }
    }

    return res.status(200).json(tutor);
  } catch (err) {
    console.error('❌ Error fetching tutor by ID:', err);
    return res.status(500).json({ message: 'Failed to fetch tutor', error: err.message });
  }
};
