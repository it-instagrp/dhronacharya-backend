// src/controllers/group.controller.js
import db from '../models/index.js';
import { Op } from 'sequelize';
import { sendEmail } from '../utils/email.js';
import { sendWhatsApp } from '../utils/whatsapp.js';
import { sendSMS } from '../utils/sms.js';
import { templates } from '../templates/index.js';
// import { formatDateNative } from '../utils/date.js';

const { Group, GroupMember, User, ClassSchedule } = db;
const { group: groupTemplates, class: classTemplates } = templates;

// ➕ Create a new group (duplicate name check, returns group with members)
export const createGroup = async (req, res) => {
  const rawName = req.body?.name;
  const { type } = req.body;
  const { id: creatorId, role } = req.user;

  try {
    if (!rawName || !type) {
      return res.status(400).json({ message: 'Group name and type are required' });
    }

    const name = String(rawName).trim();
    const normalizedType = String(type).toLowerCase();
    const allowedTypes = ['tutor', 'student'];

    if (!allowedTypes.includes(normalizedType)) {
      return res.status(400).json({ message: 'Invalid group type. Only "tutor" or "student" are allowed.' });
    }

    if (name.length < 3 || name.length > 100) {
      return res.status(400).json({ message: 'Group name must be between 3 and 100 characters' });
    }

    const existingGroup = await Group.findOne({
      where: { name, creator_id: creatorId }
    });
    if (existingGroup) {
      return res.status(400).json({ message: 'You already have a group with this name' });
    }

    // Create group
    const group = await Group.create({
      name,
      creator_id: creatorId,
      type: normalizedType
    });

    // Add creator as first member
    await GroupMember.create({ group_id: group.id, user_id: creatorId, role });

    // 🔥 Fetch updated group with members (so frontend immediately sees full info)
    const updatedGroup = await Group.findByPk(group.id, {
      include: [
        {
          model: GroupMember,
          as: 'Members',
          include: [{ model: User, attributes: ['id', 'name', 'email', 'role', 'mobile_number'] }]
        }
      ]
    });

    // Send notifications
    const creator = await User.findByPk(creatorId);
    const emailMessage = groupTemplates?.created?.email?.({
      groupName: group.name,
      creatorName: creator?.name || ''
    });
    const whatsappText = groupTemplates?.created?.whatsapp?.({ groupName: group.name });
    const smsText = groupTemplates?.created?.sms?.({ groupName: group.name });

    const notifications = [];
    if (creator?.email && emailMessage) notifications.push(sendEmail(creator.email, 'Group Created', emailMessage));
    if (creator?.mobile_number && whatsappText) notifications.push(sendWhatsApp(creator.mobile_number, whatsappText));
    if (creator?.mobile_number && smsText) notifications.push(sendSMS(creator.mobile_number, smsText));
    await Promise.allSettled(notifications);

    res.status(201).json({
      message: 'Group created successfully',
      group: updatedGroup
    });
  } catch (error) {
    console.error('Error creating group:', error);
    res.status(500).json({ message: 'Failed to create group', error: error.message });
  }
};

// ➕ Add members to group (returns updated group with members)
export const addMembersToGroup = async (req, res) => {
  const { group_id, member_ids } = req.body;

  try {
    if (!group_id || !Array.isArray(member_ids) || member_ids.length === 0) {
      return res.status(400).json({ message: 'group_id and member_ids[] are required' });
    }

    const group = await Group.findByPk(group_id);
    if (!group) return res.status(404).json({ message: 'Group not found' });

    const users = await User.findAll({ where: { id: { [Op.in]: member_ids } } });

    const members = users.map(u => ({
      group_id,
      user_id: u.id,
      role: u.role
    }));

    await GroupMember.bulkCreate(members, { ignoreDuplicates: true });

    // 🔥 Fetch updated group with all members
    const updatedGroup = await Group.findByPk(group_id, {
      include: [
        {
          model: GroupMember,
          as: 'Members',
          include: [{ model: User, attributes: ['id', 'name', 'email', 'role', 'mobile_number'] }]
        }
      ]
    });

    // Send notifications
    const notifications = [];
    for (const user of users) {
      if (user.email && groupTemplates?.addedToGroup?.email) {
        notifications.push(sendEmail(user.email, 'Added to Group',
          groupTemplates.addedToGroup.email({ groupName: group.name, memberName: user.name })
        ));
      }
      if (user.mobile_number && groupTemplates?.addedToGroup?.whatsapp) {
        notifications.push(sendWhatsApp(user.mobile_number,
          groupTemplates.addedToGroup.whatsapp({ groupName: group.name })
        ));
      }
      if (user.mobile_number && groupTemplates?.addedToGroup?.sms) {
        notifications.push(sendSMS(user.mobile_number,
          groupTemplates.addedToGroup.sms({ groupName: group.name })
        ));
      }
    }
    await Promise.allSettled(notifications);

    res.status(200).json({
      message: 'Members added to group successfully',
      group: updatedGroup
    });
  } catch (error) {
    console.error('Error adding members:', error);
    res.status(500).json({ message: 'Failed to add members', error: error.message });
  }
};

// 📆 Schedule a group class (±30 min duplicate prevention + notifications)

const formatDateNative = (date) =>
  new Date(date).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

