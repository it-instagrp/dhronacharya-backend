import db from '../models/index.js';

export const checkSubscriptionAndContactLimit = async (req, res, next) => {
  const user_id = req.user.id;

  const sub = await db.UserSubscription.findOne({
    where: { user_id, is_active: true }
  });

  if (!sub) {
    return res.status(403).json({ message: 'No active subscription found' });
  }

  if (sub.contacts_remaining <= 0) {
    return res.status(403).json({ message: 'Contact view limit exceeded' });
  }

  // Save subscription for controller use
  req.subscription = sub;
  next();
};
