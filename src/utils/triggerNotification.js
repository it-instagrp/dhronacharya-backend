import db from '../models/index.js';
import { sendNotification } from './notification.js';
import { notificationTemplates } from '../templates/notificationTemplates.js';

export const triggerNotification = async ({
  user_id,
  type,
  template_name,
  recipient,
  params
}) => {
  try {
    // Auto-fetch recipient from DB if not provided
    if (!recipient && user_id) {
      const user = await db.User.findByPk(user_id, {
        attributes: ['email', 'mobile_number'],
      });
      if (user) {
        recipient = user.email || user.mobile_number || String(user.id);
      }
    }

    if (!recipient) {
      throw new Error('Recipient is required for notification');
    }

    const template = notificationTemplates[template_name]?.[type];
    if (!template) {
      throw new Error(`Template ${template_name} for type ${type} not found`);
    }

    const content = template(params);

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
      template_name,
      params
    });

    notification.status = 'sent';
    notification.sent_at = new Date();
    await notification.save();

    return notification;
  } catch (error) {
    console.error('❌ Failed to trigger notification:', error.message || error);
    return null;
  }
};
