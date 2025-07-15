import db from '../models/index.js';
import { sendEmail } from '../utils/email.js';
import { sendWhatsApp } from '../utils/whatsapp.js';
import { Op } from 'sequelize';

const { ClassSchedule, User } = db;

// 🗕 Schedule a Class (supports tutor or student)
export const createClass = async (req, res) => {
  const { name, tutor_id, student_id, zoom_link, date_time, type } = req.body;
  const role = req.user.role;
  const userId = req.user.id;

  try {
    if (!name) return res.status(400).json({ message: 'Class name is required' });
    if (!date_time) return res.status(400).json({ message: 'Class date_time is required' });

    let finalTutorId = tutor_id;
    let finalStudentId = student_id;

    if (role === 'tutor') {
      finalTutorId = userId;
      if (!student_id) return res.status(400).json({ message: 'student_id is required' });
    } else if (role === 'student') {
      finalStudentId = userId;
      if (!tutor_id) return res.status(400).json({ message: 'tutor_id is required' });
    } else {
      return res.status(403).json({ message: 'Only tutors or students can schedule classes' });
    }

    const tutor = await User.findByPk(finalTutorId);
    const student = await User.findByPk(finalStudentId);

    const targetTime = new Date(date_time);
    const bufferStart = new Date(targetTime.getTime() - 30 * 60 * 1000);
    const bufferEnd = new Date(targetTime.getTime() + 30 * 60 * 1000);

    const conflict = await ClassSchedule.findOne({
      where: {
        date_time: { [Op.between]: [bufferStart, bufferEnd] },
        status: 'scheduled',
        [Op.or]: [
          { tutor_id: finalTutorId },
          { student_id: finalStudentId }
        ]
      }
    });

    if (conflict) {
      let suggestedTime = new Date(targetTime.getTime() + 30 * 60 * 1000);
      const maxTime = new Date(targetTime.getTime() + 60 * 60 * 1000);
      let found = false;

      while (suggestedTime <= maxTime) {
        const bufferStartNew = new Date(suggestedTime.getTime() - 30 * 60 * 1000);
        const bufferEndNew = new Date(suggestedTime.getTime() + 30 * 60 * 1000);

        const slotConflict = await ClassSchedule.findOne({
          where: {
            date_time: { [Op.between]: [bufferStartNew, bufferEndNew] },
            status: 'scheduled',
            [Op.or]: [
              { tutor_id: finalTutorId },
              { student_id: finalStudentId }
            ]
          }
        });

        if (!slotConflict) {
          found = true;
          break;
        }

        suggestedTime = new Date(suggestedTime.getTime() + 30 * 60 * 1000);
      }

      return res.status(409).json({
        message: '⛘ Conflict: A class is already scheduled within 30 minutes for this tutor or student.',
        conflict,
        suggestion: found ? suggestedTime.toISOString() : '❌ No free slot found within next 1 hour'
      });
    }

    const scheduledClass = await ClassSchedule.create({
      title: name,
      tutor_id: finalTutorId,
      tutor_name: tutor?.name || null,
      student_id: finalStudentId,
      student_name: student?.name || null,
      zoom_link,
      date_time,
      type: type || 'regular',
      subject: name,
    });

    const formattedDate = new Date(date_time).toLocaleString();
    const msg = `📚 New ${type || 'regular'} class scheduled: "${name}" on ${formattedDate}`;

    if (student.email) await sendEmail(student.email, 'Class Scheduled', msg);
    if (tutor.email) await sendEmail(tutor.email, 'Class Scheduled', msg);
    if (student.mobile_number) await sendWhatsApp(student.mobile_number, msg);
    if (tutor.mobile_number) await sendWhatsApp(tutor.mobile_number, msg);

    return res.status(201).json({
      message: '✅ Class scheduled successfully',
      scheduledClass: {
        ...scheduledClass.toJSON(),
        Student: {
          id: student.id,
          name: student.name,
          email: student.email
        },
        Tutor: {
          id: tutor.id,
          name: tutor.name,
          email: tutor.email
        }
      }
    });

  } catch (error) {
    console.error('Error scheduling class:', error);
    return res.status(500).json({
      message: '❌ Error scheduling class',
      error: error.message
    });
  }
};

