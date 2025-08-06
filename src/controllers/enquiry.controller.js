import db from '../models/index.js';
import { triggerNotification } from '../utils/triggerNotification.js';
import { enquiryTemplates } from '../templates/enquiry.template.js';
import { Op } from 'sequelize';
const { Enquiry, User, Tutor, Student, UserSubscription } = db;

// 📌 Create a New Enquiry
export const createEnquiry = async (req, res) => {
  const { receiver_id, subject, class: className, description } = req.body;
  const sender_id = req.user.id;

  try {
    const receiver = await User.findByPk(receiver_id, {
      include: [{ model: Tutor }, { model: Student }],
    });

    const sender = await User.findByPk(sender_id, {
      include: [{ model: Tutor }, { model: Student }],
    });

    if (!receiver) {
      return res.status(404).json({ message: 'Receiver not found' });
    }

    // ✅ Tutor validation
    if (receiver.role === 'tutor') {
      const tutorSub = await UserSubscription.findOne({
        where: { user_id: receiver_id, is_active: true },
      });

      if (!tutorSub) {
        return res.status(403).json({ message: 'Tutor is not subscribed. Cannot send enquiry.' });
      }

      if (receiver.Tutor?.profile_status !== 'approved') {
        return res.status(403).json({ message: 'Tutor profile is not approved yet.' });
      }
    }

    const sender_location = sender?.Student?.location || sender?.Tutor?.location || null;
    const receiver_location = receiver?.Student?.location || receiver?.Tutor?.location || null;

    const enquiry = await Enquiry.create({
      sender_id,
      receiver_id,
      subject: subject?.trim(),
      class: className?.trim(),
      description: description?.trim(),
      sender_location,
      receiver_location,
    });

    const senderName = sender.Student?.name || sender.Tutor?.name || sender.email || sender.mobile_number;
    const mode = sender.Student?.mode || 'Not specified';

    // 📤 Email
    // In the createEnquiry function, replace the notification sections with:

// 📤 Email
if (receiver.email) {
  let emailBody = '';

  if (receiver.role === 'tutor') {
    emailBody = enquiryTemplates.new_enquiry_email.tutor({
      name: senderName,
      studentClass: className,
      mode,
      subject,
    });
  } else {
    emailBody = enquiryTemplates.new_enquiry_email.student({
      name: senderName,
      subject,
    });
  }

 await triggerNotification({
  user_id: receiver.id,
  type: 'email',
  template_name: 'new_enquiry_email',
  recipient: receiver.email,
  params: {
    name: senderName,
    studentClass: className,
    mode,
    subject
  }
});

}

// 📲 WhatsApp
if (receiver.mobile_number) {
  const whatsappBody = enquiryTemplates.new_enquiry_whatsapp({ 
    link: `https://dronacharya.in/${receiver.role}/enquiries` 
  });
  
  await triggerNotification({
  user_id: receiver.id,
  type: 'whatsapp',
  template_name: 'new_enquiry_whatsapp',
  recipient: receiver.mobile_number,
  params: {
    link: `https://dronacharya.in/${receiver.role}/enquiries`
  }
});

}

// 📱 SMS
if (receiver.mobile_number) {
  const smsBody = enquiryTemplates.new_enquiry_sms({
    name: senderName,
    subject,
  });

  await triggerNotification({
  user_id: receiver.id,
  type: 'sms',
  template_name: 'new_enquiry_sms',
  recipient: receiver.mobile_number,
  params: {
    name: senderName,
    subject
  }
});

}

    return res.status(201).json({
      message: 'Enquiry sent and notifications triggered',
      enquiry,
    });
  } catch (err) {
    console.error('❌ createEnquiry error:', err);
    return res.status(500).json({ message: 'Failed to send enquiry', error: err.message });
  }
};

