// src/controllers/subscription.controller.js

import { v4 as uuidv4 } from 'uuid';
import db from '../models/index.js';

const { SubscriptionPlan, UserSubscription } = db;

// ✅ Add Default Subscription Plans
export const addDefaultPlans = async (req, res) => {
  try {
    // Remove only student plans before inserting new ones
    await SubscriptionPlan.destroy({ where: { user_type: 'student' } });

    const defaultPlans = [
      // 🎓 Student Plans
      {
        id: uuidv4(),
        plan_name: 'Silver Plan',
        price: 250,
        duration_days: 30,
        contact_limit: 2,
        features: [
          '2 Contact Views',
          'Instant Contact Access',
          'SMS/Email Alerts',
          '30-day validity'
        ],
        plan_type: 'monthly',
        user_type: 'student'
      },
      {
        id: uuidv4(),
        plan_name: 'Gold Plan',
        price: 500,
        duration_days: 90,
        contact_limit: 5,
        features: [
          '5 Contact Views',
          'Instant Contact Access',
          'SMS/Email Alerts',
          'Parent Can Contact',
          '90-day validity'
        ],
        plan_type: 'quarterly',
        user_type: 'student'
      },
      {
        id: uuidv4(),
        plan_name: 'Platinum Plan',
        price: 800,
        duration_days: 180,
        contact_limit: 10,
        features: [
          '10 Contact Views',
          'Instant Contact Access',
          'SMS/Email Alerts',
          'Parent Can Contact',
          '15min Early Notification',
          '180-day validity'
        ],
        plan_type: 'half-yearly',
        user_type: 'student'
      },

      // 👨‍🏫 Tutor Plans (unchanged)
      {
        id: uuidv4(),
        plan_name: 'Silver Plan',
        price: 3000,
        duration_days: 30,
        contact_limit: 10,
        features: [
          '10 Contact Views',
          'Instant Contact Access',
          'SMS/Email Alerts',
          '30-day validity'
        ],
        plan_type: 'monthly',
        user_type: 'tutor'
      },
      {
        id: uuidv4(),
        plan_name: 'Gold Plan',
        price: 5000,
        duration_days: 120,
        contact_limit: 20,
        features: [
          '20 Contact Views',
          'Instant Contact Access',
          'SMS/Email Alerts',
          'Parent Can contact',
          '120-day validity'
        ],
        plan_type: 'quarterly',
        user_type: 'tutor'
      },
      {
        id: uuidv4(),
        plan_name: 'Platinum Plan',
        price: 10000,
        duration_days: 365,
        contact_limit: 50,
        features: [
          '50 Contact Views',
          'Instant Contact Access',
          'Parent Can contact',
          '15min Early Notification',
          'SMS/Email Alerts',
          '365-day validity'
        ],
        plan_type: 'yearly',
        user_type: 'tutor'
      }
    ];

    await SubscriptionPlan.bulkCreate(defaultPlans);

    return res.status(201).json({
      message: '✅ Default subscription plans added successfully',
      plans: defaultPlans
    });
  } catch (error) {
    console.error('❌ Error inserting plans:', error);
    return res.status(500).json({
      message: 'Failed to insert default plans',
      error: error.message
    });
  }
};

// ✅ Get Plans by User Type (tutor/student)
export const getPlansByUserType = async (req, res) => {
  try {
    const { type } = req.params;

    if (!['tutor', 'student'].includes(type)) {
      return res.status(400).json({ message: 'Invalid user type. Must be "tutor" or "student".' });
    }

    const plans = await SubscriptionPlan.findAll({
      where: { user_type: type },
      order: [['price', 'ASC']]
    });

    return res.status(200).json({ plans });
  } catch (error) {
    console.error('❌ Error fetching plans:', error);
    return res.status(500).json({
      message: 'Failed to fetch plans',
      error: error.message
    });
  }
};

// ✅ Get Current User's Subscription Status
export const getSubscriptionStatus = async (req, res) => {
  const userId = req.user.id;

  try {
    const activeSub = await UserSubscription.findOne({
      where: { user_id: userId, is_active: true },
      include: [SubscriptionPlan]
    });

    return res.status(200).json({
      isSubscribed: !!activeSub,
      subscription: activeSub || null
    });
  } catch (err) {
    console.error('❌ Error fetching subscription status:', err);
    return res.status(500).json({
      message: 'Failed to fetch subscription status',
      error: err.message
    });
  }
};
