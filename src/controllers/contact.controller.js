import db from '../models/index.js';

const { UserSubscription, User, ContactLog } = db;


export const viewContact = async (req, res) => {
  const { id: targetUserId } = req.params;
  const viewerUserId = req.user.id;
  const subscription = req.subscription;

  try {
    if (!subscription) {
      return res.status(403).json({ message: 'You need subscription to view contacts.' });
    }

    if (viewerUserId === targetUserId) {
      return res.status(400).json({ message: 'You cannot view your own contact info.' });
    }

    // Lifetime check
    const alreadyViewed = await ContactLog.findOne({
      where: {
        viewer_id: viewerUserId,
        target_id: targetUserId,
      }
    });

    if (alreadyViewed) {
      const targetUser = await User.findByPk(targetUserId);
      return res.json({
        message: 'Contact already viewed earlier',
        contact_info: targetUser,
        contacts_remaining: subscription.contacts_remaining
      });
    }

    // Deduct only first-time
    if (subscription.contacts_remaining <= 0) {
      return res.status(403).json({
        message: 'You have reached your limit. Please upgrade your plan.',
      });
    }

    subscription.contacts_remaining -= 1;
    await subscription.save();

    await ContactLog.create({
      viewer_id: viewerUserId,
      target_id: targetUserId,
    });

    const targetUser = await User.findByPk(targetUserId);

    return res.json({
      message: 'Contact viewed successfully',
      contact_info: targetUser,
      contacts_remaining: subscription.contacts_remaining
    });

  } catch (err) {
    return res.status(500).json({ message: 'Failed', error: err.message });
  }
};
