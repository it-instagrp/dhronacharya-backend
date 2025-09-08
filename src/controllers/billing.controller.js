// src/controllers/billing.controller.js
import db from '../models/index.js';

export const getBillingHistory = async (req, res) => {
  const userId = req.user.id;

  try {
    const subscription = await db.UserSubscription.findOne({
      where: { user_id: userId },
      include: [
        { model: db.SubscriptionPlan },
        { model: db.Payment },
      ],
      order: [['created_at', 'DESC']]
    });

    if (!subscription) {
      return res.status(404).json({ message: 'No active subscription found' });
    }

    const payment = subscription.Payment;
    if (!payment) {
      return res.status(404).json({ message: 'No payment found for this subscription' });
    }

    // Prepare GST-safe response
    const gstRate = payment.tax_percentage || 18;
    const gstAmount = payment.tax_amount ?? (payment.amount - (payment.amount / (1 + gstRate / 100)));
    const baseAmount = payment.base_amount ?? (payment.amount - gstAmount);

    res.status(200).json({
      plan: subscription.SubscriptionPlan,
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
        gst_percentage: gstRate,
        gst_amount: parseFloat(gstAmount).toFixed(2),
        total_amount: parseFloat(payment.amount).toFixed(2),
        currency: payment.currency,
        status: payment.status,
        created_at: payment.created_at,
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch billing history', error: error.message });
  }
};
