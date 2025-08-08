import db from '../models/index.js';
import { Op } from 'sequelize';
import { sendEmail } from '../utils/email.js';
import { sendWhatsApp } from '../utils/whatsapp.js';
import { sendSMS } from '../utils/sms.js';
import { templates } from '../templates/index.js';

const { Group, GroupMember, User, ClassSchedule } = db;
const { group: groupTemplates } = templates;

// ➕ Create a new group
export const createGroup = async (req, res) => {
  const { name, type } = req.body;
  const { id: creatorId, role } = req.user;

  try {
    if (!name || !type) {
      return res.status(400).json({ message: 'Group name and type are required' });
    }

    const normalizedType = type.toLowerCase();
    const allowedTypes = ['tutor', 'student'];

    if (!allowedTypes.includes(normalizedType)) {
      return res.status(400).json({ message: 'Invalid group type. Only "tutor" or "student" are allowed.' });
    }

    if (name.length < 3 || name.length > 100) {
      return res.status(400).json({ message: 'Group name must be between 3 and 100 characters' });
    }

    const group = await Group.create({
      name,
      creator_id: creatorId,
      type: normalizedType
    });

    await GroupMember.create({ group_id: group.id, user_id: creatorId, role });

    const creator = await User.findByPk(creatorId);

    const emailMessage = groupTemplates?.created?.email?.({
      groupName: group.name,
      creatorName: creator.name
    });

    const whatsappText = groupTemplates?.created?.whatsapp?.({
      groupName: group.name
    });

    const smsText = groupTemplates?.created?.sms?.({
      groupName: group.name
    });

    const notifications = [];
    if (creator.email && emailMessage) notifications.push(sendEmail(creator.email, 'Group Created', emailMessage));
    if (creator.mobile_number && whatsappText) notifications.push(sendWhatsApp(creator.mobile_number, whatsappText));
    if (creator.mobile_number && smsText) notifications.push(sendSMS(creator.mobile_number, smsText));
    await Promise.allSettled(notifications);

    res.status(201).json({ message: 'Group created successfully', group });
  } catch (error) {
    console.error('Error creating group:', error);
    res.status(500).json({ message: 'Failed to create group', error: error.message });
  }
};

// ➕ Add members to group
export const addMembersToGroup = async (req, res) => {
  const { group_id, member_ids, role } = req.body;

  try {
    if (!group_id || !Array.isArray(member_ids) || member_ids.length === 0 || !role) {
      return res.status(400).json({ message: 'group_id, member_ids, and role are required' });
    }

    const group = await Group.findByPk(group_id);
    if (!group) return res.status(404).json({ message: 'Group not found' });

    const members = member_ids.map((user_id) => ({ group_id, user_id, role }));
    await GroupMember.bulkCreate(members, { ignoreDuplicates: true });

    const users = await User.findAll({ where: { id: { [Op.in]: member_ids } } });

    const notifications = [];

    for (const user of users) {
      if (user.email && groupTemplates?.addedToGroup?.email) {
        const email = groupTemplates.addedToGroup.email({
          groupName: group.name,
          memberName: user.name
        });
        notifications.push(sendEmail(user.email, 'Added to Group', email));
      }
      if (user.mobile_number && groupTemplates?.addedToGroup?.whatsapp) {
        const whatsapp = groupTemplates.addedToGroup.whatsapp({
          groupName: group.name
        });
        notifications.push(sendWhatsApp(user.mobile_number, whatsapp));
      }
      if (user.mobile_number && groupTemplates?.addedToGroup?.sms) {
        const sms = groupTemplates.addedToGroup.sms({
          groupName: group.name
        });
        notifications.push(sendSMS(user.mobile_number, sms));
      }
    }

    await Promise.allSettled(notifications);

    res.status(200).json({ message: 'Members added to group successfully' });
  } catch (error) {
    console.error('Error adding members:', error);
    res.status(500).json({ message: 'Failed to add members', error: error.message });
  }
};

// 👥 Get members of a group (with classes)
export const getGroupMembers = async (req, res) => {
  const { groupId } = req.params;

  try {
    const group = await Group.findByPk(groupId, {
      include: [
        {
          model: GroupMember,
          as: 'Members',
          include: [{ model: User, attributes: ['id', 'name', 'email', 'role'] }]
        },
        {
          model: ClassSchedule,
          where: { group_id: groupId },
          required: false
        }
      ]
    });

    if (!group) return res.status(404).json({ message: 'Group not found' });

    res.status(200).json({ group });
  } catch (error) {
    console.error('Error fetching group members:', error);
    res.status(500).json({ message: 'Failed to fetch group members', error: error.message });
  }
};

// 📆 Get all groups for the logged-in user (with members + classes)
export const getMyGroups = async (req, res) => {
  const { id: userId } = req.user;

  try {
    const memberships = await GroupMember.findAll({
      where: { user_id: userId },
      include: [{
        model: Group,
        include: [
          {
            model: GroupMember,
            as: 'Members',
            include: [{ model: User, attributes: ['id', 'name', 'email', 'role'] }]
          },
          {
            model: ClassSchedule,
            where: { group_id: { [Op.ne]: null } },
            required: false
          }
        ]
      }]
    });

    const groups = memberships.map(m => m.Group);
    res.status(200).json({ groups });
  } catch (error) {
    console.error('Error fetching user groups:', error);
    res.status(500).json({ message: 'Failed to fetch user groups', error: error.message });
  }
};

// ❌ Remove a member from group
export const removeGroupMember = async (req, res) => {
  const { groupId, userId } = req.params;

  try {
    const removed = await GroupMember.destroy({
      where: { group_id: groupId, user_id: userId }
    });

    if (!removed) return res.status(404).json({ message: 'Member not found in group' });

    res.status(200).json({ message: 'Member removed from group successfully' });
  } catch (error) {
    console.error('Error removing member:', error);
    res.status(500).json({ message: 'Failed to remove member', error: error.message });
  }
};

// 🔡 Admin: Get all groups with members and classes
export const getAllGroupsForAdmin = async (req, res) => {
  const { role } = req.user;

  if (role !== 'admin') {
    return res.status(403).json({ message: 'Only admin can access this' });
  }

  try {
    const groups = await Group.findAll({
      include: [
        {
          model: GroupMember,
          as: 'Members',
          include: [{ model: User, attributes: ['id', 'name', 'email', 'role'] }]
        },
        {
          model: ClassSchedule,
          where: { group_id: { [Op.ne]: null } },
          required: false
        }
      ],
      order: [['created_at', 'DESC']]
    });

    res.status(200).json({ groups });
  } catch (error) {
    console.error('Error fetching all groups:', error);
    res.status(500).json({ message: 'Failed to fetch groups', error: error.message });
  }
};
