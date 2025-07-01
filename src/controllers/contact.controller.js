// src/controllers/contact.controller.js
import db from '../models/index.js';

const { UserSubscription, User } = db;

// ✅ View Contact API (with subscription contact count check)
export const viewContact = async (req, res) => {
  const { id: targetUserId } = req.params;
  const viewerUserId = req.user.id;
  const { subscription } = req; // Set by middleware

  try {
    // Don't allow viewing own contact
    if (viewerUserId === targetUserId) {
      return res.status(400).json({ message: 'You cannot view your own contact info.' });
    }

    const targetUser = await User.findByPk(targetUserId, {
      attributes: ['id', 'email', 'mobile_number', 'role', 'is_active']
    });

    if (!targetUser || !targetUser.is_active) {
      return res.status(404).json({ message: 'Target user not found or inactive.' });
    }

    // Decrement contacts remaining
    subscription.contacts_remaining -= 1;
    await subscription.save();

    return res.status(200).json({
      message: 'Contact viewed successfully.',
      contact_info: {
        email: targetUser.email,
        mobile_number: targetUser.mobile_number,
        role: targetUser.role
      },
      contacts_remaining: subscription.contacts_remaining
    });
  } catch (err) {
    console.error('❌ Error viewing contact:', err);
    return res.status(500).json({ message: 'Failed to view contact', error: err.message });
  }
};
