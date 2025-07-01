import db from '../models/index.js';
import { sendEmail } from '../utils/email.js';
import { sendWhatsApp } from '../utils/whatsapp.js';
import { Op } from 'sequelize';

const { ClassSchedule, User } = db;

// 📅 Schedule a Class (supports tutor or student)
export const createClass = async (req, res) => {
  const { title, tutor_id, student_id, zoom_link, date_time, type } = req.body;
  const role = req.user.role;
  const userId = req.user.id;

  try {
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

    const targetTime = new Date(date_time);
    const bufferStart = new Date(targetTime.getTime() - 30 * 60 * 1000); // -30 mins
    const bufferEnd = new Date(targetTime.getTime() + 30 * 60 * 1000);   // +30 mins

    // 🔍 Conflict check in ±30 mins window
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
      // 🔄 Suggest next available slot within 1 hour
      let suggestedTime = new Date(targetTime.getTime() + 30 * 60 * 1000); // +30 mins
      const maxTime = new Date(targetTime.getTime() + 60 * 60 * 1000);     // +1 hour
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

        // Try next 30-minute slot
        suggestedTime = new Date(suggestedTime.getTime() + 30 * 60 * 1000);
      }

      return res.status(409).json({
        message: '⛔ Conflict: A class is already scheduled within 30 minutes for this tutor or student.',
        conflict,
        suggestion: found
          ? suggestedTime.toISOString()
          : '❌ No free slot found within next 1 hour'
      });
    }

    // ✅ Create class if no conflict
    const scheduledClass = await ClassSchedule.create({
      title,
      tutor_id: finalTutorId,
      student_id: finalStudentId,
      zoom_link,
      date_time,
      type: type || 'regular',
    });

    const formattedDate = new Date(date_time).toLocaleString();
    const msg = `📚 New ${type || 'regular'} class scheduled: "${title}" on ${formattedDate}`;

    const tutor = await User.findByPk(finalTutorId);
    const student = await User.findByPk(finalStudentId);

    if (student.email) await sendEmail(student.email, 'Class Scheduled', msg);
    if (tutor.email) await sendEmail(tutor.email, 'Class Scheduled', msg);
    if (student.mobile_number) await sendWhatsApp(student.mobile_number, msg);
    if (tutor.mobile_number) await sendWhatsApp(tutor.mobile_number, msg);

    return res.status(201).json({
      message: '✅ Class scheduled successfully',
      scheduledClass
    });

  } catch (error) {
    console.error('Error scheduling class:', error);
    return res.status(500).json({
      message: '❌ Error scheduling class',
      error: error.message
    });
  }
};

// 📆 Get Scheduled Classes (for tutor or student calendar)
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
    });

    return res.status(200).json({ classes });
  } catch (error) {
    return res.status(500).json({
      message: '❌ Failed to get classes',
      error: error.message
    });
  }
};
