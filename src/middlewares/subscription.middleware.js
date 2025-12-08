
import db from '../models/index.js';
import { Op } from 'sequelize';

/**
 * Middleware to get user’s valid active (non-expired) subscription.
 * DOES NOT check contact limit.
 */
export const checkSubscriptionAndContactLimit = async (req, res, next) => {
  try {
    const user_id = req.user.id;
    const now = new Date();

    // Fetch ONLY valid subscription:
    // 1. is_active = true
    // 2. end_date > now
    const subscription = await db.UserSubscription.findOne({
      where: {
        user_id,
        is_active: true,
        end_date: { [Op.gt]: now },   // <-- CRITICAL FIX
      },
      order: [['created_at', 'DESC']],
    });

    // No valid active subscription
    if (!subscription) {
      req.subscription = null;
      return res.status(403).json({
        message: 'No active subscription found. Please subscribe to a plan.',
      });
    }

    // Attach valid subscription to request object
    req.subscription = subscription;

    next();

  } catch (err) {
    return res.status(500).json({
      message: 'Subscription check failed',
      error: err.message,
    });
  }
};
