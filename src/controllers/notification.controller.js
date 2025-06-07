import db from '../models/index.js';

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
    // You can trigger actual email/SMS sending here or in a background job
    res.json({ notification });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