// 🗖 Get Scheduled Classes (for tutor or student)
export const getMyClasses = async (req, res) => {
  const userId = req.user.id;
  const role = req.user.role;

  try {
    const whereClause =
      role === 'tutor' ? { tutor_id: userId } :
      role === 'student' ? { student_id: userId } : {};

    const classes = await ClassSchedule.findAll({
      where: whereClause,
      order: [['date_time', 'ASC']],
      include: [
        {
          model: User,
          as: 'Tutor',
          attributes: ['id', 'name', 'email'],
        },
        {
          model: User,
          as: 'Student',
          attributes: ['id', 'name', 'email'],
        },
      ],
    });

    const formatted = classes.map((cls) => ({
      id: cls.id,
      name: cls.title || "Class",
      date_time: cls.date_time,
      type: cls.type,
      subject: cls.subject || cls.title || "N/A",
      status: cls.status,
      Student: {
        id: cls.Student?.id || null,
        name: cls.Student?.name || cls.student_name || "N/A",
        email: cls.Student?.email || "N/A",
      },
      Tutor: {
        id: cls.Tutor?.id || null,
        name: cls.Tutor?.name || cls.tutor_name || "N/A",
        email: cls.Tutor?.email || "N/A",
      },
    }));

    return res.status(200).json({ classes: formatted });

  } catch (error) {
    return res.status(500).json({
      message: '❌ Failed to get classes',
      error: error.message,
    });
  }
};

// ✏ Update Class Details
export const updateClass = async (req, res) => {
  const { id } = req.params;
  const { name, date_time, zoom_link, status, subject } = req.body;
  const userId = req.user.id;
  const role = req.user.role;

  try {
    const scheduledClass = await ClassSchedule.findByPk(id);
    if (!scheduledClass) {
      return res.status(404).json({ message: 'Class not found' });
    }

    if (
      role !== 'admin' &&
      userId !== scheduledClass.tutor_id &&
      userId !== scheduledClass.student_id
    ) {
      return res.status(403).json({ message: 'Unauthorized to update this class' });
    }

    if (name) {
      scheduledClass.title = name;
      scheduledClass.subject = name;
    }
    if (date_time) scheduledClass.date_time = date_time;
    if (zoom_link) scheduledClass.zoom_link = zoom_link;
    if (status) scheduledClass.status = status;

    await scheduledClass.save();

    return res.status(200).json({
      message: '✅ Class updated successfully',
      class: scheduledClass
    });
  } catch (err) {
    return res.status(500).json({ message: '❌ Failed to update class', error: err.message });
  }
};

// ❌ Cancel a Class
export const cancelClass = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const role = req.user.role;

  try {
    const scheduledClass = await ClassSchedule.findByPk(id);
    if (!scheduledClass) {
      return res.status(404).json({ message: 'Class not found' });
    }

    if (
      role !== 'admin' &&
      userId !== scheduledClass.tutor_id &&
      userId !== scheduledClass.student_id
    ) {
      return res.status(403).json({ message: 'Unauthorized to cancel this class' });
    }

    scheduledClass.status = 'cancelled';
    await scheduledClass.save();

    return res.status(200).json({ message: '❌ Class cancelled successfully' });
  } catch (err) {
    return res.status(500).json({ message: '❌ Failed to cancel class', error: err.message });
  }
};

// 🛠 Admin: View All Classes
export const getAllClasses = async (req, res) => {
  const role = req.user.role;
  if (role !== 'admin') {
    return res.status(403).json({ message: 'Only admins can view all classes' });
  }

  try {
    const allClasses = await ClassSchedule.findAll({
      order: [['date_time', 'DESC']],
      include: [
        { model: User, as: 'Tutor', attributes: ['id', 'email', 'mobile_number', 'name'] },
        { model: User, as: 'Student', attributes: ['id', 'email', 'mobile_number', 'name'] }
      ]
    });

    return res.status(200).json({ classes: allClasses });
  } catch (err) {
    return res.status(500).json({ message: '❌ Failed to fetch all classes', error: err.message });
  }
};
