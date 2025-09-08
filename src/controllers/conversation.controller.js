import db from '../models/index.js';
const { Conversation, Bookmark, User, Tutor, Student, Message } = db;
import { Op } from 'sequelize';

/**
 * Create or fetch an existing conversation between student & tutor
 */
export const getOrCreateConversation = async (req, res) => {
  const authUser = req.user;
  const { other_user_id } = req.body;

  if (!other_user_id) {
    return res.status(400).json({ status: false, message: 'other_user_id is required' });
  }

  try {
    const otherUser = await User.findByPk(other_user_id, { include: [Tutor, Student] });
    if (!otherUser) {
      return res.status(404).json({ status: false, message: 'Other user not found' });
    }

    let student_id, tutor_id;
    if (authUser.role === 'student' && otherUser.role === 'tutor') {
      student_id = authUser.id;
      tutor_id = other_user_id;
    } else if (authUser.role === 'tutor' && otherUser.role === 'student') {
      student_id = other_user_id;
      tutor_id = authUser.id;
    } else {
      return res.status(400).json({
        status: false,
        message: 'Conversation must be between one student and one tutor'
      });
    }

    // Check bookmark (optional enforcement)
    const bookmark = await Bookmark.findOne({
      where: { user_id: student_id, bookmarked_user_id: tutor_id },
    });
    if (!bookmark) {
      await Bookmark.create({ user_id: student_id, bookmarked_user_id: tutor_id });
    }

    // Find or create conversation
    let convo = await Conversation.findOne({ where: { student_id, tutor_id } });
    if (!convo) {
      convo = await Conversation.create({ student_id, tutor_id });
    }

    return res.status(200).json({
      status: true,
      message: 'Conversation ready',
      conversation: convo
    });
  } catch (err) {
    return res.status(500).json({ status: false, message: 'Failed to start conversation', error: err.message });
  }
};

/**
 * Fetch messages in a conversation
 */
export const getConversationMessages = async (req, res) => {
  const { id } = req.params;
  const authUser = req.user;

  try {
    const convo = await Conversation.findByPk(id);
    if (!convo) return res.status(404).json({ status: false, message: 'Conversation not found' });

    if (![convo.student_id, convo.tutor_id].includes(authUser.id)) {
      return res.status(403).json({ status: false, message: 'Not a participant' });
    }

    const messages = await Message.findAll({
      where: { conversation_id: id },
      include: [{ model: User, attributes: ['id', 'email', 'role'] }],
      order: [['created_at', 'ASC']],
    });

    return res.status(200).json({ status: true, messages });
  } catch (err) {
    return res.status(500).json({ status: false, message: 'Failed to fetch messages', error: err.message });
  }
};

/**
 * Send message in a conversation
 */
export const sendConversationMessage = async (req, res) => {
  const { id } = req.params;
  const { content } = req.body;
  const sender_id = req.user.id;

  if (!content || content.trim() === '') {
    return res.status(400).json({ status: false, message: 'Message content is required' });
  }

  try {
    const convo = await Conversation.findByPk(id);
    if (!convo) return res.status(404).json({ status: false, message: 'Conversation not found' });

    if (![convo.student_id, convo.tutor_id].includes(sender_id)) {
      return res.status(403).json({ status: false, message: 'Not a participant' });
    }

    const message = await Message.create({ conversation_id: id, sender_id, content: content.trim() });
    await convo.update({ last_message_at: new Date() });

    return res.status(201).json({
      status: true,
      message: 'Message sent successfully',
      data: message
    });
  } catch (err) {
    return res.status(500).json({ status: false, message: 'Failed to send message', error: err.message });
  }
};
