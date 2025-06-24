import db from '../models/index.js';
const { Enquiry, User } = db;

// 🔹 Create Enquiry (Student ↔ Tutor)
export const createEnquiry = async (req, res) => {
  const { receiver_id, subject, class: className, description } = req.body;
  const sender_id = req.user.id;

  try {
    // Validate receiver exists
    const receiver = await User.findByPk(receiver_id);
    if (!receiver) {
      return res.status(404).json({ message: 'Receiver not found' });
    }

    const enquiry = await Enquiry.create({
      sender_id,
      receiver_id,
      subject,
      class: className,
      description,
    });

    return res.status(201).json({ message: 'Enquiry sent', enquiry });
  } catch (err) {
    return res.status(500).json({
      message: 'Failed to send enquiry',
      error: err.message,
    });
  }
};

// 🔹 Get Sent and Received Enquiries
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
    return res.status(500).json({
      message: 'Failed to fetch enquiries',
      error: err.message,
    });
  }
};

// 🔹 Update Enquiry Status (Accept/Reject + Optional Response)
export const updateEnquiryStatus = async (req, res) => {
  const { id } = req.params;
  const { status, response_message } = req.body;

  try {
    const enquiry = await Enquiry.findByPk(id);

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

    return res.status(200).json({ message: 'Enquiry updated', enquiry });
  } catch (err) {
    return res.status(500).json({
      message: 'Failed to update enquiry',
      error: err.message,
    });
  }
};
