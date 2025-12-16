import Razorpay from 'razorpay';
import { v4 as uuidv4 } from 'uuid';
import db from '../models/index.js';
import { sendNotification } from "../utils/notification.js";
import { subscriptionTemplates } from "../templates/subscription.template.js";
import { Op, col } from 'sequelize';
import crypto from 'crypto';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// -----------------------------------------------------------
// HELPER — Check coupon is applicable for plan
// -----------------------------------------------------------
const isCouponApplicableForPlan = (couponApplicablePlan, planName) => {
  if (couponApplicablePlan === 'all') return true;

  const applicablePlans = couponApplicablePlan.split(',').map(p => p.trim());
  if (applicablePlans.includes(planName)) return true;

  return applicablePlans.some(p => p.toLowerCase() === planName.toLowerCase());
};

// ===================================================================
// CREATE ORDER
// ===================================================================
export const createOrder = async (req, res) => {
  const { user_id, plan_id, coupon_code, plan_name } = req.body;

  try {
    console.log('Create Order Request:', { user_id, plan_id, coupon_code, plan_name });

    const plan = await db.SubscriptionPlan.findByPk(plan_id);
    if (!plan) return res.status(404).json({ message: 'Plan not found' });

    if (plan_name && plan.plan_name !== plan_name) {
      return res.status(400).json({ message: 'Plan ID and Plan Name mismatch' });
    }

    const basePrice = parseFloat(plan.price);
    const actualPlanName = plan.plan_name;

    const gstRate = 18;
    const gstAmount = (basePrice * gstRate) / 100;

    let finalPrice = basePrice + gstAmount;
    let appliedCoupon = null;
    let discountAmount = 0;

    // ----------------------------------------------------------
    // APPLY COUPON
    // ----------------------------------------------------------
    if (coupon_code) {
      const today = new Date();

      appliedCoupon = await db.Coupon.findOne({
        where: {
          code: coupon_code.toUpperCase(),
          is_active: true,
          valid_from: { [Op.lte]: today },
          valid_until: { [Op.gte]: today },
          [Op.or]: [
            { usage_limit: null },
            { usage_limit: { [Op.gt]: col('used_count') } },
          ],
        },
        include: [
          {
            model: db.UserCoupon,
            as: "UsersUsed",
            required: false
          }
        ]
      });

      if (!appliedCoupon) {
        return res.status(404).json({
          message: 'Coupon not found, expired, or usage limit reached.',
        });
      }

      // check plan
      if (!isCouponApplicableForPlan(appliedCoupon.applicable_plan, actualPlanName)) {
        return res.status(400).json({
          message: `Coupon ${appliedCoupon.code} not applicable for ${actualPlanName}`,
        });
      }

      // check user already used
      const alreadyUsed = await db.UserCoupon.findOne({
        where: { user_id, coupon_id: appliedCoupon.id },
      });

      if (alreadyUsed) {
        return res.status(400).json({
          message: 'You have already used this coupon.',
          coupon_code: appliedCoupon.code,
        });
      }

      // SPECIAL COUPON HANDLING
      let validationError = null;

      if (appliedCoupon.coupon_type === 'promotional') {
        const usedPromotional = await db.UserCoupon.findOne({
          include: [{
            model: db.Coupon,
            as: "Coupon",
            where: { coupon_type: 'promotional' }
          }],
          where: { user_id }
        });

        if (usedPromotional) {
          validationError = 'You have already used a promotional coupon.';
        }
      }

      if (validationError) {
        return res.status(400).json({ message: validationError });
      }

      // prevent pending duplicate
      const pending = await db.Payment.findOne({
        where: {
          user_id,
          coupon_code: appliedCoupon.code,
          status: 'created'
        }
      });

      if (pending) {
        return res.status(400).json({
          message: 'You already applied this coupon in a pending order.',
        });
      }

      // ---------------------------------------
      // APPLY DISCOUNT (industry standard)
      // ---------------------------------------
      if (appliedCoupon.discount_type === 'percentage') {
        discountAmount = (finalPrice * appliedCoupon.discount_value) / 100;
      } else {
        discountAmount = appliedCoupon.discount_value;
      }

      discountAmount = Math.round(discountAmount * 100) / 100;

      // apply discount
      finalPrice -= discountAmount;

      // Prevent negative or zero – Razorpay requires minimum ₹1
      if (finalPrice <= 0) {
        finalPrice = 1;

        // adjust actual discount
        discountAmount = basePrice + gstAmount - 1;
      }
    }

    const amount = Math.round(finalPrice * 100); // convert to paise

    const receipt = `rcpt_${Date.now()}_${user_id.slice(0, 6)}`.slice(0, 40);

    const order = await razorpay.orders.create({
      amount,
      currency: 'INR',
      receipt,
    });

    // SAVE PAYMENT
    const payment = await db.Payment.create({
      user_id,
      plan_id,
      razorpay_order_id: order.id,
      base_amount: basePrice,
      tax_percentage: gstRate,
      tax_amount: gstAmount,
      amount: finalPrice,
      discount_amount: discountAmount,
      coupon_code: appliedCoupon ? appliedCoupon.code : null,
      coupon_type: appliedCoupon ? appliedCoupon.coupon_type : null,
      currency: 'INR',
      status: 'created',
    });

    return res.json({
      order_id: order.id,
      base_amount: basePrice,
      gst_percentage: gstRate,
      gst_amount: gstAmount,
      discount_amount: discountAmount,
      coupon_code: appliedCoupon ? appliedCoupon.code : null,
      coupon_type: appliedCoupon ? appliedCoupon.coupon_type : null,
      applied_to_plan: actualPlanName,
      total_amount: finalPrice,
      currency: 'INR',
      payment_id: payment.id,
    });

  } catch (err) {
    console.error("Error in createOrder:", err);
    return res.status(500).json({ message: "Error creating order", error: err.message });
  }
};