export const scheduleGroupClass = async (req, res) => {
  const { group_id, name, tutor_id, meeting_link, date_time, type, mode } = req.body;
  const { id: userId, role } = req.user;

  try {
    if (!group_id || !name || !date_time) {
      return res.status(400).json({ message: 'group_id, name, and date_time are required' });
    }

    // Validate group
    const group = await Group.findByPk(group_id, {
      include: [{ model: GroupMember, as: 'Members', include: [User] }]
    });
    if (!group) return res.status(404).json({ message: 'Group not found' });

    // Validate date_time
    const targetTime = new Date(date_time);
    if (isNaN(targetTime.getTime()) || targetTime <= new Date()) {
      return res.status(400).json({ message: 'Invalid or past date_time' });
    }

    // Check overlapping class in ±30min window
    const startWindow = new Date(targetTime.getTime() - 30 * 60000);
    const endWindow = new Date(targetTime.getTime() + 30 * 60000);
    const overlappingClass = await ClassSchedule.findOne({
      where: { group_id, date_time: { [Op.between]: [startWindow, endWindow] } }
    });
    if (overlappingClass) {
      return res.status(409).json({
        message: `Another class is already scheduled within 30 minutes of ${formatDateNative(targetTime)}`
      });
    }

    // Determine tutor
    const finalTutorId = role === 'tutor' ? userId : tutor_id;
    const tutor = await User.findByPk(finalTutorId);
    if (!tutor) return res.status(404).json({ message: 'Tutor not found' });

    // Create class
    const scheduledClass = await ClassSchedule.create({
      title: name,
      tutor_id: finalTutorId,
      tutor_name: tutor.name,
      group_id,
      meeting_link,
      date_time: targetTime,
      type: type || 'regular',
      mode: mode || 'online',
      status: 'scheduled'
    });

    // Send notifications to all group members
    const formattedDate = formatDateNative(targetTime);
    const notifications = [];
    for (const member of group.Members) {
      const u = member.User;
      if (!u) continue;

      if (u.email && classTemplates?.scheduled?.email) {
        notifications.push(sendEmail(u.email, 'Group Class Scheduled',
          classTemplates.scheduled.email({
            className: name,
            dateTime: formattedDate,
            studentName: u.name,
            tutorName: tutor.name,
            joinLink: meeting_link,
            recipientRole: u.role
          })
        ));
      }
      if (u.mobile_number && classTemplates?.scheduled?.whatsapp) {
        notifications.push(sendWhatsApp(u.mobile_number,
          classTemplates.scheduled.whatsapp({ className: name, dateTime: formattedDate })
        ));
      }
      if (u.mobile_number && classTemplates?.scheduled?.sms) {
        notifications.push(sendSMS(u.mobile_number,
          classTemplates.scheduled.sms({ className: name, dateTime: formattedDate })
        ));
      }
    }
    await Promise.allSettled(notifications);

    return res.status(201).json({
      message: 'Group class scheduled successfully',
      scheduledClass
    });

  } catch (error) {
    console.error('Error scheduling group class:', error);
    return res.status(500).json({ message: 'Failed to schedule group class', error: error.message });
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
          include: [{ model: User, attributes: ['id', 'name', 'email', 'role', 'mobile_number'] }]
        },
        { model: ClassSchedule, where: { group_id: groupId }, required: false }
      ]
    });
    if (!group) return res.status(404).json({ message: 'Group not found' });
    res.status(200).json({ group });
  } catch (error) {
    console.error('Error fetching group members:', error);
    res.status(500).json({ message: 'Failed to fetch group members', error: error.message });
  }
};

// 📆 Get all groups for the logged-in user
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
            include: [{ model: User, attributes: ['id', 'name', 'email', 'role', 'mobile_number'] }]
          },
          { model: ClassSchedule, where: { group_id: { [Op.ne]: null } }, required: false }
        ]
      }]
    });
    res.status(200).json({ groups: memberships.map(m => m.Group) });
  } catch (error) {
    console.error('Error fetching user groups:', error);
    res.status(500).json({ message: 'Failed to fetch user groups', error: error.message });
  }
};

// ❌ Remove a member from group (returns updated group)
export const removeGroupMember = async (req, res) => {
  const { groupId, userId } = req.params;
  try {
    const removed = await GroupMember.destroy({ where: { group_id: groupId, user_id: userId } });
    if (!removed) return res.status(404).json({ message: 'Member not found in group' });

    // 🔥 Fetch updated group with members
    const updatedGroup = await Group.findByPk(groupId, {
      include: [
        {
          model: GroupMember,
          as: 'Members',
          include: [{ model: User, attributes: ['id', 'name', 'email', 'role', 'mobile_number'] }]
        }
      ]
    });

    res.status(200).json({
      message: 'Member removed from group successfully',
      group: updatedGroup
    });
  } catch (error) {
    console.error('Error removing member:', error);
    res.status(500).json({ message: 'Failed to remove member', error: error.message });
  }
};

// 🔡 Admin: Get all groups
export const getAllGroupsForAdmin = async (req, res) => {
  const { role } = req.user;
  if (role !== 'admin') return res.status(403).json({ message: 'Only admin can access this' });
  try {
    const groups = await Group.findAll({
      include: [
        {
          model: GroupMember,
          as: 'Members',
          include: [{ model: User, attributes: ['id', 'name', 'email', 'role', 'mobile_number'] }]
        },
        { model: ClassSchedule, where: { group_id: { [Op.ne]: null } }, required: false }
      ],
      order: [['created_at', 'DESC']]
    });
    res.status(200).json({ groups });
  } catch (error) {
    console.error('Error fetching all groups:', error);
    res.status(500).json({ message: 'Failed to fetch groups', error: error.message });
  }
};
