// src/controllers/coupon.controller.js
import db from '../models/index.js';
import { Op, col } from 'sequelize';

import { sendEmail } from '../utils/email.js';
import { sendSMS } from '../utils/sms.js';
import { sendWhatsApp } from '../utils/whatsapp.js';
import { couponTemplates } from '../templates/couponTemplates.js';

const { Coupon, User, SubscriptionPlan } = db;

/**
 * ✅ Admin: Create Coupon
 */
export const createCoupon = async (req, res) => {
  try {
    const {
      code, discount_type, discount_value,
      usage_limit, valid_from, valid_until,
      applicable_plan
    } = req.body;

    const existing = await Coupon.findOne({ where: { code } });
    if (existing) {
      return res.status(400).json({ message: 'Coupon code already exists.' });
    }

    const coupon = await Coupon.create({
      code,
      discount_type,
      discount_value,
      usage_limit,
      used_count: 0,
      valid_from,
      valid_until,
      applicable_plan,
      is_active: true
    });

    return res.status(201).json({ message: 'Coupon created successfully.', coupon });
  } catch (error) {
    console.error('Error creating coupon:', error);
    return res.status(500).json({ message: 'Error creating coupon' });
  }
};

/**
 * ✅ Admin: Get All Coupons
 */
export const getAllCoupons = async (req, res) => {
  try {
    const coupons = await Coupon.findAll({
      order: [['createdAt', 'DESC']]
    });
    return res.json({ coupons });
  } catch (error) {
    return res.status(500).json({ message: 'Error fetching coupons' });
  }
};

/**
 * ✅ User: Apply Coupon with Plan Matching and Notification
 */


export const applyCoupon = async (req, res) => {
  const { code, plan_name } = req.body;
  const userId = req.user?.id;

  try {
    if (!code || !plan_name) {
      return res.status(400).json({ message: 'Coupon code and plan name are required.' });
    }

    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ message: 'User not found.' });

    // ✅ Find plan by name and user type (role)
    const plan = await SubscriptionPlan.findOne({
      where: {
        plan_name,
        user_type: user.role  // 'student' or 'tutor'
      }
    });

    if (!plan) {
      return res.status(404).json({ message: `No ${user.role} plan found by that name.` });
    }

    const today = new Date();

    // ✅ Validate coupon
    const coupon = await Coupon.findOne({
      where: {
        code,
        is_active: true,
        valid_from: { [Op.lte]: today },
        valid_until: { [Op.gte]: today },
        [Op.or]: [
          { applicable_plan: 'all' },
          { applicable_plan: plan.plan_name }
        ],
        [Op.or]: [
          { usage_limit: null },
          { usage_limit: { [Op.gt]: col('used_count') } }
        ]
      }
    });

    if (!coupon) {
      return res.status(404).json({ message: 'Invalid or expired coupon for this plan.' });
    }

    // ✅ Calculate discounted amount
    const originalAmount = plan.price;
    const discountAmount = coupon.discount_type === 'percentage'
      ? Math.round((coupon.discount_value / 100) * originalAmount)
      : coupon.discount_value;

    const finalAmount = Math.max(originalAmount - discountAmount, 0);
    const discountDisplay = coupon.discount_type === 'percentage'
      ? `${coupon.discount_value}%`
      : `₹${coupon.discount_value}`;

    // ✅ Send notifications
    const emailTemplate = couponTemplates.couponAppliedEmail({
      name: user.name,
      couponCode: coupon.code,
      discount: discountDisplay,
      finalAmount
    });

    const smsTemplate = couponTemplates.couponAppliedSMS({
      couponCode: coupon.code,
      finalAmount
    });

    const whatsappTemplate = couponTemplates.couponAppliedWhatsApp({
      name: user.name,
      couponCode: coupon.code,
      discount: discountDisplay,
      finalAmount
    });

    await Promise.all([
      sendEmail(user.email, emailTemplate.subject, emailTemplate.text),
      sendSMS(user.mobile_number, smsTemplate),
      sendWhatsApp(user.mobile_number, whatsappTemplate)
    ]);

    return res.status(200).json({
      message: 'Coupon is valid and notifications sent',
      coupon: {
        code: coupon.code,
        discount_type: coupon.discount_type,
        discount_value: coupon.discount_value,
        original_amount: originalAmount,
        final_amount: finalAmount
      }
    });

  } catch (error) {
    console.error('Error applying coupon:', error);
    return res.status(500).json({ message: 'Error applying coupon', error: error.message });
  }
};


/**
 * ✅ Admin: Toggle Active/Inactive
 */
export const toggleCouponStatus = async (req, res) => {
  const { id } = req.params;
  try {
    const coupon = await Coupon.findByPk(id);
    if (!coupon) {
      return res.status(404).json({ message: 'Coupon not found' });
    }

    coupon.is_active = !coupon.is_active;
    await coupon.save();

    return res.json({
      message: `Coupon ${coupon.is_active ? 'activated' : 'deactivated'} successfully.`,
      coupon
    });
  } catch (error) {
    return res.status(500).json({ message: 'Error updating coupon status' });
  }
};

/**
 * ✅ Admin: Delete Coupon
 */
export const deleteCoupon = async (req, res) => {
  const { id } = req.params;
  try {
    const deleted = await Coupon.destroy({ where: { id } });
    if (!deleted) {
      return res.status(404).json({ message: 'Coupon not found' });
    }

    return res.json({ message: 'Coupon deleted successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Error deleting coupon' });
  }
};

/**
 * ✅ Public: Get All Available Coupons (Active + Valid)
 */
export const getAvailableCoupons = async (req, res) => {
  try {
    const today = new Date();

    const coupons = await Coupon.findAll({
      where: {
        is_active: true,
        valid_from: { [Op.lte]: today },
        valid_until: { [Op.gte]: today },
        [Op.or]: [
          { usage_limit: null },
          { usage_limit: { [Op.gt]: col('used_count') } }
        ]
      },
      order: [['createdAt', 'DESC']]
    });

    return res.status(200).json({ coupons });
  } catch (error) {
    return res.status(500).json({ message: 'Error fetching coupons', error: error.message });
  }
};
