// src/controllers/profile.controller.js
import HttpStatus from 'http-status-codes';
import db from '../models/index.js';
import logger from '../config/logger.js';
import { getPlaceDetailsFromGoogle } from '../utils/googlePlacesService.js';

const { User, Tutor, Student, Location } = db;

// 🔍 GET profile (student/tutor + email + mobile)
export const getProfile = async (req, res) => {
  const { user } = req;

  try {
    let profile;

    if (user.role === 'tutor') {
      profile = await Tutor.findOne({
        where: { user_id: user.id },
        include: [
          Location,
          { model: User, attributes: ['email', 'mobile_number'] }
        ]
      });
    } else if (user.role === 'student') {
      profile = await Student.findOne({
        where: { user_id: user.id },
        include: [
          Location,
          { model: User, attributes: ['email', 'mobile_number'] }
        ]
      });
    }

    return res.status(HttpStatus.OK).json({ profile });
  } catch (err) {
    logger.error('Profile fetch error:', err);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      message: 'Failed to fetch profile',
      error: err.message
    });
  }
};

// 🌍 Update Location
export const updateLocation = async (req, res) => {
  const { user } = req;
  const { place_id } = req.body;

  try {
    const locationDetails = await getPlaceDetailsFromGoogle(place_id);

    const [location] = await Location.upsert(
      { place_id, ...locationDetails },
      { returning: true }
    );

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

// ✏️ Update Student Profile
export const updateStudentProfile = async (req, res) => {
  const { name, class: studentClass, subjects, class_modes, place_id } = req.body;
  const { id: user_id, role } = req.user;

  if (role !== 'student') return res.status(403).json({ message: 'Only students can update this profile' });

  try {
    let location = null;
    if (place_id) {
      const locationDetails = await getPlaceDetailsFromGoogle(place_id);
      const [loc] = await Location.upsert({ place_id, ...locationDetails }, { returning: true });
      location = loc;
    }

    let student = await Student.findOne({ where: { user_id } });

    if (student) {
      await Student.update({
        name,
        class: studentClass,
        subjects,
        class_modes,
        location_id: location?.id || student.location_id
      }, { where: { user_id } });
    } else {
      student = await Student.create({
        user_id,
        name,
        class: studentClass,
        subjects,
        class_modes,
        location_id: location?.id || null
      });
    }

    const profile = await Student.findOne({ where: { user_id }, include: [Location] });
    return res.status(200).json({ message: 'Student profile updated', profile });
  } catch (error) {
    return res.status(500).json({ message: 'Error saving student profile', error: error.message });
  }
};

// ✏️ Update Tutor Profile
export const updateTutorProfile = async (req, res) => {
  const {
    name, subjects, classes, degrees, introduction_video,
    languages_spoken, school_name, degree_status,
    class_modes, total_experience_years, pricing_per_hour,
    place_id
  } = req.body;

  const { id: user_id, role } = req.user;
  if (role !== 'tutor') return res.status(403).json({ message: 'Only tutors can update this profile' });

  try {
    let location = null;
    if (place_id) {
      const locationDetails = await getPlaceDetailsFromGoogle(place_id);
      const [loc] = await Location.upsert({ place_id, ...locationDetails }, { returning: true });
      location = loc;
    }

    const [updated] = await Tutor.update({
      name, subjects, classes, degrees, introduction_video,
      languages_spoken, school_name, degree_status,
      class_modes, total_experience_years, pricing_per_hour,
      location_id: location?.id
    }, { where: { user_id } });

    if (!updated) return res.status(404).json({ message: 'Tutor profile not found' });

    const profile = await Tutor.findOne({ where: { user_id }, include: [Location] });
    return res.status(200).json({ message: 'Tutor profile updated', profile });
  } catch (error) {
    return res.status(500).json({ message: 'Error updating tutor profile', error: error.message });
  }
};

// 🛠 Update email or mobile number
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
