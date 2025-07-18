import db from '../models/index.js';
import { sendNotification } from './notification.js';

// ✅ Reusable notification helper for internal use
export const triggerNotification = async ({ user_id, type, template_name, recipient, content }) => {
  try {
    const notification = await db.Notification.create({
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

    return notification;
  } catch (error) {
    console.error('❌ Failed to trigger notification:', error);
    return null;
  }
};
