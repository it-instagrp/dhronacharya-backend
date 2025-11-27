// src/controllers/coupon.controller.js
import db from '../models/index.js';
import { Op, col } from 'sequelize';
import { sendEmail } from '../utils/email.js';
import { sendSMS } from '../utils/sms.js';
import { sendWhatsApp } from '../utils/whatsapp.js';
import { couponTemplates } from '../templates/couponTemplates.js';

const { Coupon, User, SubscriptionPlan, UserCoupon } = db;

/**
 * Admin: Create Coupon
 */
/**
 * Admin: Create Coupon (with full SQL Injection + XSS validation)
 */
export const createCoupon = async (req, res) => {
  try {
    let {
      code, discount_type, discount_value,
      usage_limit, valid_from, valid_until,
      applicable_plan, description
    } = req.body;

    // -----------------------------
    // SECURITY VALIDATION START
    // -----------------------------

    const injectionPatterns = [
      /['"`;]/g,
      /--/g,
      /\b(drop|delete|insert|update|select|alter|truncate)\b/i,
      /<script.*?>.*?<\/script>/gi,
      /<\/?[^>]+>/gi,
      /\/\*.*?\*\//gs,
    ];

    const fieldsToCheck = { code, description };

    for (const [key, value] of Object.entries(fieldsToCheck)) {
      if (value && typeof value === "string") {
        for (let pattern of injectionPatterns) {
          if (pattern.test(value)) {
            return res.status(400).json({
              message: `Invalid ${key}: potentially harmful content detected.`,
            });
          }
        }
      }
    }

    // coupon code rule
    const codeRegex = /^[A-Z0-9_-]+$/;
    if (!codeRegex.test(code)) {
      return res.status(400).json({
        message:
          "Invalid coupon code. Only A-Z, 0-9, _, - allowed. No spaces, no special symbols.",
      });
    }

    code = code.toUpperCase();

    // -----------------------------
    // FIELD VALIDATIONS START
    // -----------------------------

    // discount_type validation
    if (!["percentage", "fixed"].includes(discount_type)) {
      return res.status(400).json({
        message: "discount_type must be either 'percentage' or 'fixed'."
      });
    }

    // discount_value validation
    if (typeof discount_value !== "number" || isNaN(discount_value)) {
      return res.status(400).json({
        message: "discount_value must be a valid number.",
      });
    }

    if (discount_value <= 0) {
      return res.status(400).json({
        message: "discount_value must be greater than 0.",
      });
    }

    if (discount_type === "percentage" && discount_value > 100) {
      return res.status(400).json({
        message: "Percentage discount cannot be more than 100%.",
      });
    }

    // usage_limit validation
    if (usage_limit !== null) {
      if (typeof usage_limit !== "number" || isNaN(usage_limit)) {
        return res.status(400).json({
          message: "usage_limit must be a number.",
        });
      }

      if (usage_limit <= 0) {
        return res.status(400).json({
          message: "usage_limit must be a positive number.",
        });
      }
    }

    // date validation
    const startDate = new Date(valid_from);
    const endDate = new Date(valid_until);

    if (isNaN(startDate.getTime())) {
      return res.status(400).json({
        message: "valid_from must be a valid date (YYYY-MM-DD).",
      });
    }

    if (isNaN(endDate.getTime())) {
      return res.status(400).json({
        message: "valid_until must be a valid date (YYYY-MM-DD).",
      });
    }

    if (endDate < startDate) {
      return res.status(400).json({
        message: "valid_until must be greater than or equal to valid_from.",
      });
    }

    // applicable_plan validation
    if (!applicable_plan || typeof applicable_plan !== "string") {
      return res.status(400).json({
        message: "applicable_plan is required and must be a string.",
      });
    }

    if (!/^[A-Za-z0-9_\-]+$/.test(applicable_plan)) {
      return res.status(400).json({
        message: "Invalid applicable_plan. Only alphanumeric, _, - allowed.",
      });
    }

    // -----------------------------
    // FIELD VALIDATIONS END
    // -----------------------------

    // Duplicate check
    const existing = await Coupon.findOne({ where: { code } });
    if (existing) {
      return res.status(400).json({
        message: "Coupon code already exists.",
      });
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
      is_active: true,
      description
    });

    return res.status(201).json({
      message: "Coupon created successfully.",
      coupon,
    });

  } catch (error) {
    console.error("Error creating coupon:", error);
    return res.status(500).json({
      message: "Error creating coupon",
      error: error.message,
    });
  }
};

/**
 * Admin: Get All Coupons
 */
