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

    res.status(200).json({
      plan: subscription.SubscriptionPlan,
      subscription,
      payment: subscription.Payment
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch billing history', error: error.message });
  }
};
