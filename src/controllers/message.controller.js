import db from '../models/index.js';

const { Message, Enquiry, User } = db;

export const getMessagesByEnquiry = async (req, res) => {
  const { id: enquiry_id } = req.params;
  try {
    const messages = await Message.findAll({
      where: { enquiry_id },
      include: [{ model: User, attributes: ['id', 'email', 'role'] }],
      order: [['created_at', 'ASC']]
    });
    res.status(200).json(messages);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch messages', error: err.message });
  }
};

export const sendMessage = async (req, res) => {
  const { id: enquiry_id } = req.params;
  const { content } = req.body;
  const sender_id = req.user.id;

  try {
    const enquiry = await Enquiry.findByPk(enquiry_id);
    if (!enquiry) return res.status(404).json({ message: 'Enquiry not found' });

    const message = await Message.create({ enquiry_id, sender_id, content });
    res.status(201).json({ message: 'Message sent', data: message });
  } catch (err) {
    res.status(500).json({ message: 'Failed to send message', error: err.message });
  }
};
