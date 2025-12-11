
// src/controllers/coupon.controller.js
import db from '../models/index.js';
import { Op, col } from 'sequelize';
import { sendEmail } from '../utils/email.js';
import { sendSMS } from '../utils/sms.js';
import { sendWhatsApp } from '../utils/whatsapp.js';
import { couponTemplates } from '../templates/couponTemplates.js';

const { Coupon, User, SubscriptionPlan, UserCoupon } = db;

/**
 * Admin: Create Coupon with coupon_type support
 */
export const createCoupon = async (req, res) => {
  try {
    let {
      code, coupon_type, discount_type, discount_value,
      usage_limit, valid_from, valid_until,
      applicable_plan, description, expiry_hours // For promotional/time-sensitive coupons
    } = req.body;

    // -----------------------------
    // UPDATED SECURITY VALIDATION
    // -----------------------------
    
    // Different validation rules for code vs description
    const codeRegex = /^[A-Z0-9_-]+$/;
    if (!codeRegex.test(code)) {
      return res.status(400).json({
        message: "Invalid coupon code. Only A-Z, 0-9, _, - allowed. No spaces, no special symbols.",
      });
    }
    code = code.toUpperCase();
    
    // Validate description length and content (allow apostrophes and quotes)
    if (description && typeof description === "string") {
      if (description.length > 500) {
        return res.status(400).json({
          message: "Description must be less than 500 characters.",
        });
      }
      
      // Check for truly harmful content in description
      const dangerousPatterns = [
        /<script.*?>.*?<\/script>/gi, // Script tags
        /javascript:/gi, // JavaScript protocol
        /on\w+\s*=/gi, // Event handlers
        /--\s*[\r\n]/, // SQL line comments
        /\/\*.*?\*\//gs, // SQL block comments
        /\b(drop\s+database|delete\s+from|insert\s+into|update\s+.*set|select\s+.*from|alter\s+table|truncate\s+table)\b/i, // SQL commands with context
      ];
      
      for (let pattern of dangerousPatterns) {
        if (pattern.test(description)) {
          return res.status(400).json({
            message: "Invalid description: potentially harmful content detected.",
          });
        }
      }
      
      // Escape HTML special characters for safe display
      description = description
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    }

    // -----------------------------
    // FIELD VALIDATIONS
    // -----------------------------

    // coupon_type validation
    if (!["promotional", "referral", "global", "retention"].includes(coupon_type)) {
      return res.status(400).json({
        message: "coupon_type must be one of: 'promotional', 'referral', 'global', 'retention'."
      });
    }

    // Get current date
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0); // Set to start of day for comparison

    // DATE VALIDATION - PREVENT PAST DATES
    if (valid_from) {
      const startDate = new Date(valid_from);
      startDate.setHours(0, 0, 0, 0);
      
      if (isNaN(startDate.getTime())) {
        return res.status(400).json({
          message: "valid_from must be a valid date (YYYY-MM-DD).",
        });
      }
      
      // Check if start date is in the past (excluding today)
      if (startDate < currentDate) {
        return res.status(400).json({
          message: "valid_from cannot be in the past. Please provide current or future date.",
        });
      }
    } else {
      // If valid_from is not provided, default to today
      valid_from = currentDate.toISOString().split('T')[0] + 'T00:00:00.000Z';
    }

    // For promotional coupons: if expiry_hours is provided, set valid_until
    if (coupon_type === 'promotional' && expiry_hours) {
      const validFromDate = valid_from ? new Date(valid_from) : new Date();
      valid_until = new Date(validFromDate.getTime() + expiry_hours * 60 * 60 * 1000);
    }

    // Validate valid_until
    const endDate = new Date(valid_until);
    if (isNaN(endDate.getTime())) {
      return res.status(400).json({
        message: "valid_until must be a valid date (YYYY-MM-DD).",
      });
    }

    // Check if end date is in the past
    endDate.setHours(0, 0, 0, 0);
    if (endDate < currentDate) {
      return res.status(400).json({
        message: "valid_until cannot be in the past. Please provide current or future date.",
      });
    }

    // Check if end date is before start date
    const startDate = new Date(valid_from);
    if (endDate < startDate) {
      return res.status(400).json({
        message: "valid_until must be greater than or equal to valid_from.",
      });
    }

    // discount_type validation
    if (!["percentage", "fixed"].includes(discount_type)) {
      return res.status(400).json({
        message: "discount_type must be either 'percentage' or 'fixed'."
      });
    }

    // discount_value validation
    if (typeof discount_value !== "number" || isNaN(discount_value) || discount_value <= 0) {
      return res.status(400).json({
        message: "discount_value must be a valid positive number.",
      });
    }

    if (discount_type === "percentage" && discount_value > 100) {
      return res.status(400).json({
        message: "Percentage discount cannot be more than 100%.",
      });
    }

    // usage_limit validation
    if (usage_limit !== null && usage_limit !== undefined) {
      if (typeof usage_limit !== "number" || isNaN(usage_limit) || usage_limit <= 0) {
        return res.status(400).json({
          message: "usage_limit must be a valid positive number.",
        });
      }
    }

    // // applicable_plan validation
    // if (!applicable_plan || typeof applicable_plan !== "string") {
    //   return res.status(400).json({
    //     message: "applicable_plan is required and must be a string.",
    //   });
    // }

    // if (!/^[A-Za-z0-9_\- ]+$/.test(applicable_plan)) {
    //   return res.status(400).json({
    //     message: "Invalid applicable_plan. Only alphanumeric, _, -, and spaces allowed.",
    //   });
    // }
// applicable_plan validation
if (!applicable_plan || typeof applicable_plan !== "string") {
  return res.status(400).json({
    message: "applicable_plan is required and must be a string.",
  });
}

// Updated regex to allow commas and spaces for multiple plans
if (!/^[A-Za-z0-9_,\-\s]+$/.test(applicable_plan)) {
  return res.status(400).json({
    message: "Invalid applicable_plan. Only alphanumeric, _, -, commas and spaces allowed.",
  });
}

// Optional: Trim spaces from individual plan names if you want to be strict
// This splits by comma, trims each part, and joins back
applicable_plan = applicable_plan
  .split(',')
  .map(plan => plan.trim())
  .join(',');
    // Duplicate check
    const existing = await Coupon.findOne({ where: { code } });
    if (existing) {
      return res.status(400).json({
        message: "Coupon code already exists.",
      });
    }

    // Create coupon with coupon_type
    const coupon = await Coupon.create({
      code,
      coupon_type,
      discount_type,
      discount_value,
      usage_limit: usage_limit || null,
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
 * User: Apply Coupon with coupon_type specific logic
 */
/**
 * User: Apply Coupon with coupon_type specific logic
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

    // Find coupon with coupon_type
    const coupon = await Coupon.findOne({
      where: {
        code: code.toUpperCase(), // Make sure to uppercase the code for consistency
        is_active: true,
        valid_from: { [Op.lte]: today },
        valid_until: { [Op.gte]: today },
        [Op.and]: [
          {
            [Op.or]: [
              { applicable_plan: 'all' },
              { applicable_plan: plan.plan_name },
              { applicable_plan: { [Op.like]: `%${plan.plan_name}%` } }, // For comma-separated plans
              { applicable_plan: { [Op.like]: `${plan.plan_name},%` } }, // For start of list
              { applicable_plan: { [Op.like]: `%,${plan.plan_name}` } }, // For end of list
              { applicable_plan: { [Op.like]: `%,${plan.plan_name},%` } }, // For middle of list
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
      // Debug: Log why coupon wasn't found
      console.log('Coupon search params:', {
        code: code.toUpperCase(),
        plan_name: plan.plan_name,
        today,
        user_role: user.role
      });
      
      return res.status(404).json({ 
        message: 'Invalid or expired coupon for this plan.',
        details: `Coupon not applicable for ${plan.plan_name} (${user.role} plan)`
      });
    }

    // Check coupon type specific rules
    let validationError = null;
    
    switch(coupon.coupon_type) {
      case 'promotional':
        // Check if user already used any promotional coupon
        const usedPromotional = await UserCoupon.findOne({
          include: [{
            model: Coupon,
            where: { coupon_type: 'promotional' }
          }],
          where: { user_id: userId }
        });
        if (usedPromotional) {
          validationError = 'You have already used a promotional coupon.';
        }
        break;

      case 'referral':
        // Check if this is a self-referral (user trying to use their own referral code)
        // You might want to implement additional referral logic here
        break;

      case 'retention':
        // Check if user is eligible for retention coupon (cancelled or about to expire)
        // For retention coupons, check if user has an active subscription that's expiring soon
        const activeSubscription = await UserSubscription.findOne({
          where: { 
            user_id: userId, 
            is_active: true,
            end_date: { 
              [Op.gte]: today,
              [Op.lte]: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000) // Expiring in next 7 days
            }
          }
        });
        if (!activeSubscription) {
          validationError = 'Retention coupons are only for users with subscriptions expiring soon.';
        }
        break;

      case 'global':
        // Global coupons have no special restrictions
        break;
    }

    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    // Check general usage (one-time per user per coupon)
    const existingUsage = await UserCoupon.findOne({
      where: { user_id: userId, coupon_id: coupon.id },
    });

    if (existingUsage)
      return res.status(400).json({ message: 'You have already used this coupon.' });

    // Calculate discount
    const originalAmount = plan.price;
    const discountAmount = coupon.discount_type === 'percentage'
      ? Math.round((coupon.discount_value / 100) * originalAmount)
      : coupon.discount_value;

    const finalAmount = Math.max(originalAmount - discountAmount, 0);

    return res.status(200).json({
      message: 'Coupon applied successfully',
      coupon: {
        code: coupon.code,
        coupon_type: coupon.coupon_type,
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
 * Record Coupon Usage with type-specific notifications
 */
export const recordCouponUsage = async (user_id, coupon_code, discount_amount) => {
  try {
    const coupon = await Coupon.findOne({ where: { code: coupon_code } });
    if (!coupon) return false;

    await UserCoupon.create({
      user_id,
      coupon_id: coupon.id,
      discount_amount,
      used_at: new Date(),
    });

    coupon.used_count += 1;
    await coupon.save();

    const user = await User.findByPk(user_id);

    if (user) {
      const discountDisplay = coupon.discount_type === 'percentage'
        ? `${coupon.discount_value}%`
        : `₹${coupon.discount_value}`;

      // Send different notifications based on coupon type
      let emailTemplate, smsTemplate, whatsappTemplate;

      switch(coupon.coupon_type) {
        case 'promotional':
          emailTemplate = couponTemplates.promotionalCouponUsedEmail({
            name: user.name,
            couponCode: coupon.code,
            discount: discountDisplay,
          });
          smsTemplate = couponTemplates.promotionalCouponUsedSMS({
            couponCode: coupon.code,
            discount: discountDisplay,
          });
          whatsappTemplate = couponTemplates.promotionalCouponUsedWhatsApp({
            name: user.name,
            couponCode: coupon.code,
            discount: discountDisplay,
          });
          break;

        case 'referral':
          // Send notification to referrer if applicable
          emailTemplate = couponTemplates.referralCouponUsedEmail({
            name: user.name,
            couponCode: coupon.code,
            discount: discountDisplay,
          });
          smsTemplate = couponTemplates.referralCouponUsedSMS({
            couponCode: coupon.code,
          });
          whatsappTemplate = couponTemplates.referralCouponUsedWhatsApp({
            name: user.name,
            couponCode: coupon.code,
            discount: discountDisplay,
          });
          break;

        case 'retention':
          emailTemplate = couponTemplates.retentionCouponUsedEmail({
            name: user.name,
            couponCode: coupon.code,
            discount: discountDisplay,
          });
          smsTemplate = couponTemplates.retentionCouponUsedSMS({
            couponCode: coupon.code,
          });
          whatsappTemplate = couponTemplates.retentionCouponUsedWhatsApp({
            name: user.name,
            couponCode: coupon.code,
            discount: discountDisplay,
          });
          break;

        default:
          emailTemplate = couponTemplates.couponAppliedEmail({
            name: user.name,
            couponCode: coupon.code,
            discount: discountDisplay,
            finalAmount: 0,
          });
          smsTemplate = couponTemplates.couponAppliedSMS({
            couponCode: coupon.code,
            finalAmount: 0,
          });
          whatsappTemplate = couponTemplates.couponAppliedWhatsApp({
            name: user.name,
            couponCode: coupon.code,
            discount: discountDisplay,
            finalAmount: 0,
          });
      }

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
 * Validate Coupon for Payment
 */
export const validateCouponForPayment = async (code, plan_name, user_id) => {
  try {
    const today = new Date();

    const coupon = await Coupon.findOne({
      where: {
        code: code.toUpperCase(),
        is_active: true,
        valid_from: { [Op.lte]: today },
        valid_until: { [Op.gte]: today },
        [Op.and]: [
          {
            [Op.or]: [
              { applicable_plan: 'all' },
              { applicable_plan: plan_name },
              { applicable_plan: { [Op.like]: `%${plan_name}%` } }, // For comma-separated plans
              { applicable_plan: { [Op.like]: `${plan_name},%` } }, // For start of list
              { applicable_plan: { [Op.like]: `%,${plan_name}` } }, // For end of list
              { applicable_plan: { [Op.like]: `%,${plan_name},%` } }, // For middle of list
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
      // Check coupon type specific validations
      let validationError = null;
      
      switch(coupon.coupon_type) {
        case 'promotional':
          const usedPromotional = await UserCoupon.findOne({
            include: [{
              model: Coupon,
              where: { coupon_type: 'promotional' }
            }],
            where: { user_id }
          });
          if (usedPromotional) {
            validationError = 'You have already used a promotional coupon.';
          }
          break;

        case 'retention':
          // Check if user has an active subscription expiring soon
          const activeSubscription = await UserSubscription.findOne({
            where: { 
              user_id, 
              is_active: true,
              end_date: { 
                [Op.gte]: today,
                [Op.lte]: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
              }
            }
          });
          if (!activeSubscription) {
            validationError = 'Retention coupons are only for users with subscriptions expiring soon.';
          }
          break;
      }

      if (validationError) {
        return { valid: false, message: validationError };
      }

      // Check general usage
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
 * Get coupons by type (for payment flows)
 */
export const getCouponsByType = async (req, res) => {
  try {
    const { type } = req.params;
    const { plan_name } = req.query;

    if (!['promotional', 'referral', 'global', 'retention'].includes(type)) {
      return res.status(400).json({ message: 'Invalid coupon type' });
    }

    const today = new Date();
    const whereClause = {
      coupon_type: type,
      is_active: true,
      valid_from: { [Op.lte]: today },
      valid_until: { [Op.gte]: today },
      [Op.or]: [
        { usage_limit: null },
        { usage_limit: { [Op.gt]: col('used_count') } },
      ],
    };

    // Filter by plan if provided
    if (plan_name) {
      whereClause[Op.or] = [
        { applicable_plan: 'all' },
        { applicable_plan: plan_name }
      ];
    }

    const coupons = await Coupon.findAll({
      where: whereClause,
      order: [['createdAt', 'DESC']],
    });

    return res.status(200).json({ coupons });
  } catch (error) {
    return res.status(500).json({ message: 'Error fetching coupons', error: error.message });
  }
};

/**
 * Public: Get available global coupons (for payment screen)
 */
export const getGlobalCoupons = async (req, res) => {
  try {
    const today = new Date();

    const coupons = await Coupon.findAll({
      where: {
        coupon_type: 'global',
        is_active: true,
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
    return res.status(500).json({ message: 'Error fetching global coupons', error: error.message });
  }
};

/**
 * Send promotional coupon to new users
 */
export const sendWelcomeCoupon = async (req, res) => {
  try {
    const { user_id } = req.body;
    
    const user = await User.findByPk(user_id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Find an available promotional coupon
    const today = new Date();
    const coupon = await Coupon.findOne({
      where: {
        coupon_type: 'promotional',
        is_active: true,
        valid_from: { [Op.lte]: today },
        valid_until: { [Op.gte]: today },
        [Op.or]: [
          { usage_limit: null },
          { usage_limit: { [Op.gt]: col('used_count') } },
        ],
      },
      order: [['createdAt', 'DESC']],
    });

    if (!coupon) {
      return res.status(404).json({ message: 'No promotional coupons available' });
    }

    // Send notification to user
    const discountDisplay = coupon.discount_type === 'percentage'
      ? `${coupon.discount_value}%`
      : `₹${coupon.discount_value}`;

    const emailTemplate = couponTemplates.welcomeCouponEmail({
      name: user.name,
      couponCode: coupon.code,
      discount: discountDisplay,
      expiryHours: 48, // Default for welcome coupons
    });

    const smsTemplate = couponTemplates.welcomeCouponSMS({
      couponCode: coupon.code,
      expiryHours: 48,
    });

    const whatsappTemplate = couponTemplates.welcomeCouponWhatsApp({
      name: user.name,
      couponCode: coupon.code,
      discount: discountDisplay,
      expiryHours: 48,
    });

    await Promise.all([
      sendEmail(user.email, emailTemplate.subject, emailTemplate.text),
      sendSMS(user.mobile_number, smsTemplate),
      sendWhatsApp(user.mobile_number, whatsappTemplate),
    ]);

    return res.status(200).json({
      message: 'Welcome coupon sent successfully',
      coupon: {
        code: coupon.code,
        discount_type: coupon.discount_type,
        discount_value: coupon.discount_value,
        valid_until: coupon.valid_until,
      },
    });

  } catch (error) {
    console.error('Error sending welcome coupon:', error);
    return res.status(500).json({ message: 'Error sending welcome coupon', error: error.message });
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
 * Public: Get Active + Valid Coupons (all types)
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
 * Public: Get All Coupons applicable for a specific plan
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
      coupon_type: coupon.coupon_type,
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