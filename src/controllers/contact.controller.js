import db from '../models/index.js';

const { UserSubscription, User, ContactLog } = db;

export const viewContact = async (req, res) => {
  const { id: targetUserId } = req.params;
  const viewerUserId = req.user.id;
  const { subscription } = req;

  try {
    if (viewerUserId === targetUserId) {
      return res.status(400).json({ message: 'You cannot view your own contact info.' });
    }

    if (!subscription) {
      return res.status(403).json({ message: 'You cannot view contact details until you subscribe.' });
    }

    // Make sure IDs are strings to match DB UUIDs
    const alreadyViewed = await ContactLog.findOne({
      where: {
        viewer_id: viewerUserId.toString(),
        target_id: targetUserId.toString(),
      },
    });

    if (!alreadyViewed) {
      if (subscription.contacts_remaining <= 0) {
        return res.status(403).json({
          message: 'You have reached your contact view limit. Please upgrade your subscription.',
        });
      }

      // Decrement contacts_remaining only once
      subscription.contacts_remaining -= 1;
      await subscription.save();

      await ContactLog.create({
        viewer_id: viewerUserId.toString(),
        target_id: targetUserId.toString(),
      });
    }

    const targetUser = await User.findByPk(targetUserId, {
      attributes: ['id', 'email', 'mobile_number', 'role', 'is_active'],
    });

    if (!targetUser) {
      return res.status(404).json({ message: 'Target user not found.' });
    }
    if (!targetUser.is_active) {
      return res.status(403).json({ message: 'Target user is inactive.' });
    }

    return res.status(200).json({
      message: 'Contact viewed successfully.',
      contact_info: {
        email: targetUser.email,
        mobile_number: targetUser.mobile_number,
        role: targetUser.role,
      },
      contacts_remaining: subscription.contacts_remaining,
    });
  } catch (err) {
    console.error('Error viewing contact:', err);
    return res.status(500).json({ message: 'Failed to view contact', error: err.message });
  }
};
