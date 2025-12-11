
// import Razorpay from 'razorpay';
// import { v4 as uuidv4 } from 'uuid';
// import db from '../models/index.js';
// import { sendNotification } from "../utils/notification.js";
// import { subscriptionTemplates } from "../templates/subscription.template.js";
// import { Op, col } from 'sequelize';
// import crypto from 'crypto';

// const razorpay = new Razorpay({
//   key_id: process.env.RAZORPAY_KEY_ID,
//   key_secret: process.env.RAZORPAY_KEY_SECRET,
// });

// // ------------------------
// // Create Razorpay Order (with 18% GST and optional coupon)
// // ------------------------
// export const createOrder = async (req, res) => {
//   const { user_id, plan_id, coupon_code, plan_name } = req.body;

//   try {
//     console.log('Create Order Request:', { user_id, plan_id, coupon_code, plan_name });

//     const plan = await db.SubscriptionPlan.findByPk(plan_id);
//     if (!plan) return res.status(404).json({ message: 'Plan not found' });

//     if (plan_name && plan.plan_name !== plan_name) {
//       return res.status(400).json({ message: 'Plan ID and Plan Name mismatch' });
//     }

//     const basePrice = parseFloat(plan.price);

//     // Apply GST (18%)
//     const gstRate = 18;
//     const gstAmount = (basePrice * gstRate) / 100;
//     let finalPrice = basePrice + gstAmount;

//     let appliedCoupon = null;
//     let discountAmount = 0;

//     if (coupon_code) {
//       const today = new Date();

//       // Validate coupon: active, date, usage, plan applicability
//       appliedCoupon = await db.Coupon.findOne({
//         where: {
//           code: coupon_code,
//           is_active: true,
//           valid_from: { [Op.lte]: today },
//           valid_until: { [Op.gte]: today },
//           [Op.and]: [
//             {
//               [Op.or]: [
//                 { applicable_plan: 'all' },
//                 { applicable_plan: plan.plan_name },
//               ],
//             },
//             {
//               [Op.or]: [
//                 { usage_limit: null },
//                 { usage_limit: { [Op.gt]: col('used_count') } },
//               ],
//             },
//           ],
//         },
//       });

//       if (!appliedCoupon) {
//         return res.status(404).json({ message: 'Invalid or expired coupon for this plan.' });
//       }

//       // Check if user already used this coupon
//       const alreadyUsed = await db.UserCoupon.findOne({
//         where: { user_id, coupon_id: appliedCoupon.id },
//       });

//       if (alreadyUsed) {
//         return res.status(400).json({ message: 'You have already used this coupon.' });
//       }

//       // Prevent multiple pending orders with the same coupon
//      const pendingPayment = await db.Payment.findOne({
//   where: {
//     user_id,
//     coupon_code: appliedCoupon.code,
//     status: ['created'], // check only active unpaid
//   },
// });

// // If user removed earlier coupon, that order is now "cancelled", so ignore it
// if (pendingPayment) {
//   return res.status(400).json({ message: 'You have already applied this coupon in a pending payment.' });
// }


//       // Calculate discount
//       discountAmount = appliedCoupon.discount_type === 'percentage'
//         ? (finalPrice * appliedCoupon.discount_value) / 100
//         : appliedCoupon.discount_value;

//       finalPrice -= discountAmount;
//       if (finalPrice < 0) finalPrice = 0;
//     }

//     const amount = Math.round(finalPrice * 100);
//     const shortReceipt = `rcpt_${Date.now()}_${user_id.slice(0, 6)}`.slice(0, 40);

//     const order = await razorpay.orders.create({
//       amount,
//       currency: 'INR',
//       receipt: shortReceipt,
//     });

//     const payment = await db.Payment.create({
//       user_id,
//       plan_id,
//       razorpay_order_id: order.id,
//       base_amount: basePrice,
//       tax_percentage: gstRate,
//       tax_amount: gstAmount,
//       amount: finalPrice,
//       discount_amount: discountAmount,
//       coupon_code: appliedCoupon ? appliedCoupon.code : null,
//       currency: 'INR',
//       status: 'created',
//     });