// src/controllers/enquiry.controller.js
export const getEnquiries = async (req, res) => {
  try {
    const currentUser = req.user;
    const isAdmin = currentUser.role === 'admin';

    const whereClause = isAdmin
      ? {}
      : {
          [Op.or]: [ // ✅ Fixed this line
            { sender_id: currentUser.id },
            { receiver_id: currentUser.id },
          ],
        };

    const enquiries = await db.Enquiry.findAll({
      where: whereClause,
      include: [
        {
          model: db.User,
          as: 'Sender',
          attributes: ['id', 'role'],
          include: [
            {
              model: db.Tutor,
              as: 'Tutor',
              attributes: ['name'],
              include: [{
                model: db.Location,
                attributes: ['city', 'state', 'country']
              }]
            },
            {
              model: db.Student,
              as: 'Student',
              attributes: ['name'],
              include: [{
                model: db.Location,
                attributes: ['city', 'state', 'country']
              }]
            },
          ],
        },
        {
          model: db.User,
          as: 'Receiver',
          attributes: ['id', 'role'],
          include: [
            {
              model: db.Tutor,
              as: 'Tutor',
              attributes: ['name'],
              include: [{
                model: db.Location,
                attributes: ['city', 'state', 'country']
              }]
            },
            {
              model: db.Student,
              as: 'Student',
              attributes: ['name'],
              include: [{
                model: db.Location,
                attributes: ['city', 'state', 'country']
              }]
            },
          ],
        },
      ],
      order: [['created_at', 'DESC']],
    });

    const formattedEnquiries = enquiries.map(enquiry => ({
      id: enquiry.id,
      subject: enquiry.subject,
      class: enquiry.class,
      status: enquiry.status,
      description: enquiry.description,
      response_message: enquiry.response_message,
      created_at: enquiry.createdAt,
      sender: {
        id: enquiry.Sender.id,
        name: enquiry.Sender.Tutor?.name || enquiry.Sender.Student?.name,
        role: enquiry.Sender.role,
        location: enquiry.Sender.Tutor?.Location || enquiry.Sender.Student?.Location,
      },
      receiver: {
        id: enquiry.Receiver.id,
        name: enquiry.Receiver.Tutor?.name || enquiry.Receiver.Student?.name,
        role: enquiry.Receiver.role,
        location: enquiry.Receiver.Tutor?.Location || enquiry.Receiver.Student?.Location,
      },
    }));

    res.status(200).json({ enquiries: formattedEnquiries });
  } catch (error) {
    console.error('❌ getEnquiries error:', error);
    res.status(500).json({ error: error.message });
  }
};

// 📌 Update Enquiry Status (Accept / Reject)
export const updateEnquiryStatus = async (req, res) => {
  const { id } = req.params;
  const { status, response_message } = req.body;

  try {
    const enquiry = await Enquiry.findByPk(id);
    if (!enquiry) {
      return res.status(404).json({ message: 'Enquiry not found' });
    }

    if (!['pending', 'accepted', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }

    enquiry.status = status;
    enquiry.response_message = response_message || null;

    // 🔍 Update locations if missing
    const [sender, receiver] = await Promise.all([
      User.findByPk(enquiry.sender_id, { include: [Tutor, Student] }),
      User.findByPk(enquiry.receiver_id, { include: [Tutor, Student] }),
    ]);

    if (!enquiry.sender_location) {
      enquiry.sender_location = sender?.Student?.location || sender?.Tutor?.location || null;
    }
    if (!enquiry.receiver_location) {
      enquiry.receiver_location = receiver?.Student?.location || receiver?.Tutor?.location || null;
    }

    await enquiry.save();

    // 📩 Notify sender
    const responseTemplate = `
Your enquiry regarding "${enquiry.subject}" has been ${status.toUpperCase()}.
Message: ${response_message || 'No message provided.'}
    `.trim();

    if (sender?.email) {
  await triggerNotification({
    user_id: sender.id,
    type: 'email',
    template_name: 'enquiry_response',
    recipient: sender.email,
    params: {
      subject: enquiry.subject,
      status: status.toUpperCase(),
      response: response_message || 'No message provided.'
    }
  });
}


    return res.status(200).json({ message: 'Enquiry updated successfully', enquiry });
  } catch (err) {
    console.error('❌ updateEnquiryStatus error:', err);
    return res.status(500).json({ message: 'Failed to update enquiry', error: err.message });
  }
};
