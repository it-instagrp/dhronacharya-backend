// src/controllers/billing.controller.js
import db from '../models/index.js';

export const getBillingHistory = async (req, res) => {
  const userId = req.user.id;

  try {
    const subscriptions = await db.UserSubscription.findAll({
      where: { user_id: userId },
      include: [
        { model: db.SubscriptionPlan },
        { model: db.Payment }
      ],
      order: [['created_at', 'DESC']]
    });

    if (!subscriptions || subscriptions.length === 0) {
      return res.status(404).json({ message: 'No subscriptions found' });
    }

    const billingHistory = subscriptions
      .map(subscription => {
        const plan = subscription.SubscriptionPlan;
        const payment = subscription.Payment;

        if (!plan || !payment) return null;

        return {
          plan: {
            id: plan.id,
            plan_name: plan.plan_name,
            price: parseFloat(plan.price).toFixed(2),
            duration_days: plan.duration_days,
            contact_limit: plan.contact_limit,
            plan_type: plan.plan_type,
            features: plan.features,
            user_type: plan.user_type,
            created_at: plan.created_at,
            updated_at: plan.updated_at
          },

          subscription: {
            id: subscription.id,
            start_date: subscription.start_date,
            end_date: subscription.end_date,
            is_active: subscription.is_active,
            contacts_remaining: subscription.contacts_remaining
          },

          payment: {
            id: payment.id,
            razorpay_order_id: payment.razorpay_order_id,
            razorpay_payment_id: payment.razorpay_payment_id,
            base_amount: parseFloat(payment.base_amount).toFixed(2),
            discount_amount: parseFloat(payment.discount_amount).toFixed(2),
            gst_percentage: payment.gst_percentage,
            gst_amount: parseFloat(payment.gst_amount).toFixed(2),
            total_amount: parseFloat(payment.total_amount).toFixed(2),
            currency: payment.currency,
            status: payment.status
          },

          // ✅ PURCHASE DATE ADDED HERE
          purchase_date: payment.created_at
        };
      })
      .filter(Boolean);

    return res.status(200).json({
      message: "Billing history fetched successfully",
      history: billingHistory
    });

  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch billing history",
      error: error.message
    });
  }
};
