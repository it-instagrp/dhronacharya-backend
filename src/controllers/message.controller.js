
import db from '../models/index.js';
import { sendKafkaMessage } from '../kafka/producer.js';
import { isConsumerActive } from '../kafka/consumer.js';

const { Message, Enquiry, User } = db;

// ===============================
// Get all messages for a given enquiry
// ===============================
export const getMessagesByEnquiry = async (req, res) => {
  const { id: enquiry_id } = req.params;

  try {
    const messages = await Message.findAll({
      where: { enquiry_id },
      include: [
        { model: User, attributes: ['id', 'email', 'role'] }
      ],
      order: [['created_at', 'ASC']]
    });

    return res.status(200).json(messages);
  } catch (err) {
    return res.status(500).json({
      message: 'Failed to fetch messages',
      error: err.message
    });
  }
};

export const sendMessage = async (req, res) => {
  const { id: enquiry_id } = req.params;
  const { content } = req.body;
  const sender_id = req.user.id;

  if (!content || content.trim() === '') {
    return res.status(400).json({ message: 'Message content is required' });
  }

  try {
    const enquiry = await Enquiry.findByPk(enquiry_id);
    if (!enquiry) {
      return res.status(404).json({ message: 'Enquiry not found' });
    }

    // Create message in DB
    const message = await Message.create({
      enquiry_id,
      sender_id,
      content
    });

    // Only try to send to Kafka if consumer is active
    if (isConsumerActive && isConsumerActive()) {
      await sendKafkaMessage("Message", {
        message_id: message.id, // Include the database ID
        enquiry_id,
        sender_id,
        content,
        sent_at: new Date()
      });
    }

    return res.status(201).json({
      message: 'Message sent successfully',
      data: message
    });

  } catch (err) {
    return res.status(500).json({
      message: 'Failed to send message',
      error: err.message
    });
  }
};