//     res.json({
//       order_id: order.id,
//       base_amount: basePrice,
//       gst_percentage: gstRate,
//       gst_amount: gstAmount,
//       discount_amount: discountAmount,
//       coupon_code: appliedCoupon ? appliedCoupon.code : null,
//       total_amount: finalPrice,
//       currency: 'INR',
//       payment_id: payment.id,
//     });
//   } catch (err) {
//     console.error('Error in createOrder:', err);
//     if (err.error?.description) {
//       return res.status(400).json({ message: `Payment error: ${err.error.description}` });
//     }
//     res.status(500).json({ message: 'Error creating order', error: err.message });
//   }
// };

// // ------------------------
// // Verify Razorpay Payment
// // ------------------------
// // ------------------------
// // Verify Razorpay Payment (FINAL UPDATED VERSION)
// // ------------------------
// export const verifyPayment = async (req, res) => {
//   const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

//   try {
//     // -----------------------------
//     // Signature Validation
//     // -----------------------------
//     if (process.env.NODE_ENV !== "development") {
//       const expectedSignature = crypto
//         .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
//         .update(razorpay_order_id + "|" + razorpay_payment_id)
//         .digest("hex");

//       if (expectedSignature !== razorpay_signature) {
//         return res.status(400).json({ message: "Invalid payment signature" });
//       }
//     }

//     // -----------------------------
//     // Fetch payment details
//     // -----------------------------
//     const payment = await db.Payment.findOne({ where: { razorpay_order_id } });
//     if (!payment) return res.status(404).json({ message: "Payment not found" });

//     const user_id = payment.user_id;  
//     const plan_id = payment.plan_id;

//     // Mark payment as paid
//     payment.razorpay_payment_id = razorpay_payment_id;
//     payment.status = "paid";
//     payment.paid_at = new Date();
//     await payment.save();

//     // Fetch plan
//     const plan = await db.SubscriptionPlan.findByPk(plan_id);
//     const now = new Date();

//     // -----------------------------
//     // Find active & unexpired subscription
//     // -----------------------------
//     const existingSub = await db.UserSubscription.findOne({
//       where: {
//         user_id,
//         is_active: true,
//         end_date: { [Op.gt]: now }, // only valid subscriptions
//       },
//       order: [["created_at", "DESC"]],
//     });

//     let carryForward = 0;

//     if (existingSub) {
//       // Store remaining contacts
//       carryForward = existingSub.contacts_remaining;

//       // Deactivate old one
//       existingSub.is_active = false;
//       await existingSub.save();
//     }

//     // -----------------------------
//     // STACK VALIDITY LOGIC (IMPORTANT)
//     // -----------------------------
//     let startDate;
//     let endDate;

//     if (existingSub) {
//       // New plan starts after old expiry
//       startDate = existingSub.end_date;
//       endDate = new Date(existingSub.end_date);
//       endDate.setDate(endDate.getDate() + plan.duration_days);
//     } else {
//       // No subscription -> start today
//       startDate = now;
//       endDate = new Date();
//       endDate.setDate(endDate.getDate() + plan.duration_days);
//     }

//     // Add new limit + carry forward contacts
//     const newContactsRemaining = plan.contact_limit + carryForward;

//     // Create new subscription
//     await db.UserSubscription.create({
//       user_id,
//       plan_id,
//       payment_id: payment.id,
//       start_date: startDate,
//       end_date: endDate,
//       contacts_remaining: newContactsRemaining,
//       is_active: true,
//     });

//     // -----------------------------
//     // Coupon handling
//     // -----------------------------
//     if (payment.coupon_code) {
//       const coupon = await db.Coupon.findOne({ where: { code: payment.coupon_code } });
//       if (coupon) {
//         await db.UserCoupon.create({
//           user_id,
//           coupon_id: coupon.id,
//           discount_amount: payment.discount_amount,
//           used_at: new Date(),
//         });

//         coupon.used_count += 1;
//         await coupon.save();
//       }
//     }

//     // -----------------------------
//     // Notifications
//     // -----------------------------
//     const user = await db.User.findByPk(user_id);

//     if (user) {
//       const params = {
//         plan: plan.plan_name,
//         price: Number(plan.price),
//         duration: plan.duration_days,
//         userName: user.name,
//         couponCode: payment.coupon_code,
//         discountAmount: Number(payment.discount_amount) || 0,
//       };

