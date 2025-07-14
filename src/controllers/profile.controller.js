import HttpStatus from 'http-status-codes';
import db from '../models/index.js';
import logger from '../config/logger.js';
import fs from 'fs';
import path from 'path';
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

// ✏ Update Student Profile
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

// ✏ Update Tutor Profile
export const updateTutorProfile = async (req, res) => {
  const {
    name, subjects, classes, degrees, introduction_video,
    school_name, degree_status,
    teaching_modes, experience, pricing_per_hour,
    languages, documents,
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
      name,
      subjects,
      classes,
      degrees,
      introduction_video,
      school_name,
      degree_status,
      teaching_modes,
      experience,
      pricing_per_hour,
      languages,
      documents,
      location_id: location?.id
    }, { where: { user_id } });

    if (!updated) return res.status(404).json({ message: 'Tutor profile not found' });

    const profile = await Tutor.findOne({ where: { user_id }, include: [Location] });
    return res.status(200).json({ message: 'Tutor profile updated', profile });
  } catch (error) {
    return res.status(500).json({ message: 'Error updating tutor profile', error: error.message });
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

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// ✅ Upload/Update Profile Photo
export const updateProfilePhoto = async (req, res) => {
  const { user } = req;
  const file = req.file;
  if (!file) return res.status(400).json({ message: 'No file uploaded' });
  try {
    const photoPath = `/uploads/profile_photos/${file.filename}`;
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
      const filePath = path.join(process.cwd(), photoPath);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    return res.status(200).json({ message: 'Profile photo deleted' });
  } catch (error) {
    return res.status(500).json({ message: 'Error deleting profile photo', error: error.message });
  }
};

// ✅ Upload Tutor Documents (Aadhar / PAN)
export const uploadTutorDocuments = async (req, res) => {
  const { user } = req;
  if (user.role !== 'tutor') return res.status(403).json({ message: 'Only tutors allowed' });

  try {
    const files = req.files;
    if (!files || files.length === 0) {
      return res.status(400).json({ message: 'No documents uploaded' });
    }

    const tutor = await Tutor.findOne({ where: { user_id: user.id } });
    if (!tutor) return res.status(404).json({ message: 'Tutor not found' });

    const currentDocs = tutor.documents || {};

    for (const file of files) {
      const fieldName = file.fieldname;

      // Delete old document if it exists
      if (currentDocs[fieldName]) {
        const oldPath = path.join(process.cwd(), currentDocs[fieldName].url);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }

      // Save new document
      currentDocs[fieldName] = {
        name: file.originalname,
        url: `/uploads/documents/${file.filename}`
      };
    }

    tutor.documents = currentDocs;
    await tutor.save();

    res.status(200).json({ message: 'Documents uploaded', documents: tutor.documents });
  } catch (error) {
    res.status(500).json({ message: 'Upload failed', error: error.message });
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

    const docPath = path.join(process.cwd(), tutor.documents[type].url);
    if (fs.existsSync(docPath)) fs.unlinkSync(docPath);

    delete tutor.documents[type];
    await tutor.save();

    res.status(200).json({ message: `${type} document deleted successfully` });
  } catch (error) {
    return res.status(500).json({ message: 'Error deleting document', error: error.message });
  }
};