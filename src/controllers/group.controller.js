
// src/controllers/group.controller.js
import db from '../models/index.js';
import { Op } from 'sequelize';
import { sendEmail } from '../utils/email.js';
import { sendWhatsApp } from '../utils/whatsapp.js';
import { sendSMS } from '../utils/sms.js';
import { templates } from '../templates/index.js';

const { Group, GroupMember, User, ClassSchedule, Enquiry } = db;
const { group: groupTemplates, class: classTemplates } = templates;

// Helper function to format date
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

// Helper function to validate date (not past and valid)
const validateDateTime = (dateTime) => {
  const date = new Date(dateTime);
  
  if (isNaN(date.getTime())) {
    return { valid: false, message: 'Invalid date format' };
  }
  
  const now = new Date();
  // Add buffer of 5 minutes to allow for scheduling classes slightly in the future
  const bufferTime = new Date(now.getTime() + 5 * 60000);
  
  if (date <= bufferTime) {
    return { 
      valid: false, 
      message: 'Date must be at least 5 minutes in the future' 
    };
  }
  
  return { valid: true, date };
};

// Helper function to get accepted students for a tutor
const getAcceptedStudentsForTutor = async (tutorId) => {
  try {
    const accepted = await Enquiry.findAll({
      where: {
        sender_id: tutorId,
        status: "accepted"
      },
      include: [
        {
          model: User,
          as: "Receiver",
          attributes: ["id", "name", "email", "mobile_number", "role"]
        }
      ]
    });

    // Extract unique students
    const studentsMap = new Map();
    accepted.forEach(item => {
      if (item.Receiver && item.Receiver.role === 'student') {
        studentsMap.set(item.Receiver.id, item.Receiver);
      }
    });

    return Array.from(studentsMap.values());
  } catch (error) {
    console.error("Error fetching accepted students:", error);
    return [];
  }
};

// Helper function to get accepted tutors for a student
const getAcceptedTutorsForStudent = async (studentId) => {
  try {
    const accepted = await Enquiry.findAll({
      where: {
        receiver_id: studentId,
        status: "accepted"
      },
      include: [
        {
          model: User,
          as: "Sender",
          attributes: ["id", "name", "email", "mobile_number", "role"]
        }
      ]
    });

    // Extract unique tutors
    const tutorsMap = new Map();
    accepted.forEach(item => {
      if (item.Sender && item.Sender.role === 'tutor') {
        tutorsMap.set(item.Sender.id, item.Sender);
      }
    });

    return Array.from(tutorsMap.values());
  } catch (error) {
    console.error("Error fetching accepted tutors:", error);
    return [];
  }
};

// Helper function to get all accepted connections for a user
const getAcceptedConnections = async (userId, userRole) => {
  if (userRole === 'tutor') {
    return await getAcceptedStudentsForTutor(userId);
  } else if (userRole === 'student') {
    return await getAcceptedTutorsForStudent(userId);
  }
  return [];
};

