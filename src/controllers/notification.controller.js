import db from '../models/index.js';
import { sendNotification } from '../utils/notification.js';

const { Notification } = db;

// ✅ Create & send notification (admin/internal use)
export const createNotification = async (req, res) => {
  const { user_id, type, template_name, recipient, content } = req.body;

  try {
    const notification = await Notification.create({
      user_id,
      type,
      template_name,
      recipient,
      content,
      status: 'pending',
    });

    await sendNotification({
      type,
      recipient,
      subject: template_name,
      content: typeof content === 'object' ? content.message : content,
    });

    notification.status = 'sent';
    notification.sent_at = new Date();
    await notification.save();

    res.json({ message: `${type} notification sent`, notification });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to send notification', error: error.message });
  }
};

// ✅ Get all notifications for the logged-in user
export const getUserNotifications = async (req, res) => {
  try {
    const userId = req.user.id;

    const notifications = await Notification.findAll({
      where: { user_id: userId },
      order: [['created_at', 'DESC']]
    });

    res.status(200).json({ notifications });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch notifications', error: err.message });
  }
};
// PATCH /api/notifications/:id/read
export const markNotificationRead = async (req, res) => {
  const { id } = req.params;
  const { read = true } = req.body;

  try {
    const notification = await db.Notification.findOne({
      where: { id, user_id: req.user.id }
    });

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    notification.status = read ? 'read' : 'unread';
    await notification.save();

    return res.status(200).json({ message: `Notification marked as ${read ? 'read' : 'unread'}` });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to update notification', error: error.message });
  }
};
// DELETE /api/notifications/:id
export const deleteNotification = async (req, res) => {
  const { id } = req.params;

  try {
    const deleted = await db.Notification.destroy({
      where: { id, user_id: req.user.id }
    });

    if (!deleted) {
      return res.status(404).json({ message: 'Notification not found or already deleted' });
    }

    return res.status(200).json({ message: 'Notification deleted successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to delete notification', error: error.message });
  }
};

// 📦 Admin: Get all notifications created by admin
export const getAllNotifications = async (req, res) => {
  try {
    const notifications = await db.Notification.findAll({
      order: [['created_at', 'DESC']],
    });

    res.status(200).json({ notifications });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch notifications', error: error.message });
  }
};
