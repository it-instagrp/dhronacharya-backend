import db from '../models/index.js';
import { sendEmail } from '../utils/email.js';
import { sendWhatsApp } from '../utils/whatsapp.js';
import { Op } from 'sequelize';
import { templates } from '../templates/index.js';
import { sendSMS } from '../utils/sms.js';

const { class: classTemplates } = templates;
const { ClassSchedule, User } = db;

// Native date formatter for India timezone
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

// Schedule a Class
export const createClass = async (req, res) => {
  const { name, tutor_id, student_id, meeting_link, date_time, type, mode } = req.body;
  const { id: userId, role } = req.user;

  try {
    if (!name || !date_time) return res.status(400).json({ message: 'Class name and date_time are required' });

    const targetTime = new Date(date_time);
    if (isNaN(targetTime.getTime()) || targetTime <= new Date()) {
      return res.status(400).json({ message: 'Invalid date_time. Must be future ISO format.' });
    }

    let finalTutorId = tutor_id;
    let finalStudentId = student_id;
    if (role === 'tutor') {
      finalTutorId = userId;
      if (!student_id) return res.status(400).json({ message: 'student_id is required for tutor' });
    } else if (role === 'student') {
      finalStudentId = userId;
      if (!tutor_id) return res.status(400).json({ message: 'tutor_id is required for student' });
    } else return res.status(403).json({ message: 'Only tutors or students can schedule classes' });

    const [tutor, student] = await Promise.all([User.findByPk(finalTutorId), User.findByPk(finalStudentId)]);
    if (!tutor || !student) return res.status(404).json({ message: 'User not found' });

    // Conflict check (30 min buffer)
    const bufferStart = new Date(targetTime.getTime() - 30 * 60 * 1000);
    const bufferEnd = new Date(targetTime.getTime() + 30 * 60 * 1000);
    const conflict = await ClassSchedule.findOne({
      where: {
        date_time: { [Op.between]: [bufferStart, bufferEnd] },
        status: 'scheduled',
        [Op.or]: [{ tutor_id: finalTutorId }, { student_id: finalStudentId }],
      },
    });

    if (conflict) return res.status(409).json({ message: 'Time slot conflict', conflict });

    const scheduledClass = await ClassSchedule.create({
      title: name,
      tutor_id: finalTutorId,
      tutor_name: tutor.name,
      student_id: finalStudentId,
      student_name: student.name,
      meeting_link: mode === 'offline' ? null : (meeting_link || null),
      date_time: targetTime,
      type: type || 'regular',
      subject: name,
      mode: mode || 'online',
      status: 'scheduled'
    });

    const formattedDate = formatDateNative(targetTime);
    const notifications = [];

    // Email
    if (student.email) notifications.push(sendEmail(student.email, 'Class Scheduled', classTemplates.scheduled.email({ className: name, dateTime: formattedDate, studentName: student.name, tutorName: tutor.name, joinLink: mode === 'offline' ? null : meeting_link, recipientRole: 'student' })));
    if (tutor.email) notifications.push(sendEmail(tutor.email, 'Class Scheduled', classTemplates.scheduled.email({ className: name, dateTime: formattedDate, studentName: student.name, tutorName: tutor.name, joinLink: mode === 'offline' ? null : meeting_link, recipientRole: 'tutor' })));

    // WhatsApp
    const whatsappMsg = classTemplates.scheduled.whatsapp({ className: name, dateTime: formattedDate, joinLink: mode === 'offline' ? null : meeting_link });
    if (student.mobile_number) notifications.push(sendWhatsApp(student.mobile_number, whatsappMsg));
    if (tutor.mobile_number) notifications.push(sendWhatsApp(tutor.mobile_number, whatsappMsg));

    // SMS
    const smsMsg = classTemplates.scheduled.sms({ className: name, dateTime: formattedDate, joinLink: mode === 'offline' ? null : meeting_link });
    if (student.mobile_number) notifications.push(sendSMS(student.mobile_number, smsMsg));
    if (tutor.mobile_number) notifications.push(sendSMS(tutor.mobile_number, smsMsg));

    await Promise.all(notifications);

    return res.status(201).json({
      message: 'Class scheduled successfully',
      data: {
        ...scheduledClass.toJSON(),
        formatted_date_time: formattedDate,
        Student: { id: student.id, name: student.name, email: student.email },
        Tutor: { id: tutor.id, name: tutor.name, email: tutor.email },
      }
    });

  } catch (error) {
    console.error('Error in createClass:', error);
    return res.status(500).json({ message: 'Failed to schedule class', error: error.message });
  }
};


