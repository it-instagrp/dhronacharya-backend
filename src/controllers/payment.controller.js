import Razorpay from 'razorpay';
import { v4 as uuidv4 } from 'uuid';
import db from '../models/index.js';
import { sendNotification } from "../utils/notification.js"; 
import { subscriptionTemplates } from "../templates/subscription.template.js";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ------------------------
// Create Razorpay Order (with 18% GST and optional coupon)
// ------------------------
export const createOrder = async (req, res) => {
  const { user_id, plan_id, coupon_code } = req.body;

  try {
    console.log('Create Order Request:', { user_id, plan_id, coupon_code });

    const plan = await db.SubscriptionPlan.findByPk(plan_id);
    if (!plan) return res.status(404).json({ message: 'Plan not found' });

    // Base price from DB
    const basePrice = parseFloat(plan.price);

    // Apply GST (18%)
    const gstRate = 18;
    const gstAmount = (basePrice * gstRate) / 100;
    let finalPrice = basePrice + gstAmount;

    let appliedCoupon = null;
    let discountAmount = 0;

    // If coupon code provided, check validity
    if (coupon_code) {
      appliedCoupon = await db.Coupon.findOne({
        where: { code: coupon_code, is_active: true },
      });

      if (appliedCoupon) {
        discountAmount = appliedCoupon.discount_type === 'percentage'
          ? (finalPrice * appliedCoupon.discount_value) / 100
          : appliedCoupon.discount_value;

        finalPrice -= discountAmount;
        if (finalPrice < 0) finalPrice = 0;
      }
    }

    // Razorpay expects amount in paise
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
    console.error('❌ Error in createOrder:', err);
    res.status(500).json({ message: 'Error creating order', error: err.message });
  }
};

// ------------------------
// Verify Razorpay Payment
// ------------------------
export const verifyPayment = async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  try {
    const payment = await db.Payment.findOne({ where: { razorpay_order_id } });
    if (!payment) return res.status(404).json({ message: "Payment not found" });

payment.razorpay_payment_id = razorpay_payment_id;
payment.status = "paid";

// ✅ Merge existing info with Razorpay response
payment.payment_gateway_response = {
  ...(payment.payment_gateway_response || {}),
  ...req.body,
  base_amount: payment.base_amount,
  gst_percentage: payment.tax_percentage,
  gst_amount: payment.tax_amount,
  discount_amount: payment.discount_amount,
  coupon_code: payment.coupon_code,
  total_amount: payment.amount,
};

await payment.save();


    const plan = await db.SubscriptionPlan.findByPk(payment.plan_id);
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(startDate.getDate() + plan.duration_days);

    await db.UserSubscription.create({
      user_id: payment.user_id,
      plan_id: plan.id,
      payment_id: payment.id,
      start_date: startDate,
      end_date: endDate,
      contacts_remaining: plan.contact_limit,
      is_active: true,
    });

    const user = await db.User.findByPk(payment.user_id);
    if (user) {
      const params = {
        plan: plan.plan_name,
        price: plan.price,
        duration: plan.duration_days,
        userName: user.name,
        couponCode: payment.coupon_code,
        discountAmount: payment.discount_amount || 0,
      };

      // Send notifications
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

    res.json({ message: "Payment verified and subscription activated" });
  } catch (err) {
    console.error("Error in verifyPayment:", err);
    res.status(500).json({ message: "Verification failed", error: err.message });
  }
};