//       await sendNotification({
//         type: "email",
//         recipient: user.email,
//         subject: "Subscription Activated - Dronacharya",
//         template_name: "subscriptionTemplates.confirmation.email",
//         params: { message: subscriptionTemplates.confirmation.email(params) },
//       });

//       await sendNotification({
//         type: "sms",
//         recipient: user.mobile_number,
//         template_name: "subscriptionTemplates.confirmation.sms",
//         params: { message: subscriptionTemplates.confirmation.sms(params) },
//       });

//       await sendNotification({
//         type: "whatsapp",
//         recipient: user.mobile_number,
//         template_name: "subscriptionTemplates.confirmation.whatsapp",
//         params: { message: subscriptionTemplates.confirmation.whatsapp(params) },
//       });
//     }

//     return res.json({
//       message: "Payment verified and subscription activated",
//       subscription: {
//         plan_name: plan.plan_name,
//         start_date: startDate,
//         end_date: endDate,
//         contacts_remaining: newContactsRemaining,
//         carried_from_old: carryForward,
//       },
//     });

//   } catch (err) {
//     console.error("Error in verifyPayment:", err);
//     return res.status(500).json({ message: "Verification failed", error: err.message });
//   }
// };

// export const cancelPendingCoupon = async (req, res) => {
//   const { user_id, coupon_code } = req.body;

//   try {
//     // Find any pending unpaid order for this user and coupon
//     const pendingPayment = await db.Payment.findOne({
//       where: {
//         user_id,
//         coupon_code,
//         status: 'created', // unpaid
//       },
//     });

//     if (pendingPayment) {
//       // Mark it as cancelled
//       pendingPayment.status = 'cancelled';
//       await pendingPayment.save();
//       return res.status(200).json({ message: 'Coupon removed successfully.' });
//     }

//     res.status(200).json({ message: 'No pending coupon to remove.' });
//   } catch (error) {
//     console.error('Error while removing coupon:', error);
//     res.status(500).json({ message: 'Error while removing coupon', error: error.message });
//   }
// };

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

// Helper function to check if coupon is applicable for a plan
const isCouponApplicableForPlan = (couponApplicablePlan, planName) => {
  if (couponApplicablePlan === 'all') {
    return true;
  }
  
  // Split by comma and check each plan
  const applicablePlans = couponApplicablePlan
    .split(',')
    .map(plan => plan.trim());
  
  // Direct match
  if (applicablePlans.includes(planName)) {
    return true;
  }
  
  // Check for case-insensitive matches
  for (const applicablePlan of applicablePlans) {
    if (applicablePlan.toLowerCase() === planName.toLowerCase()) {
      return true;
    }
  }
  
  return false;
};

