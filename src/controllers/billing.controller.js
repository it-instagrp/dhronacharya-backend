// src/controllers/billing.controller.js
import db from '../models/index.js';

export const getBillingHistory = async (req, res) => {
  const userId = req.user.id;

  try {
    // Fetch all subscriptions for the user
    const subscriptions = await db.UserSubscription.findAll({
      where: { user_id: userId },
      include: [
        { model: db.SubscriptionPlan }, // full plan details
        { model: db.Payment },
      ],
      order: [['created_at', 'DESC']],
    });

    if (!subscriptions || subscriptions.length === 0) {
      return res.status(404).json({ message: 'No subscriptions found' });
    }

    // Map subscriptions to include full plan and payment details
    const billingHistory = subscriptions.map(subscription => {
      const plan = subscription.SubscriptionPlan;
      const payment = subscription.Payment;
      if (!payment || !plan) return null;

      const gstRate = payment.tax_percentage || 18;
      const gstAmount = payment.tax_amount ?? (payment.amount - (payment.amount / (1 + gstRate / 100)));
      const baseAmount = payment.base_amount ?? (payment.amount - gstAmount);
      const discountAmount = payment.discount_amount ?? 0;

      return {
        plan: {
          id: plan.id,
         plan_name: plan.plan_name,
          price: parseFloat(plan.price).toFixed(2),
          duration_days: plan.duration,
          contact_limit: plan.contact_limit,
          plan_type: plan.plan_type,
          features: plan.features, // array
          user_type: plan.user_type,
          created_at: plan.created_at,
          updated_at: plan.updated_at,
        },
        subscription: {
          id: subscription.id,
          start_date: subscription.start_date,
          end_date: subscription.end_date,
          is_active: subscription.is_active,
          contacts_remaining: subscription.contacts_remaining,
        },
        payment: {
          id: payment.id,
          razorpay_order_id: payment.razorpay_order_id,
          razorpay_payment_id: payment.razorpay_payment_id,
          base_amount: parseFloat(baseAmount).toFixed(2),
          discount_amount: parseFloat(discountAmount).toFixed(2),
          gst_percentage: gstRate,
          gst_amount: parseFloat(gstAmount).toFixed(2),
          total_amount: parseFloat(payment.amount).toFixed(2),
          currency: payment.currency,
          status: payment.status,
          created_at: payment.created_at,
        },
      };
    }).filter(Boolean);

    res.status(200).json({
      message: 'Billing history fetched successfully',
      history: billingHistory,
    });

  } catch (error) {
    res.status(500).json({
      message: 'Failed to fetch billing history',
      error: error.message,
    });
  }
};