// Create a new group (duplicate name check, returns group with members)
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

    // Fetch updated group with members (so frontend immediately sees full info)
    const updatedGroup = await Group.findByPk(group.id, {
      include: [
        {
          model: GroupMember,
          as: 'Members',
          include: [
            {
              model: User,
              as: 'User', // important
              attributes: ['id', 'name', 'email', 'role', 'mobile_number']
            }
          ]
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

// Add members to group (returns updated group with members)
export const addMembersToGroup = async (req, res) => {
  const { group_id, member_ids } = req.body;
  const { id: userId, role } = req.user;

  try {
    if (!group_id || !Array.isArray(member_ids) || member_ids.length === 0) {
      return res.status(400).json({ message: 'group_id and member_ids[] are required' });
    }

    const group = await Group.findByPk(group_id);
    if (!group) return res.status(404).json({ message: 'Group not found' });

    // Check if user is group creator or member
    const userMembership = await GroupMember.findOne({
      where: { group_id, user_id: userId }
    });
    
    if (!userMembership && role !== 'admin' && role !== 'super_admin') {
      return res.status(403).json({ message: 'You are not a member of this group' });
    }

    // Get all users
    const users = await User.findAll({ 
      where: { id: { [Op.in]: member_ids } },
      attributes: ['id', 'name', 'email', 'role', 'mobile_number']
    });

    // Check for duplicate users already in group
    const existingMembers = await GroupMember.findAll({
      where: { 
        group_id,
        user_id: { [Op.in]: member_ids }
      }
    });

    if (existingMembers.length > 0) {
      const existingUserIds = existingMembers.map(m => m.user_id);
      const existingUsers = users.filter(u => existingUserIds.includes(u.id));
      
      return res.status(400).json({ 
        message: 'Some users are already in this group',
        duplicateUsers: existingUsers.map(u => ({ id: u.id, name: u.name }))
      });
    }

    // For tutor groups: verify users are accepted students
    if (group.type === 'tutor' && role === 'tutor') {
      const acceptedStudents = await getAcceptedStudentsForTutor(userId);
      const acceptedStudentIds = acceptedStudents.map(s => s.id);
      
      const invalidUsers = users.filter(user => 
        !acceptedStudentIds.includes(user.id) && user.role === 'student'
      );
      
      if (invalidUsers.length > 0) {
        return res.status(400).json({ 
          message: 'Cannot add students who are not in your accepted connections',
          invalidUsers: invalidUsers.map(u => ({ id: u.id, name: u.name }))
        });
      }
    }
    
    // For student groups: verify users are accepted tutors (if applicable)
    if (group.type === 'student' && role === 'student') {
      const acceptedTutors = await getAcceptedTutorsForStudent(userId);
      const acceptedTutorIds = acceptedTutors.map(t => t.id);
      
      const invalidUsers = users.filter(user => 
        !acceptedTutorIds.includes(user.id) && user.role === 'tutor'
      );
      
      if (invalidUsers.length > 0) {
        return res.status(400).json({ 
          message: 'Cannot add tutors who are not in your accepted connections',
          invalidUsers: invalidUsers.map(u => ({ id: u.id, name: u.name }))
        });
      }
    }

    const members = users.map(u => ({
      group_id,
      user_id: u.id,
      role: u.role
    }));

    await GroupMember.bulkCreate(members, { ignoreDuplicates: true });

    // Fetch updated group with all members
    const updatedGroup = await Group.findByPk(group.id, {
      include: [
        {
          model: GroupMember,
          as: 'Members',
          include: [
            {
              model: User,
              as: 'User', //important
              attributes: ['id', 'name', 'email', 'role', 'mobile_number']
            }
          ]
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

    // Check if user is group member
    const userMembership = await GroupMember.findOne({
      where: { group_id, user_id: userId }
    });
    
    if (!userMembership && role !== 'admin' && role !== 'super_admin') {
      return res.status(403).json({ message: 'You are not a member of this group' });
    }

    // Validate date_time - prevent past dates
    const dateValidation = validateDateTime(date_time);
    if (!dateValidation.valid) {
      return res.status(400).json({ message: dateValidation.message });
    }
    const targetTime = dateValidation.date;

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

    // Meeting link required only if ONLINE
    let finalMeetingLink = null;
    const finalMode = mode || 'online';
    if (finalMode === 'online') {
      if (!meeting_link) {
        return res.status(400).json({ message: 'Meeting link is required for online classes' });
      }
      finalMeetingLink = meeting_link;
    }

    // Create class
    const scheduledClass = await ClassSchedule.create({
      title: name,
      tutor_id: finalTutorId,
      tutor_name: tutor.name,
      group_id,
      meeting_link: finalMeetingLink,
      date_time: targetTime,
      type: type || 'regular',
      mode: finalMode,
      status: 'scheduled'
    });

    // Send notifications
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
            joinLink: finalMode === 'online' ? finalMeetingLink : 'Offline Class',
            recipientRole: u.role
          })
        ));
      }
      if (u.mobile_number && classTemplates?.scheduled?.whatsapp) {
        notifications.push(sendWhatsApp(u.mobile_number,
          classTemplates.scheduled.whatsapp({ 
            className: name, 
            dateTime: formattedDate, 
            mode: finalMode 
          })
        ));
      }
      if (u.mobile_number && classTemplates?.scheduled?.sms) {
        notifications.push(sendSMS(u.mobile_number,
          classTemplates.scheduled.sms({ 
            className: name, 
            dateTime: formattedDate, 
            mode: finalMode 
          })
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

// Get members of a group (with classes)
export const getGroupMembers = async (req, res) => {
  const { groupId } = req.params;
  const { id: userId, role } = req.user;
  
  try {
    // Check if user is group member
    const userMembership = await GroupMember.findOne({
      where: { group_id: groupId, user_id: userId }
    });
    
    if (!userMembership && role !== 'admin' && role !== 'super_admin') {
      return res.status(403).json({ message: 'You are not a member of this group' });
    }

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

// Get all groups for the logged-in user WITH accepted connections
export const getMyGroups = async (req, res) => {
  const { id: userId, role } = req.user;
  try {
    // Get user's groups
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

    // Get accepted connections based on role
    const acceptedConnections = await getAcceptedConnections(userId, role);

    res.status(200).json({ 
      groups: memberships.map(m => m.Group),
      acceptedConnections: acceptedConnections
    });
  } catch (error) {
    console.error('Error fetching user groups:', error);
    res.status(500).json({ message: 'Failed to fetch user groups', error: error.message });
  }
};

// Remove a member from group (returns updated group)
export const removeGroupMember = async (req, res) => {
  const { groupId, userId: targetUserId } = req.params;
  const { id: currentUserId, role } = req.user;

  try {
    // Check if group exists
    const group = await Group.findByPk(groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });

    // Check if target user is in group
    const targetMembership = await GroupMember.findOne({
      where: { group_id: groupId, user_id: targetUserId }
    });
    if (!targetMembership) {
      return res.status(404).json({ message: 'Member not found in group' });
    }

    // Authorization logic:
    // 1. Admins can remove anyone
    // 2. Group creator can remove anyone (except themselves if they're the only member)
    // 3. Users can only remove themselves
    let canRemove = false;
    
    if (role === 'admin' || role === 'super_admin') {
      canRemove = true;
    } else if (group.creator_id === currentUserId) {
      // Group creator can remove anyone
      canRemove = true;
      
      // Prevent removing themselves if they're the only member
      if (targetUserId === currentUserId) {
        const memberCount = await GroupMember.count({ where: { group_id: groupId } });
        if (memberCount === 1) {
          return res.status(400).json({ 
            message: 'Cannot remove yourself as you are the only member. Delete the group instead.' 
          });
        }
      }
    } else if (targetUserId === currentUserId) {
      // Users can remove themselves
      canRemove = true;
    } else {
      return res.status(403).json({ 
        message: 'You can only remove yourself from the group. Only group creator or admin can remove other members.' 
      });
    }

    if (!canRemove) {
      return res.status(403).json({ message: 'Not authorized to remove this member' });
    }

    const removed = await GroupMember.destroy({ 
      where: { group_id: groupId, user_id: targetUserId } 
    });

    // Fetch updated group with members
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

// Admin: Get all groups
export const getAllGroupsForAdmin = async (req, res) => {
  const { role } = req.user;
  if (role !== 'admin' && role !== 'super_admin' ) return res.status(403).json({ message: 'Only admin can access this' });
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

// Get all scheduled classes for a group
export const getGroupClasses = async (req, res) => {
  const { groupId } = req.params;
  const { id: userId, role } = req.user;

  try {
    // Check if user is group member
    const userMembership = await GroupMember.findOne({
      where: { group_id: groupId, user_id: userId }
    });
    
    if (!userMembership && role !== 'admin' && role !== 'super_admin') {
      return res.status(403).json({ message: 'You are not a member of this group' });
    }

    const classes = await ClassSchedule.findAll({
      where: { group_id: groupId },
      include: [
        {
          model: User,
          as: "Tutor",
          attributes: ["id", "name", "email", "mobile_number", "role"]
        },
        {
          model: Group,
          attributes: ["id", "name", "type"],
          include: [
            {
              model: GroupMember,
              as: "Members",
              include: [{ model: User, attributes: ["id", "name", "email", "mobile_number", "role"] }]
            }
          ]
        }
      ],
      order: [["date_time", "ASC"]]
    });

    return res.status(200).json({ classes });
  } catch (error) {
    console.error("Error fetching group classes:", error);
    return res.status(500).json({ message: "Failed to fetch group classes", error: error.message });
  }
};

// Get all scheduled classes for logged-in user (both as tutor and as group member)
export const getMyScheduledClasses = async (req, res) => {
  const { id: userId, role } = req.user;

  try {
    let classes = [];

    if (role === 'tutor') {
      // For tutors, get classes they are teaching
      classes = await ClassSchedule.findAll({
        where: { tutor_id: userId },
        include: [
          {
            model: User,
            as: "Tutor",
            attributes: ["id", "name", "email", "mobile_number", "role"]
          },
          {
            model: Group,
            attributes: ["id", "name", "type"],
            include: [
              {
                model: GroupMember,
                as: "Members",
                include: [{ model: User, attributes: ["id", "name", "email", "mobile_number", "role"] }]
              }
            ]
          }
        ],
        order: [["date_time", "ASC"]]
      });
    } else {
      // For students, get classes from groups they are members of
      const userGroups = await GroupMember.findAll({
        where: { user_id: userId },
        attributes: ['group_id']
      });

      const groupIds = userGroups.map(membership => membership.group_id);

      if (groupIds.length > 0) {
        classes = await ClassSchedule.findAll({
          where: { group_id: { [Op.in]: groupIds } },
          include: [
            {
              model: User,
              as: "Tutor",
              attributes: ["id", "name", "email", "mobile_number", "role"]
            },
            {
              model: Group,
              attributes: ["id", "name", "type"],
              include: [
                {
                  model: GroupMember,
                  as: "Members",
                  include: [{ model: User, attributes: ["id", "name", "email", "mobile_number", "role"] }]
                }
              ]
            }
          ],
          order: [["date_time", "ASC"]]
        });
      }
    }

    return res.status(200).json({ 
      data: { classes }, // Match the expected frontend structure
      classes // Also include direct classes property for backward compatibility
    });
  } catch (error) {
    console.error("Error fetching my scheduled classes:", error);
    return res.status(500).json({ message: "Failed to fetch my scheduled classes", error: error.message });
  }
};

// Delete a scheduled group class
export const deleteGroupClass = async (req, res) => {
  const { classId } = req.params;
  const { id: userId, role } = req.user;

  try {
    const scheduledClass = await ClassSchedule.findByPk(classId);
    if (!scheduledClass) {
      return res.status(404).json({ message: "Class not found" });
    }

    // Only tutor who created it or admin can delete
    if (role !== "admin" && role !== 'super_admin' && scheduledClass.tutor_id !== userId ) {
      return res.status(403).json({ message: "Not authorized to delete this class" });
    }

    await scheduledClass.destroy();

    return res.status(200).json({ message: "Class deleted successfully" });
  } catch (error) {
    console.error("❌ Error deleting group class:", error);
    return res.status(500).json({ message: "Failed to delete class", error: error.message });
  }
};

// Update (reschedule) a group class
export const updateGroupClass = async (req, res) => {
  const { classId } = req.params;
  const { name, date_time, meeting_link, mode, type } = req.body;
  const { id: userId, role } = req.user;

  try {
    const scheduledClass = await ClassSchedule.findByPk(classId);
    if (!scheduledClass) {
      return res.status(404).json({ message: "Class not found" });
    }

    // Only tutor who created it or admin can update
    if (role !== "admin"  && role !== 'super_admin' && scheduledClass.tutor_id !== userId) {
      return res.status(403).json({ message: "Not authorized to update this class" });
    }

    // If rescheduling, validate date_time - prevent past dates
    if (date_time) {
      const dateValidation = validateDateTime(date_time);
      if (!dateValidation.valid) {
        return res.status(400).json({ message: dateValidation.message });
      }
      scheduledClass.date_time = dateValidation.date;
    }

    if (name) scheduledClass.title = name;
    if (meeting_link) scheduledClass.meeting_link = meeting_link;
    if (mode) scheduledClass.mode = mode;
    if (type) scheduledClass.type = type;

    await scheduledClass.save();

    return res.status(200).json({ message: "Class updated successfully", class: scheduledClass });
  } catch (error) {
    console.error("Error updating group class:", error);
    return res.status(500).json({ message: "Failed to update class", error: error.message });
  }
};

// Update group
export const updateGroup = async (req, res) => {
  const { groupId } = req.params;
  const { name, type } = req.body;
  const { id: userId, role } = req.user;

  try {
    const group = await Group.findByPk(groupId);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    // Only creator or admin can update
    if (role !== "admin" && role !== 'super_admin' && group.creator_id !== userId) {
      return res.status(403).json({ message: "Not authorized to update this group" });
    }

    if (name) {
      if (name.length < 3 || name.length > 100) {
        return res.status(400).json({ message: "Group name must be between 3 and 100 characters" });
      }
      group.name = String(name).trim();
    }

    if (type) {
      const allowedTypes = ["tutor", "student"];
      if (!allowedTypes.includes(type.toLowerCase())) {
        return res.status(400).json({ message: "Invalid group type. Only 'tutor' or 'student' are allowed." });
      }
      group.type = type.toLowerCase();
    }

    await group.save();

    // Fetch updated group with members
    const updatedGroup = await Group.findByPk(group.id, {
      include: [
        {
          model: GroupMember,
          as: "Members",
          include: [{ model: User, attributes: ["id", "name", "email", "role", "mobile_number"] }]
        },
        { model: ClassSchedule, where: { group_id: groupId }, required: false }
      ]
    });

    return res.status(200).json({ message: "Group updated successfully", group: updatedGroup });
  } catch (error) {
    console.error("Error updating group:", error);
    return res.status(500).json({ message: "Failed to update group", error: error.message });
  }
};

// Delete group
export const deleteGroup = async (req, res) => {
  const { groupId } = req.params;
  const { id: userId, role } = req.user;

  try {
    const group = await Group.findByPk(groupId);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    // Only creator or admin can delete
    if (role !== "admin" && role !== 'super_admin' && group.creator_id !== userId) {
      return res.status(403).json({ message: "Not authorized to delete this group" });
    }

    await group.destroy();

    return res.status(200).json({ message: "Group deleted successfully" });
  } catch (error) {
    console.error("Error deleting group:", error);
    return res.status(500).json({ message: "Failed to delete group", error: error.message });
  }
};

// CANCEL a group class (instead of deleting)
export const cancelGroupClass = async (req, res) => {
  const { classId } = req.params;
  const { cancellation_reason } = req.body;
  const { id: userId, role } = req.user;

  try {
    const scheduledClass = await ClassSchedule.findByPk(classId, {
      include: [
        {
          model: Group,
          include: [
            {
              model: GroupMember,
              as: "Members",
              include: [{ model: User }]
            }
          ]
        }
      ]
    });

    if (!scheduledClass) {
      return res.status(404).json({ message: "Class not found" });
    }

    // Authorization: only tutor who created it OR admin
    if (role !== "admin" && role !== 'super_admin' && scheduledClass.tutor_id !== userId) {
      return res.status(403).json({ message: "Not authorized to cancel this class" });
    }

    // Cannot cancel completed class
    if (scheduledClass.status === "completed") {
      return res.status(400).json({ message: "Cannot cancel a completed class" });
    }

    // Already cancelled
    if (scheduledClass.status === "cancelled") {
      return res.status(400).json({ message: "Class is already cancelled" });
    }

    // Cancel class
    scheduledClass.status = "cancelled";
    scheduledClass.cancellation_reason = cancellation_reason || "Not specified";
    await scheduledClass.save();

    // If group class, notify members
    const members = scheduledClass.Group?.Members || [];
    const formattedDate = formatDateNative(scheduledClass.date_time);

    const notifications = [];

    for (const member of members) {
      const user = member.User;
      if (!user) continue;

      if (user.email && classTemplates.cancelled?.email) {
        notifications.push(
          sendEmail(
            user.email,
            "Group Class Cancelled",
            classTemplates.cancelled.email({
              className: scheduledClass.title,
              cancellationReason: scheduledClass.cancellation_reason,
              originalDateTime: formattedDate,
              recipientName: user.name
            })
          )
        );
      }

      if (user.mobile_number && classTemplates.cancelled?.sms) {
        notifications.push(
          sendSMS(
            user.mobile_number,
            classTemplates.cancelled.sms({
              className: scheduledClass.title,
              cancellationReason: scheduledClass.cancellation_reason
            })
          )
        );
      }
    }

    await Promise.allSettled(notifications);

    return res.status(200).json({
      message: "Class cancelled successfully",
      class: scheduledClass
    });

  } catch (err) {
    console.error("Cancel group class error:", err);
    return res.status(500).json({
      message: "Failed to cancel group class",
      error: err.message
    });
  }
};

// Completed class mark
export const completeGroupClass = async (req, res) => {
  const { classId } = req.params;
  const { id: userId, role } = req.user;

  try {
    const scheduledClass = await ClassSchedule.findByPk(classId, {
      include: [
        {
          model: Group,
          include: [
            {
              model: GroupMember,
              as: "Members",
              include: [{ model: User }]
            }
          ]
        }
      ]
    });

    if (!scheduledClass) {
      return res.status(404).json({ message: "Class not found" });
    }

    // Only tutor who created it OR admin can complete
    if (role !== "admin" && role !== 'super_admin' && scheduledClass.tutor_id !== userId) {
      return res.status(403).json({ message: "Not authorized to mark class as completed" });
    }

    if (scheduledClass.status === "cancelled") {
      return res.status(400).json({ message: "Cannot complete a cancelled class" });
    }

    if (scheduledClass.status === "completed") {
      return res.status(400).json({ message: "Class is already completed" });
    }

    // Update status
    scheduledClass.status = "completed";
    await scheduledClass.save();

    // SEND NOTIFICATIONS (GROUP ONLY)
    const members = scheduledClass.Group?.Members || [];  // SAFE ACCESS
    const formattedDate = formatDateNative(scheduledClass.date_time);
    const notif = [];

    for (const m of members) {
      const u = m?.User;
      if (!u) continue;

      // EMAIL
      if (u.email && classTemplates.completed?.email) {
        notif.push(
          sendEmail(
            u.email,
            "Group Class Completed",
            classTemplates.completed.email({
              className: scheduledClass.title,
              dateTime: formattedDate,
              recipientName: u.name
            })
          )
        );
      }

      // SMS
      if (u.mobile_number && classTemplates.completed?.sms) {
        notif.push(
          sendSMS(
            u.mobile_number,
            classTemplates.completed.sms({
              className: scheduledClass.title,
              dateTime: formattedDate
            })
          )
        );
      }
    }

    await Promise.allSettled(notif);

    return res.status(200).json({
      message: "Class marked as completed",
      class: scheduledClass
    });

  } catch (err) {
    console.error("Complete group class error:", err);
    return res.status(500).json({
      message: "Failed to complete class",
      error: err.message
    });
  }
};

// Get accepted connections for current user
export const getMyAcceptedConnections = async (req, res) => {
  const { id: userId, role } = req.user;

  try {
    let connections = [];
    
    if (role === 'tutor') {
      // For tutors: get accepted students
      const acceptedStudents = await getAcceptedStudentsForTutor(userId);
      connections = acceptedStudents.map(student => ({
        ...student.toJSON(),
        connectionType: 'student'
      }));
    } else if (role === 'student') {
      // For students: get accepted tutors
      const acceptedTutors = await getAcceptedTutorsForStudent(userId);
      connections = acceptedTutors.map(tutor => ({
        ...tutor.toJSON(),
        connectionType: 'tutor'
      }));
    } else {
      // Admin/super_admin can see all accepted connections
      const allAccepted = await Enquiry.findAll({
        where: { status: "accepted" },
        include: [
          {
            model: User,
            as: "Sender",
            attributes: ["id", "name", "email", "mobile_number", "role"]
          },
          {
            model: User,
            as: "Receiver",
            attributes: ["id", "name", "email", "mobile_number", "role"]
          }
        ]
      });

      // Format connections for admin
      connections = allAccepted.map(enquiry => ({
        id: enquiry.id,
        sender: enquiry.Sender,
        receiver: enquiry.Receiver,
        status: enquiry.status,
        createdAt: enquiry.created_at,
        connectionType: `${enquiry.Sender?.role} → ${enquiry.Receiver?.role}`
      }));
    }

    res.status(200).json({
      success: true,
      connections: connections,
      count: connections.length
    });
  } catch (error) {
    console.error('Error fetching accepted connections:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch accepted connections', 
      error: error.message 
    });
  }
};

// Get available users to add to a group (based on accepted connections)
export const getAvailableUsersForGroup = async (req, res) => {
  const { groupId } = req.params;
  const { id: userId, role } = req.user;

  try {
    const group = await Group.findByPk(groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });

    // Check if user is group member
    const userMembership = await GroupMember.findOne({
      where: { group_id: groupId, user_id: userId }
    });
    
    if (!userMembership && role !== 'admin' && role !== 'super_admin') {
      return res.status(403).json({ message: 'You are not a member of this group' });
    }

    // Get current group members
    const currentMembers = await GroupMember.findAll({
      where: { group_id: groupId },
      attributes: ['user_id']
    });
    const currentMemberIds = currentMembers.map(m => m.user_id);

    // Get available users based on role and group type
    let availableUsers = [];

    if (group.type === 'tutor' && role === 'tutor') {
      // For tutor groups: get accepted students not already in group
      const acceptedStudents = await getAcceptedStudentsForTutor(userId);
      availableUsers = acceptedStudents.filter(student => 
        !currentMemberIds.includes(student.id)
      );
    } else if (group.type === 'student' && role === 'student') {
      // For student groups: get accepted tutors not already in group
      const acceptedTutors = await getAcceptedTutorsForStudent(userId);
      availableUsers = acceptedTutors.filter(tutor => 
        !currentMemberIds.includes(tutor.id)
      );
    } else if (role === 'admin' || role === 'super_admin') {
      // Admin can see all users of opposite role
      const targetRole = group.type === 'tutor' ? 'student' : 'tutor';
      availableUsers = await User.findAll({
        where: { 
          role: targetRole,
          id: { [Op.notIn]: currentMemberIds }
        },
        attributes: ['id', 'name', 'email', 'role', 'mobile_number']
      });
    }

    res.status(200).json({
      success: true,
      availableUsers,
      count: availableUsers.length
    });
  } catch (error) {
    console.error('Error fetching available users:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch available users', 
      error: error.message 
    });
  }
};

// Get accepted students for tutor (API endpoint)
// Get accepted students for tutor (API endpoint)
export const getAcceptedStudentsForTutorAPI = async (req, res) => {
  try {
    const tutorId = req.user.id;  // tutor logged in

    const acceptedStudents = await getAcceptedStudentsForTutor(tutorId);

    // Format response to only include id, name, and role
    const formattedStudents = acceptedStudents.map(student => ({
      id: student.id,
      name: student.name,
      role: student.role
    }));

    return res.status(200).json({
      success: true,
      students: formattedStudents
    });

  } catch (error) {
    console.error("Error fetching accepted students:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch students",
      error: error.message
    });
  }
};

// Get accepted tutors for student (API endpoint)
export const getAcceptedTutorsForStudentAPI = async (req, res) => {
  try {
    const studentId = req.user.id;  // student logged in

    const acceptedTutors = await getAcceptedTutorsForStudent(studentId);

    return res.status(200).json({
      success: true,
      tutors: acceptedTutors
    });

  } catch (error) {
    console.error("Error fetching accepted tutors:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch tutors",
      error: error.message
    });
  }
};

// Self-remove from group (student can remove themselves)
export const leaveGroup = async (req, res) => {
  const { groupId } = req.params;
  const { id: userId, role } = req.user;

  try {
    // Check if group exists
    const group = await Group.findByPk(groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });

    // Check if user is in group
    const userMembership = await GroupMember.findOne({
      where: { group_id: groupId, user_id: userId }
    });
    
    if (!userMembership) {
      return res.status(404).json({ message: 'You are not a member of this group' });
    }

    // Check if user is group creator
    if (group.creator_id === userId) {
      const memberCount = await GroupMember.count({ where: { group_id: groupId } });
      if (memberCount === 1) {
        return res.status(400).json({ 
          message: 'You are the only member. Please delete the group instead of leaving.' 
        });
      }
      
      // Creator can leave but we should notify or handle this scenario
      // For now, allow creator to leave
    }

    // Remove user from group
    await GroupMember.destroy({ 
      where: { group_id: groupId, user_id: userId } 
    });

    res.status(200).json({
      message: 'You have successfully left the group'
    });
  } catch (error) {
    console.error('Error leaving group:', error);
    res.status(500).json({ message: 'Failed to leave group', error: error.message });
  }
};