// ------------------------
// Create Razorpay Order (with 18% GST and optional coupon)
// ------------------------
export const createOrder = async (req, res) => {
  const { user_id, plan_id, coupon_code, plan_name } = req.body;

  try {
    console.log('Create Order Request:', { user_id, plan_id, coupon_code, plan_name });

    // Get the plan
    const plan = await db.SubscriptionPlan.findByPk(plan_id);
    if (!plan) return res.status(404).json({ message: 'Plan not found' });

    // Validate plan name if provided
    if (plan_name && plan.plan_name !== plan_name) {
      return res.status(400).json({ message: 'Plan ID and Plan Name mismatch' });
    }

    const basePrice = parseFloat(plan.price);
    const actualPlanName = plan.plan_name;

    // Apply GST (18%)
    const gstRate = 18;
    const gstAmount = (basePrice * gstRate) / 100;
    let finalPrice = basePrice + gstAmount;

    let appliedCoupon = null;
    let discountAmount = 0;

    if (coupon_code) {
      const today = new Date();

      // First find coupon by code
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
      });

      if (!appliedCoupon) {
        return res.status(404).json({ 
          message: 'Coupon not found, expired, or usage limit reached.',
        });
      }

      // Check if coupon is applicable for this specific plan
      const isApplicable = isCouponApplicableForPlan(appliedCoupon.applicable_plan, actualPlanName);
      
      if (!isApplicable) {
        return res.status(400).json({ 
          message: `This coupon (${appliedCoupon.code}) is not applicable for ${actualPlanName}.`,
          details: `Valid plans for this coupon: ${appliedCoupon.applicable_plan}`,
          coupon_applicable_for: appliedCoupon.applicable_plan,
          requested_plan: actualPlanName
        });
      }

      // Check if user already used this specific coupon
      const alreadyUsed = await db.UserCoupon.findOne({
        where: { user_id, coupon_id: appliedCoupon.id },
      });

      if (alreadyUsed) {
        return res.status(400).json({ 
          message: 'You have already used this coupon.',
          coupon_code: appliedCoupon.code
        });
      }

      // Add coupon type specific validations
      let validationError = null;
      let validationDetails = '';
      
      switch(appliedCoupon.coupon_type) {
        case 'promotional':
          // Check if user already used any promotional coupon
          const usedPromotional = await db.UserCoupon.findOne({
            include: [{
              model: db.Coupon,
              where: { coupon_type: 'promotional' }
            }],
            where: { user_id }
          });
          if (usedPromotional) {
            validationError = 'You have already used a promotional coupon.';
            validationDetails = 'Only one promotional coupon per user allowed.';
          }
          break;

        case 'retention':
          // Check if user has an active subscription expiring soon (within 7 days)
          const activeSubscription = await db.UserSubscription.findOne({
            where: { 
              user_id, 
              is_active: true,
              end_date: { 
                [Op.gte]: today,
                [Op.lte]: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
              }
            }
          });
          if (!activeSubscription) {
            validationError = 'Retention coupons are only for users with subscriptions expiring soon.';
            validationDetails = 'Your subscription must be expiring within 7 days to use this coupon.';
          }
          break;

        case 'referral':
          // Check if user is trying to use their own referral code
          // You might want to implement this based on your referral system
          // For now, just a placeholder
          break;

        case 'global':
          // Global coupons have no special restrictions
          break;
      }

      if (validationError) {
        return res.status(400).json({ 
          message: validationError,
          details: validationDetails,
          coupon_type: appliedCoupon.coupon_type
        });
      }

      // Prevent multiple pending orders with the same coupon
      const pendingPayment = await db.Payment.findOne({
        where: {
          user_id,
          coupon_code: appliedCoupon.code,
          status: 'created', // check only active unpaid
        },
      });

      if (pendingPayment) {
        return res.status(400).json({ 
          message: 'You have already applied this coupon in a pending payment.',
          coupon_code: appliedCoupon.code
        });
      }

      // Calculate discount on base price + GST
      if (appliedCoupon.discount_type === 'percentage') {
        discountAmount = (finalPrice * appliedCoupon.discount_value) / 100;
      } else {
        discountAmount = appliedCoupon.discount_value;
      }
      
      // Round to 2 decimal places
      discountAmount = Math.round(discountAmount * 100) / 100;

      finalPrice -= discountAmount;
      if (finalPrice < 0) finalPrice = 0;
    }

    const amount = Math.round(finalPrice * 100);
    const shortReceipt = `rcpt_${Date.now()}_${user_id.slice(0, 6)}`.slice(0, 40);

    // Create Razorpay order
    const order = await razorpay.orders.create({
      amount,
      currency: 'INR',
      receipt: shortReceipt,
    });

    // Create payment record
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

    res.json({
      order_id: order.id,
      base_amount: basePrice,
      gst_percentage: gstRate,
      gst_amount: gstAmount,
      discount_amount: discountAmount,
      coupon_code: appliedCoupon ? appliedCoupon.code : null,
      coupon_type: appliedCoupon ? appliedCoupon.coupon_type : null,
      coupon_applicable_for: appliedCoupon ? appliedCoupon.applicable_plan : null,
      applied_to_plan: actualPlanName,
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
          coupon_type: coupon.coupon_type,
          discount_amount: payment.discount_amount,
          used_at: new Date(),
          applied_plan: plan.plan_name,
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
      message: "Payment verified and subscription activated",
      subscription: {
        plan_name: plan.plan_name,
        start_date: startDate,
        end_date: endDate,
        contacts_remaining: newContactsRemaining,
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