export const getAllCoupons = async (req, res) => {
  try {
    const coupons = await Coupon.findAll({ order: [['createdAt', 'DESC']] });
    return res.json({ coupons });
  } catch (error) {
    return res.status(500).json({ message: 'Error fetching coupons', error: error.message });
  }
};

/**
 * User: Validate Coupon (One-time per user + Plan Validation)
 */
export const applyCoupon = async (req, res) => {
  const { code, plan_name } = req.body;
  const userId = req.user?.id;

  try {
    if (!code || !plan_name)
      return res.status(400).json({ message: 'Coupon code and plan name are required.' });

    const user = await User.findByPk(userId);
    if (!user)
      return res.status(404).json({ message: 'User not found.' });

    const plan = await SubscriptionPlan.findOne({
      where: { plan_name, user_type: user.role },
    });
    if (!plan)
      return res.status(404).json({ message: `No ${user.role} plan found by that name.` });

    const today = new Date();

    // ✅ Fixed validation logic using Op.and
    const coupon = await Coupon.findOne({
      where: {
        code,
        is_active: true,
        valid_from: { [Op.lte]: today },
        valid_until: { [Op.gte]: today },
        [Op.and]: [
          {
            [Op.or]: [
              { applicable_plan: 'all' },
              { applicable_plan: plan.plan_name },
            ],
          },
          {
            [Op.or]: [
              { usage_limit: null },
              { usage_limit: { [Op.gt]: col('used_count') } },
            ],
          },
        ],
      },
    });

    if (!coupon)
      return res.status(404).json({ message: 'Invalid or expired coupon for this plan.' });

    // Check if user already used this coupon
    const existingUsage = await UserCoupon.findOne({
      where: { user_id: userId, coupon_id: coupon.id },
    });

    if (existingUsage)
      return res.status(400).json({ message: 'You have already used this coupon.' });

    // Calculate discount (but don't record usage yet)
    const originalAmount = plan.price;
    const discountAmount = coupon.discount_type === 'percentage'
      ? Math.round((coupon.discount_value / 100) * originalAmount)
      : coupon.discount_value;

    const finalAmount = Math.max(originalAmount - discountAmount, 0);

    return res.status(200).json({
      message: 'Coupon applied successfully',
      coupon: {
        code: coupon.code,
        discount_type: coupon.discount_type,
        discount_value: coupon.discount_value,
        original_amount: originalAmount,
        discount_amount: discountAmount,
        final_amount: finalAmount,
        coupon_id: coupon.id,
      },
    });
  } catch (error) {
    console.error('Error applying coupon:', error);
    return res.status(500).json({ message: 'Error applying coupon', error: error.message });
  }
};

/**
 * Record Coupon Usage (called after successful payment)
 */
export const recordCouponUsage = async (user_id, coupon_code, discount_amount) => {
  try {
    const coupon = await Coupon.findOne({ where: { code: coupon_code } });
    if (!coupon) {
      console.error('Coupon not found for recording usage:', coupon_code);
      return false;
    }

    await UserCoupon.create({
      user_id: user_id,
      coupon_id: coupon.id,
      discount_amount: discount_amount,
      used_at: new Date(),
    });

    coupon.used_count += 1;
    await coupon.save();

    const user = await User.findByPk(user_id);
    if (user) {
      const discountDisplay = coupon.discount_type === 'percentage'
        ? `${coupon.discount_value}%`
        : `₹${coupon.discount_value}`;

      const emailTemplate = couponTemplates.couponAppliedEmail({
        name: user.name,
        couponCode: coupon.code,
        discount: discountDisplay,
        finalAmount: 0,
      });

      const smsTemplate = couponTemplates.couponAppliedSMS({
        couponCode: coupon.code,
        finalAmount: 0,
      });

      const whatsappTemplate = couponTemplates.couponAppliedWhatsApp({
        name: user.name,
        couponCode: coupon.code,
        discount: discountDisplay,
        finalAmount: 0,
      });

      await Promise.all([
        sendEmail(user.email, emailTemplate.subject, emailTemplate.text),
        sendSMS(user.mobile_number, smsTemplate),
        sendWhatsApp(user.mobile_number, whatsappTemplate),
      ]);
    }

    return true;
  } catch (error) {
    console.error('Error recording coupon usage:', error);
    return false;
  }
};

/**
 * Validate Coupon for Payment (used in createOrder)
 */
