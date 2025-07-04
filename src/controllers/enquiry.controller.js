import db from '../models/index.js';
import { sendEmail } from '../utils/email.js';
import { sendWhatsApp } from '../utils/whatsapp.js';
import { createNotification } from './notification.controller.js';

const { Enquiry, User, Tutor } = db;

// Create Enquiry with Notification
export const createEnquiry = async (req, res) => {
  const { receiver_id, subject, class: className, description } = req.body;
  const sender_id = req.user.id;
  const sender_role = req.user.role;

  try {
    const receiver = await User.findByPk(receiver_id, { include: [{ model: Tutor }] });
    const sender = await User.findByPk(sender_id);

    if (!receiver) {
      return res.status(404).json({ message: 'Receiver not found' });
    }

    // 🧠 Check and update contact limit for student
    if (sender_role === 'student') {
      const activeSub = await db.UserSubscription.findOne({
        where: { user_id: sender_id, is_active: true },
      });

      if (!activeSub || activeSub.contacts_remaining <= 0) {
        return res.status(403).json({ message: 'Student contact limit exhausted. Upgrade your subscription.' });
      }

      // Deduct one contact
      activeSub.contacts_remaining -= 1;
      await activeSub.save();
    }

    // 🧠 Check tutor's subscription before allowing enquiry
    if (receiver.role === 'tutor') {
      const tutorSub = await db.UserSubscription.findOne({
        where: { user_id: receiver_id, is_active: true },
      });

      if (!tutorSub) {
        return res.status(403).json({ message: 'Tutor is not subscribed. Cannot send enquiry.' });
      }

      // ❌ Block if tutor profile is not approved
      if (receiver.Tutor?.profile_status !== 'approved') {
        return res.status(403).json({ message: 'Tutor profile is not approved yet. Cannot send enquiry.' });
      }
    }

    const enquiry = await Enquiry.create({
      sender_id,
      receiver_id,
      subject,
      class: className,
      description,
    });

    // Notification Message
    const message = `You have received a new enquiry from ${sender.email || sender.mobile_number} regarding ${subject}.`;

    // Send Email
    if (receiver.email) {
      await sendEmail(receiver.email, 'New Enquiry Received', message);
    }

    // Send WhatsApp (optional)
    if (receiver.mobile_number) {
      await sendWhatsApp(receiver.mobile_number, message);
    }

    // Store Notification
    await createNotification({
      user_id: receiver.id,
      type: 'email',
      template_name: 'new_enquiry',
      recipient: receiver.email,
      content: { subject, message }
    });

    return res.status(201).json({ message: 'Enquiry sent and notification triggered', enquiry });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to send enquiry', error: err.message });
  }
};

// Get Enquiries
export const getEnquiries = async (req, res) => {
  const user_id = req.user.id;

  try {
    const sent = await Enquiry.findAll({
      where: { sender_id: user_id },
      include: [{ model: User, as: 'Receiver', attributes: ['id', 'email', 'role'] }]
    });

    const received = await Enquiry.findAll({
      where: { receiver_id: user_id },
      include: [{ model: User, as: 'Sender', attributes: ['id', 'email', 'role'] }]
    });

    return res.status(200).json({ sent, received });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to fetch enquiries', error: err.message });
  }
};

// Update Enquiry with Response Message
export const updateEnquiryStatus = async (req, res) => {
  const { id } = req.params;
  const { status, response_message } = req.body;

  try {
    const enquiry = await Enquiry.findByPk(id);
    const receiver = await User.findByPk(enquiry.sender_id); // notify the original sender

    if (!enquiry) {
      return res.status(404).json({ message: 'Enquiry not found' });
    }

    if (!['pending', 'accepted', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    enquiry.status = status;
    if (response_message) {
      enquiry.response_message = response_message;
    }

    await enquiry.save();

    // Notify sender
    const notifyMessage = `Your enquiry regarding ${enquiry.subject} has been ${status}. Message: ${response_message || 'No message provided.'}`;

    if (receiver.email) {
      await sendEmail(receiver.email, 'Enquiry Response Received', notifyMessage);
    }

    if (receiver.mobile_number) {
      await sendWhatsApp(receiver.mobile_number, notifyMessage);
    }

    await createNotification({
      user_id: receiver.id,
      type: 'email',
      template_name: 'enquiry_response',
      recipient: receiver.email,
      content: { status, response_message: response_message || '' }
    });

    return res.status(200).json({ message: 'Enquiry updated', enquiry });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to update enquiry', error: err.message });
  }
};