// Update Class
export const updateClass = async (req, res) => {
  const { id } = req.params;
  const { name, date_time, meeting_link, status, subject, mode } = req.body;
  const { id: userId, role } = req.user;

  try {
    const scheduledClass = await ClassSchedule.findByPk(id);
    if (!scheduledClass) return res.status(404).json({ message: 'Class not found' });
    if (role !== 'admin' && userId !== scheduledClass.tutor_id && userId !== scheduledClass.student_id) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    if (date_time) {
      const newDate = new Date(date_time);
      if (isNaN(newDate.getTime()) || newDate <= new Date()) {
        return res.status(400).json({ message: 'Class must be scheduled for a future time' });
      }
    }

    const originalValues = { date_time: scheduledClass.date_time, title: scheduledClass.title, status: scheduledClass.status };
    const updates = {};
    if (name) updates.title = name;
    if (subject) updates.subject = subject;
    if (date_time) updates.date_time = date_time;
    if (meeting_link) updates.meeting_link = meeting_link;
    if (status) updates.status = status;
    if (mode) updates.mode = mode;

    await scheduledClass.update(updates);

    const [student, tutor] = await Promise.all([
      User.findByPk(scheduledClass.student_id),
      User.findByPk(scheduledClass.tutor_id)
    ]);

    const notifications = [];
    const formattedNewTime = formatDateNative(scheduledClass.date_time);

    // Only notify if date_time changed
    if (date_time && originalValues.date_time.toISOString() !== scheduledClass.date_time.toISOString()) {
      const templateData = { className: scheduledClass.title, newDateTime: formattedNewTime, studentName: student.name, tutorName: tutor.name, joinLink: mode === 'offline' ? null : (meeting_link || scheduledClass.meeting_link) };

      // Email
      if (student?.email) notifications.push(sendEmail(student.email, 'Class Rescheduled', classTemplates.rescheduled.email({ ...templateData, recipientRole: 'student' })));
      if (tutor?.email) notifications.push(sendEmail(tutor.email, 'Class Rescheduled', classTemplates.rescheduled.email({ ...templateData, recipientRole: 'tutor' })));

      // WhatsApp
      const whatsappMsg = classTemplates.rescheduled.whatsapp(templateData);
      if (student?.mobile_number) notifications.push(sendWhatsApp(student.mobile_number, whatsappMsg));
      if (tutor?.mobile_number) notifications.push(sendWhatsApp(tutor.mobile_number, whatsappMsg));

      // SMS
      const smsMsg = classTemplates.rescheduled.sms(templateData);
      if (student?.mobile_number) notifications.push(sendSMS(student.mobile_number, smsMsg));
      if (tutor?.mobile_number) notifications.push(sendSMS(tutor.mobile_number, smsMsg));
    }

    await Promise.all(notifications);

    return res.status(200).json({
      message: 'Class updated successfully',
      data: {
        ...scheduledClass.toJSON(),
        formatted_date_time: formattedNewTime,
        Student: { id: student.id, name: student.name, email: student.email },
        Tutor: { id: tutor.id, name: tutor.name, email: tutor.email },
      }
    });

  } catch (err) {
    console.error('Error updating class:', err);
    return res.status(500).json({ message: 'Failed to update class', error: err.message });
  }
};


