import db from '../models/index.js';
const { Conversation, Bookmark, User, Tutor, Student, Message } = db;
import { Op } from 'sequelize';
import { broadcastToConversation } from '../websocket/conversation.server.js';

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
      
      // Broadcast new conversation via WebSocket
      broadcastToConversation(convo.id, {
        type: 'new_conversation',
        conversation_id: convo.id,
        student_id,
        tutor_id,
        created_at: new Date().toISOString()
      });
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
      include: [{
        model: User,
        attributes: ['id', 'email', 'role', 'name']
      }],
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
    const convo = await Conversation.findByPk(id, {
      include: [
        {
          model: User,
          as: 'Student',
          attributes: ['id', 'name', 'email']
        },
        {
          model: User,
          as: 'Tutor',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    if (!convo) return res.status(404).json({ status: false, message: 'Conversation not found' });

    if (![convo.student_id, convo.tutor_id].includes(sender_id)) {
      return res.status(403).json({ status: false, message: 'Not a participant' });
    }

    // Create message in DB
    const message = await Message.create({
      conversation_id: id,
      sender_id,
      content: content.trim()
    });

    // Update conversation timestamp
    await convo.update({
      last_message_at: new Date(),
      updated_at: new Date()
    });

    // Fetch message with sender details for WebSocket broadcast
    const messageWithSender = await Message.findByPk(message.id, {
      include: [{
        model: User,
        attributes: ['id', 'email', 'role', 'name']
      }]
    });

    // Broadcast to WebSocket clients
    broadcastToConversation(id, {
      ...messageWithSender.toJSON(),
      type: 'new_message',
      conversation_id: id,
      timestamp: new Date().toISOString()
    });

    return res.status(201).json({
      status: true,
      message: 'Message sent successfully',
      data: messageWithSender
    });
  } catch (err) {
    console.error('Error sending message:', err);
    return res.status(500).json({ status: false, message: 'Failed to send message', error: err.message });
  }
};

/**
 * Get all conversations for the authenticated user
 */
export const getUserConversations = async (req, res) => {
  const authUser = req.user;

  try {
    let conversations;
    if (authUser.role === 'student') {
      conversations = await Conversation.findAll({
        where: { student_id: authUser.id },
        include: [
          {
            model: User,
            as: 'Tutor',
            attributes: ['id', 'name', 'email', 'role'],
            include: [{ model: Tutor, attributes: ['profile_photo', 'subjects'] }]
          },
          {
            model: Message,
            as: 'Messages',
            limit: 1,
            order: [['created_at', 'DESC']],
            include: [{
              model: User,
              attributes: ['id', 'name']
            }]
          }
        ],
        order: [['last_message_at', 'DESC']]
      });
    } else if (authUser.role === 'tutor') {
      conversations = await Conversation.findAll({
        where: { tutor_id: authUser.id },
        include: [
          {
            model: User,
            as: 'Student',
            attributes: ['id', 'name', 'email', 'role'],
            include: [{ model: Student, attributes: ['profile_photo', 'class'] }]
          },
          {
            model: Message,
            as: 'Messages',
            limit: 1,
            order: [['created_at', 'DESC']],
            include: [{
              model: User,
              attributes: ['id', 'name']
            }]
          }
        ],
        order: [['last_message_at', 'DESC']]
      });
    } else {
      return res.status(400).json({
        status: false,
        message: 'Only students and tutors can have conversations'
      });
    }

    // Format the response
    const formattedConversations = conversations.map(convo => {
      const otherUser = authUser.role === 'student' ? convo.Tutor : convo.Student;
      const lastMessage = convo.Messages?.[0];

      return {
        id: convo.id,
        last_message_at: convo.last_message_at,
        created_at: convo.created_at,
        updated_at: convo.updated_at,
        other_user: {
          id: otherUser.id,
          name: otherUser.name,
          email: otherUser.email,
          role: otherUser.role,
          profile_photo: otherUser.Tutor?.profile_photo || otherUser.Student?.profile_photo,
          subjects: otherUser.Tutor?.subjects,
          class: otherUser.Student?.class
        },
        last_message: lastMessage ? {
          content: lastMessage.content,
          sender_id: lastMessage.sender_id,
          sender_name: lastMessage.User?.name,
          created_at: lastMessage.created_at
        } : null
      };
    });

    return res.status(200).json({
      status: true,
      conversations: formattedConversations
    });
  } catch (err) {
    console.error('Error fetching conversations:', err);
    return res.status(500).json({
      status: false,
      message: 'Failed to fetch conversations',
      error: err.message
    });
  }
};

/**
 * Mark messages as read in a conversation
 */
export const markMessagesAsRead = async (req, res) => {
  const { id } = req.params;
  const authUser = req.user;

  try {
    const convo = await Conversation.findByPk(id);
    if (!convo) return res.status(404).json({ status: false, message: 'Conversation not found' });

    if (![convo.student_id, convo.tutor_id].includes(authUser.id)) {
      return res.status(403).json({ status: false, message: 'Not a participant' });
    }

    // Mark all unread messages from other user as read
    await Message.update(
      { is_read: true },
      {
        where: {
          conversation_id: id,
          sender_id: { [Op.ne]: authUser.id },
          is_read: false
        }
      }
    );

    // Broadcast read receipt via WebSocket
    broadcastToConversation(id, {
      type: 'messages_read',
      conversation_id: id,
      user_id: authUser.id,
      read_at: new Date().toISOString()
    });

    return res.status(200).json({
      status: true,
      message: 'Messages marked as read'
    });
  } catch (err) {
    console.error('Error marking messages as read:', err);
    return res.status(500).json({
      status: false,
      message: 'Failed to mark messages as read',
      error: err.message
    });
  }
};