export const validateCouponForPayment = async (code, plan_name, user_id) => {
  try {
    const today = new Date();

    const coupon = await Coupon.findOne({
      where: {
        code,
        is_active: true,
        valid_from: { [Op.lte]: today },
        valid_until: { [Op.gte]: today },
        [Op.and]: [
          {
            [Op.or]: [
              { applicable_plan: 'all' },
              { applicable_plan: plan_name },
            ],
          },
          {
            [Op.or]: [
              { usage_limit: null },
              { usage_limit: { [Op.gt]: col('used_count') } },
            ],
          },
        ],
      },
    });

    if (!coupon) {
      return { valid: false, message: 'Invalid or expired coupon for this plan.' };
    }

    if (user_id) {
      const existingUsage = await UserCoupon.findOne({
        where: { user_id, coupon_id: coupon.id },
      });

      if (existingUsage) {
        return { valid: false, message: 'You have already used this coupon.' };
      }
    }

    return { valid: true, coupon, message: 'Coupon is valid' };
  } catch (error) {
    console.error('Error validating coupon for payment:', error);
    return { valid: false, message: 'Error validating coupon' };
  }
};


/**
 * Admin: Toggle Active/Inactive
 */
export const toggleCouponStatus = async (req, res) => {
  const { id } = req.params;
  try {
    const coupon = await Coupon.findByPk(id);
    if (!coupon) return res.status(404).json({ message: 'Coupon not found' });

    coupon.is_active = !coupon.is_active;
    await coupon.save();

    return res.json({
      message: `Coupon ${coupon.is_active ? 'activated' : 'deactivated'} successfully.`,
      coupon,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Error updating coupon status', error: error.message });
  }
};

/**
 * Admin: Delete Coupon
 */
export const deleteCoupon = async (req, res) => {
  const { id } = req.params;
  try {
    const deleted = await Coupon.destroy({ where: { id } });
    if (!deleted)
      return res.status(404).json({ message: 'Coupon not found' });

    return res.json({ message: 'Coupon deleted successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Error deleting coupon', error: error.message });
  }
};

/**
 * Public: Get Active + Valid Coupons
 */
export const getAvailableCoupons = async (req, res) => {
  try {
    const today = new Date();

    const coupons = await Coupon.findAll({
      where: {
        is_active: true,   // ← ADD THIS LINE
        valid_from: { [Op.lte]: today },
        valid_until: { [Op.gte]: today },
        [Op.or]: [
          { usage_limit: null },
          { usage_limit: { [Op.gt]: col('used_count') } },
        ],
      },
      order: [['createdAt', 'DESC']],
    });

    return res.status(200).json({ coupons });
  } catch (error) {
    return res.status(500).json({ message: 'Error fetching coupons', error: error.message });
  }
};

/**
 * Public: Get All Coupons applicable for a specific plan (even if used)
 */
export const getUserApplicableCoupons = async (req, res) => {
  const { plan_name } = req.query;
  const userId = req.user?.id;

  try {
    const user = await User.findByPk(userId);
    if (!user)
      return res.status(404).json({ message: 'User not found.' });

    const today = new Date();

    const coupons = await Coupon.findAll({
      where: {
        is_active: true,
        valid_from: { [Op.lte]: today },
        valid_until: { [Op.gte]: today },
        [Op.or]: [
          { applicable_plan: 'all' },
          { applicable_plan: plan_name },
        ],
        [Op.or]: [
          { usage_limit: null },
          { usage_limit: { [Op.gt]: col('used_count') } },
        ],
      },
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: UserCoupon,
          as: 'UsersUsed',
          where: { user_id: userId },
          required: false,
        },
      ],
    });

    return res.status(200).json({ coupons });
  } catch (error) {
    return res.status(500).json({ message: 'Error fetching user coupons', error: error.message });
  }
};

/**
 * Admin: Get Coupon Usage (who used each coupon)
 */
export const getCouponUsage = async (req, res) => {
  try {
    const coupons = await Coupon.findAll({
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: UserCoupon,
          as: 'UsersUsed',
          attributes: ['id', 'discount_amount', 'used_at'],
          include: [
            {
              model: User,
              as: 'User',
              attributes: ['id', 'name', 'email', 'mobile_number']
            }
          ]
        }
      ]
    });

    const result = coupons.map(coupon => ({
      id: coupon.id,
      code: coupon.code,
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value,
      usage_limit: coupon.usage_limit,
      used_count: coupon.used_count,
      users: coupon.UsersUsed.map(u => ({
        user_id: u.User?.id || null,
        name: u.User?.name || null,
        email: u.User?.email || null,
        mobile_number: u.User?.mobile_number || null,
        discount_amount: u.discount_amount,
        applied_at: u.used_at
      }))
    }));

    return res.status(200).json({ coupons: result });
  } catch (error) {
    console.error('Error fetching coupon usage:', error);
    return res.status(500).json({ message: 'Error fetching coupon usage', error: error.message });
  }
};