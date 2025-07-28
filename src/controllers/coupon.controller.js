import db from '../models/index.js';
import { Op, col } from 'sequelize';  // ✅ Recommended
const { Coupon } = db;


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
    if (existing) return res.status(400).json({ message: 'Coupon code already exists.' });

    const coupon = await Coupon.create({
      code,
      discount_type,
      discount_value,
      usage_limit,
      valid_from,
      valid_until,
      applicable_plan,
      is_active: true
    });

    return res.status(201).json({ message: 'Coupon created', coupon });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error creating coupon' });
  }
};

/**
 * ✅ Admin: Get All Coupons
 */
export const getAllCoupons = async (req, res) => {
  try {
    const coupons = await Coupon.findAll({ order: [['createdAt', 'DESC']] });
    return res.json({ coupons });
  } catch (error) {
    return res.status(500).json({ message: 'Error fetching coupons' });
  }
};

/**
 * ✅ User: Apply Coupon
 */
export const applyCoupon = async (req, res) => {
  const { code, plan } = req.body;

  try {
    const today = new Date();
    const coupon = await Coupon.findOne({
      where: {
        code,
        is_active: true,
        valid_from: { [Op.lte]: today },
        valid_until: { [Op.gte]: today },
        [Op.or]: [
          { applicable_plan: 'all' },
          { applicable_plan: plan } // optional plan check
        ],
        [Op.or]: [
  { usage_limit: null },
  { usage_limit: { [Op.gt]: col('used_count') } }  // ✅ FIXED
]

      }
    });

    if (!coupon) {
      return res.status(404).json({ message: 'Invalid or expired coupon' });
    }

    return res.status(200).json({
      message: 'Coupon valid',
      coupon: {
        code: coupon.code,
        discount_type: coupon.discount_type,
        discount_value: coupon.discount_value
      }
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/**
 * ✅ Admin: Toggle Active/Inactive
 */
export const toggleCouponStatus = async (req, res) => {
  const { id } = req.params;
  try {
    const coupon = await Coupon.findByPk(id);
    if (!coupon) return res.status(404).json({ message: 'Coupon not found' });

    coupon.is_active = !coupon.is_active;
    await coupon.save();

    return res.json({
      message: `Coupon ${coupon.is_active ? 'activated' : 'deactivated'}`,
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
    if (!deleted) return res.status(404).json({ message: 'Coupon not found' });

    return res.json({ message: 'Coupon deleted successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Error deleting coupon' });
  }
};

// src/controllers/coupon.controller.js
export const getAvailableCoupons = async (req, res) => {
  try {
    const today = new Date();

    const coupons = await db.Coupon.findAll({
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
