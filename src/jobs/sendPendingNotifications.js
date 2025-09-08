import db from '../models/index.js';
import { sendEmail } from '../utils/email.js';
import { sendWhatsApp } from '../utils/whatsapp.js';

export const sendPendingNotifications = async () => {
  const notifications = await db.Notification.findAll({ where: { status: 'pending' } });

  for (const note of notifications) {
    try {
      const msg = note.content?.message || 'You have a new notification.';

      if (note.type === 'email') {
        await sendEmail(note.recipient, 'New Notification', msg);
      }

      if (note.type === 'whatsapp') {
        await sendWhatsApp(note.recipient, msg);
      }

      note.status = 'sent';
      note.sent_at = new Date();
      await note.save();
    } catch (err) {
      console.error('❌ Failed to send notification', note.id, err.message);
    }
  }
};
