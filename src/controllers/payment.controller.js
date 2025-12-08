
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

// ------------------------
// Create Razorpay Order (with 18% GST and optional coupon)
// ------------------------
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

    // Apply GST (18%)
    const gstRate = 18;
    const gstAmount = (basePrice * gstRate) / 100;
    let finalPrice = basePrice + gstAmount;

    let appliedCoupon = null;
    let discountAmount = 0;

    if (coupon_code) {
      const today = new Date();

      // Validate coupon: active, date, usage, plan applicability
      appliedCoupon = await db.Coupon.findOne({
        where: {
          code: coupon_code,
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

      if (!appliedCoupon) {
        return res.status(404).json({ message: 'Invalid or expired coupon for this plan.' });
      }

      // Check if user already used this coupon
      const alreadyUsed = await db.UserCoupon.findOne({
        where: { user_id, coupon_id: appliedCoupon.id },
      });

      if (alreadyUsed) {
        return res.status(400).json({ message: 'You have already used this coupon.' });
      }

      // Prevent multiple pending orders with the same coupon
     const pendingPayment = await db.Payment.findOne({
  where: {
    user_id,
    coupon_code: appliedCoupon.code,
    status: ['created'], // check only active unpaid
  },
});

// If user removed earlier coupon, that order is now "cancelled", so ignore it
if (pendingPayment) {
  return res.status(400).json({ message: 'You have already applied this coupon in a pending payment.' });
}


      // Calculate discount
      discountAmount = appliedCoupon.discount_type === 'percentage'
        ? (finalPrice * appliedCoupon.discount_value) / 100
        : appliedCoupon.discount_value;

      finalPrice -= discountAmount;
      if (finalPrice < 0) finalPrice = 0;
    }

    const amount = Math.round(finalPrice * 100);
    const shortReceipt = `rcpt_${Date.now()}_${user_id.slice(0, 6)}`.slice(0, 40);

    const order = await razorpay.orders.create({
      amount,
      currency: 'INR',
      receipt: shortReceipt,
    });

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
      currency: 'INR',
      status: 'created',
    });

    res.json({
      order_id: order.id,
      base_amount: basePrice,
      gst_percentage: gstRate,
      gst_amount: gstAmount,
      discount_amount: discountAmount,
      coupon_code: appliedCoupon ? appliedCoupon.code : null,
      total_amount: finalPrice,
      currency: 'INR',
      payment_id: payment.id,
    });
  } catch (err) {
    console.error('Error in createOrder:', err);
    if (err.error?.description) {
      return res.status(400).json({ message: `Payment error: ${err.error.description}` });
    }
    res.status(500).json({ message: 'Error creating order', error: err.message });
  }
};

// ------------------------
// Verify Razorpay Payment
// ------------------------
// ------------------------
// Verify Razorpay Payment (FINAL UPDATED VERSION)
// ------------------------
export const verifyPayment = async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  try {
    // -----------------------------
    // Signature Validation
    // -----------------------------
    if (process.env.NODE_ENV !== "development") {
      const expectedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(razorpay_order_id + "|" + razorpay_payment_id)
        .digest("hex");

      if (expectedSignature !== razorpay_signature) {
        return res.status(400).json({ message: "Invalid payment signature" });
      }
    }

    // -----------------------------
    // Fetch payment details
    // -----------------------------
    const payment = await db.Payment.findOne({ where: { razorpay_order_id } });
    if (!payment) return res.status(404).json({ message: "Payment not found" });

    const user_id = payment.user_id;  
    const plan_id = payment.plan_id;

    // Mark payment as paid
    payment.razorpay_payment_id = razorpay_payment_id;
    payment.status = "paid";
    payment.paid_at = new Date();
    await payment.save();

    // Fetch plan
    const plan = await db.SubscriptionPlan.findByPk(plan_id);
    const now = new Date();

    // -----------------------------
    // Find active & unexpired subscription
    // -----------------------------
    const existingSub = await db.UserSubscription.findOne({
      where: {
        user_id,
        is_active: true,
        end_date: { [Op.gt]: now }, // only valid subscriptions
      },
      order: [["created_at", "DESC"]],
    });

    let carryForward = 0;

    if (existingSub) {
      // Store remaining contacts
      carryForward = existingSub.contacts_remaining;

      // Deactivate old one
      existingSub.is_active = false;
      await existingSub.save();
    }

    // -----------------------------
    // STACK VALIDITY LOGIC (IMPORTANT)
    // -----------------------------
    let startDate;
    let endDate;

    if (existingSub) {
      // New plan starts after old expiry
      startDate = existingSub.end_date;
      endDate = new Date(existingSub.end_date);
      endDate.setDate(endDate.getDate() + plan.duration_days);
    } else {
      // No subscription -> start today
      startDate = now;
      endDate = new Date();
      endDate.setDate(endDate.getDate() + plan.duration_days);
    }

    // Add new limit + carry forward contacts
    const newContactsRemaining = plan.contact_limit + carryForward;

    // Create new subscription
    await db.UserSubscription.create({
      user_id,
      plan_id,
      payment_id: payment.id,
      start_date: startDate,
      end_date: endDate,
      contacts_remaining: newContactsRemaining,
      is_active: true,
    });

    // -----------------------------
    // Coupon handling
    // -----------------------------
    if (payment.coupon_code) {
      const coupon = await db.Coupon.findOne({ where: { code: payment.coupon_code } });
      if (coupon) {
        await db.UserCoupon.create({
          user_id,
          coupon_id: coupon.id,
          discount_amount: payment.discount_amount,
          used_at: new Date(),
        });

        coupon.used_count += 1;
        await coupon.save();
      }
    }

    // -----------------------------
    // Notifications
    // -----------------------------
    const user = await db.User.findByPk(user_id);

    if (user) {
      const params = {
        plan: plan.plan_name,
        price: Number(plan.price),
        duration: plan.duration_days,
        userName: user.name,
        couponCode: payment.coupon_code,
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
      message: "Payment verified and subscription activated",
      subscription: {
        plan_name: plan.plan_name,
        start_date: startDate,
        end_date: endDate,
        contacts_remaining: newContactsRemaining,
        carried_from_old: carryForward,
      },
    });

  } catch (err) {
    console.error("Error in verifyPayment:", err);
    return res.status(500).json({ message: "Verification failed", error: err.message });
  }
};

export const cancelPendingCoupon = async (req, res) => {
  const { user_id, coupon_code } = req.body;

  try {
    // Find any pending unpaid order for this user and coupon
    const pendingPayment = await db.Payment.findOne({
      where: {
        user_id,
        coupon_code,
        status: 'created', // unpaid
      },
    });

    if (pendingPayment) {
      // Mark it as cancelled
      pendingPayment.status = 'cancelled';
      await pendingPayment.save();
      return res.status(200).json({ message: 'Coupon removed successfully.' });
    }

    res.status(200).json({ message: 'No pending coupon to remove.' });
  } catch (error) {
    console.error('Error while removing coupon:', error);
    res.status(500).json({ message: 'Error while removing coupon', error: error.message });
  }
};