// Cancel Class
export const cancelClass = async (req, res) => {
  const { id } = req.params;
  const { id: userId, role } = req.user;
  const { cancellation_reason } = req.body;

  try {
    const scheduledClass = await ClassSchedule.findByPk(id);
    if (!scheduledClass) {
      return res.status(404).json({ message: 'Class not found' });
    }

    if (role !== 'admin' && userId !== scheduledClass.tutor_id && userId !== scheduledClass.student_id) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    if (scheduledClass.status === 'cancelled') {
      return res.status(400).json({ message: 'Class already cancelled' });
    }

    if (scheduledClass.status === 'completed') {
      return res.status(400).json({ message: 'Cannot cancel completed class' });
    }

    await scheduledClass.update({
      status: 'cancelled',
      cancellation_reason: cancellation_reason || null
    });

    const [student, tutor] = await Promise.all([
      User.findByPk(scheduledClass.student_id),
      User.findByPk(scheduledClass.tutor_id)
    ]);

    const formattedDate = formatDateNative(scheduledClass.date_time);

    const templateData = {
      className: scheduledClass.title,
      studentName: student.name,
      tutorName: tutor.name,
      cancellationReason: cancellation_reason || 'Not specified',
      originalDateTime: formattedDate
    };

    const notificationPromises = [];

    if (student?.email) {
      const studentEmail = classTemplates.cancelled.email({
        ...templateData,
        recipientRole: 'student'
      });
      notificationPromises.push(sendEmail(student.email, 'Class Cancelled', studentEmail));
    }

    if (tutor?.email) {
      const tutorEmail = classTemplates.cancelled.email({
        ...templateData,
        recipientRole: 'tutor'
      });
      notificationPromises.push(sendEmail(tutor.email, 'Class Cancelled', tutorEmail));
    }

    const whatsappMsg = classTemplates.cancelled.whatsapp({
      className: scheduledClass.title,
      cancellationReason: cancellation_reason || 'Not specified'
    });

    if (student?.mobile_number) {
      notificationPromises.push(sendWhatsApp(student.mobile_number, whatsappMsg));
    }
    if (tutor?.mobile_number) {
      notificationPromises.push(sendWhatsApp(tutor.mobile_number, whatsappMsg));
    }

    await Promise.all(notificationPromises);

    return res.status(200).json({
      message: 'Class cancelled successfully',
      data: {
        classId: scheduledClass.id,
        title: scheduledClass.title,
        status: scheduledClass.status,
        cancellation_reason: scheduledClass.cancellation_reason
      }
    });
  } catch (err) {
    console.error('Error cancelling class:', err);
    return res.status(500).json({ message: 'Failed to cancel class', error: err.message });
  }
};

// Get My Classes
export const getMyClasses = async (req, res) => {
  const { id: userId, role } = req.user;

  try {
    const whereClause = role === 'tutor' ? { tutor_id: userId } : { student_id: userId };

    const classes = await ClassSchedule.findAll({
      where: whereClause,
      order: [['date_time', 'ASC']],
      include: [
        { model: User, as: 'Tutor', attributes: ['id', 'name', 'email'] },
        { model: User, as: 'Student', attributes: ['id', 'name', 'email'] },
      ],
    });

    const formatted = classes.map((cls) => ({
      id: cls.id,
      name: cls.title,
      date_time: cls.date_time,
      type: cls.type,
      subject: cls.subject,
      status: cls.status,
      Student: {
        id: cls.Student?.id || null,
        name: cls.Student?.name || cls.student_name || 'N/A',
        email: cls.Student?.email || 'N/A',
      },
      Tutor: {
        id: cls.Tutor?.id || null,
        name: cls.Tutor?.name || cls.tutor_name || 'N/A',
        email: cls.Tutor?.email || 'N/A',
      },
    }));

    return res.status(200).json({ classes: formatted });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to get classes', error: error.message });
  }
};

// Admin: Get All Classes
export const getAllClasses = async (req, res) => {
  const { role } = req.user;
  if (role !== 'admin') return res.status(403).json({ message: 'Only admins can view all classes' });

  try {
    const allClasses = await ClassSchedule.findAll({
      order: [['date_time', 'DESC']],
      include: [
        { model: User, as: 'Tutor', attributes: ['id', 'email', 'mobile_number', 'name'] },
        { model: User, as: 'Student', attributes: ['id', 'email', 'mobile_number', 'name'] },
      ],
    });

    return res.status(200).json({ classes: allClasses });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to fetch all classes', error: err.message });
  }
};
