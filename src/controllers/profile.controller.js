// src/controllers/profile.controller.js
import HttpStatus from 'http-status-codes';
import db from '../models/index.js';
import logger from '../config/logger.js';

const { User, Tutor, Student, Location } = db;

export const updateLocation = async (req, res) => {
  const { user } = req;
  const { place_id, country, state, city, pincode, latitude, longitude } = req.body;

  try {
    // Create or update location
    const [location] = await Location.upsert({
      place_id,
      country,
      state,
      city,
      pincode,
      latitude,
      longitude
    }, { returning: true });

    // Update user's profile with location
    if (user.role === 'tutor') {
      await Tutor.update({ location_id: location.id }, { where: { user_id: user.id } });
    } else if (user.role === 'student') {
      await Student.update({ location_id: location.id }, { where: { user_id: user.id } });
    }

    return res.status(HttpStatus.OK).json({ 
      message: 'Location updated successfully',
      location 
    });
  } catch (err) {
    logger.error('Location update error:', err);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ 
      message: 'Failed to update location',
      error: err.message 
    });
  }
};

export const getProfile = async (req, res) => {
  const { user } = req;

  try {
    let profile;
    if (user.role === 'tutor') {
      profile = await Tutor.findOne({ 
        where: { user_id: user.id },
        include: [Location]
      });
    } else if (user.role === 'student') {
      profile = await Student.findOne({ 
        where: { user_id: user.id },
        include: [Location]
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