import db from '../models/index.js';
import { sendNotification } from '../utils/notification.js';

export const createNotification = async (req, res) => {
  const { user_id, type, template_name, recipient, content } = req.body;

  try {
    const notification = await db.Notification.create({
      user_id,
      type,
      template_name,
      recipient,
      content,
      status: 'pending',
    });

    // Send message
    await sendNotification({
      type,
      recipient,
      subject: template_name, // for email subject
      content: typeof content === 'object' ? content.message : content
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
