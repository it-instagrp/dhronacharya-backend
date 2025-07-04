import db from '../models/index.js';

/**
 * Middleware to check if a user has an active subscription
 * and whether they still have contact views remaining.
 * Used mainly for students trying to contact tutors.
 */
export const checkSubscriptionAndContactLimit = async (req, res, next) => {
  try {
    const user_id = req.user.id;

    const sub = await db.UserSubscription.findOne({
      where: {
        user_id,
        is_active: true,
      },
    });

    if (!sub) {
      return res.status(403).json({
        message: 'No active subscription found. Please subscribe to a plan.',
      });
    }

    if (sub.contacts_remaining <= 0) {
      return res.status(403).json({
        message: 'Contact view limit exceeded. Please upgrade your plan.',
      });
    }

    // Store subscription info on request for use in controller
    req.subscription = sub;
    next();
  } catch (err) {
    return res.status(500).json({
      message: 'Subscription check failed',
      error: err.message,
    });
  }
};