// ===================================================================
// VERIFY PAYMENT
// ===================================================================
export const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    // signature verification
    if (process.env.NODE_ENV !== 'development') {
      const expected = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest("hex");

      if (expected !== razorpay_signature) {
        return res.status(400).json({ message: "Invalid payment signature" });
      }
    }

    const payment = await db.Payment.findOne({ where: { razorpay_order_id } });
    if (!payment) return res.status(404).json({ message: "Payment not found" });

    payment.razorpay_payment_id = razorpay_payment_id;
    payment.status = "paid";
    payment.paid_at = new Date();
    await payment.save();

    const user_id = payment.user_id;
    const plan_id = payment.plan_id;
    const plan = await db.SubscriptionPlan.findByPk(plan_id);

    const now = new Date();

    // existing subscription
    const existing = await db.UserSubscription.findOne({
      where: {
        user_id,
        is_active: true,
        end_date: { [Op.gt]: now }
      },
      order: [["created_at", "DESC"]],
    });

    let carryForward = 0;
    let startDate;
    let endDate;

    if (existing) {
      carryForward = existing.contacts_remaining;
      existing.is_active = false;
      await existing.save();

      startDate = existing.end_date;
      endDate = new Date(existing.end_date);
      endDate.setDate(endDate.getDate() + plan.duration_days);
    } else {
      startDate = now;
      endDate = new Date();
      endDate.setDate(endDate.getDate() + plan.duration_days);
    }

    const newRemaining = plan.contact_limit + carryForward;

    await db.UserSubscription.create({
      user_id,
      plan_id,
      payment_id: payment.id,
      start_date: startDate,
    end_date: endDate,
      contacts_remaining: newRemaining,
      is_active: true,
    });

    // update coupon usage
    if (payment.coupon_code) {
      const coupon = await db.Coupon.findOne({
        where: { code: payment.coupon_code }
      });

      if (coupon) {
        await db.UserCoupon.create({
          user_id,
          coupon_id: coupon.id,
          coupon_type: coupon.coupon_type,
          discount_amount: payment.discount_amount,
          used_at: new Date(),
          applied_plan: plan.plan_name,
        });

        coupon.used_count += 1;
        await coupon.save();
      }
    }

    const user = await db.User.findByPk(user_id);

    if (user) {
      const params = {
        plan: plan.plan_name,
        price: Number(plan.price),
        duration: plan.duration_days,
        userName: user.name,
        couponCode: payment.coupon_code,
        couponType: payment.coupon_type,
        discountAmount: Number(payment.discount_amount) || 0,
      };

      await sendNotification({
        type: "email",
        recipient: user.email,
        subject: "Subscription Activated - Dronacharya",
        template_name: "subscriptionTemplates.confirmation.email",
        params: { message: subscriptionTemplates.confirmation.email(params) },
      });

      await sendNotification({
        type: "sms",
        recipient: user.mobile_number,
        template_name: "subscriptionTemplates.confirmation.sms",
        params: { message: subscriptionTemplates.confirmation.sms(params) },
      });

      await sendNotification({
        type: "whatsapp",
        recipient: user.mobile_number,
        template_name: "subscriptionTemplates.confirmation.whatsapp",
        params: { message: subscriptionTemplates.confirmation.whatsapp(params) },
      });
    }

    return res.json({
      message: "Payment verified & subscription activated",
      subscription: {
        plan_name: plan.plan_name,
        start_date: startDate,
         end_date: endDate,
        contacts_remaining: newRemaining,
        carried_from_old: carryForward,
        coupon_used: payment.coupon_code,
        coupon_type: payment.coupon_type,
        discount_amount: payment.discount_amount,
      },
    });

  } catch (err) {
    console.error("Error in verifyPayment:", err);
    return res.status(500).json({ message: "Verification failed", error: err.message });
  }
};


// ===================================================================
// CANCEL PENDING COUPON
// ===================================================================
export const cancelPendingCoupon = async (req, res) => {
  try {
    const { user_id, coupon_code } = req.body;

    const pending = await db.Payment.findOne({
      where: { user_id, coupon_code, status: 'created' }
    });

    if (pending) {
      pending.status = "cancelled";
      await pending.save();
      return res.json({ message: "Coupon removed successfully." });
    }

    return res.json({ message: "No pending coupon to remove." });

  } catch (err) {
    console.error("Error in cancelPendingCoupon:", err);
    return res.status(500).json({ message: "Error while removing coupon", error: err.message });
  }
};
