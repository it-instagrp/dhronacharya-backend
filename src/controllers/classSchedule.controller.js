import db from '../models/index.js';
import { Op } from 'sequelize';

const { ClassSchedule, User } = db;

// CREATE Schedule (by tutor or student)
export const createSchedule = async (req, res) => {
  const { title, zoom_link, scheduled_at, student_id, type } = req.body;
  const tutor_id = req.user.role === 'tutor' ? req.user.id : null;
  const student = req.user.role === 'student' ? req.user.id : student_id;
  const scheduledTime = new Date(scheduled_at);

  try {
    const schedule = await ClassSchedule.create({
      title,
      zoom_link,
      scheduled_at: scheduledTime,
      tutor_id: tutor_id || student_id,
      student_id: student,
      type
    });

    // Conflict check
    const conflicts = await ClassSchedule.findAll({
      where: {
        scheduled_at: {
          [Op.between]: [
            new Date(scheduledTime.getTime() - 30 * 60000),
            new Date(scheduledTime.getTime() + 30 * 60000)
          ]
        },
        [Op.or]: [
          { tutor_id: tutor_id || student_id },
          { student_id: student }
        ],
        id: { [Op.ne]: schedule.id }
      }
    });

    const response = {
      message: 'Class scheduled',
      schedule
    };

    if (conflicts.length > 0) {
      response.message = 'Class scheduled but conflicts detected';
      response.conflicts = conflicts;
    }

    res.status(201).json(response);
  } catch (err) {
    res.status(500).json({ message: 'Error scheduling class', error: err.message });
  }
};

// GET all schedules for logged-in user
export const getSchedules = async (req, res) => {
  const userId = req.user.id;
  const role = req.user.role;

  try {
    const schedules = await ClassSchedule.findAll({
      where: role === 'tutor' ? { tutor_id: userId } : { student_id: userId },
      include: [
        { model: User, as: role === 'tutor' ? 'Student' : 'Tutor', attributes: ['id', 'email', 'role'] }
      ],
      order: [['scheduled_at', 'ASC']]
    });

    res.json({ schedules });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching schedule', error: err.message });
  }
};

// UPDATE schedule (resolve conflict)
export const updateSchedule = async (req, res) => {
  const { id } = req.params;
  const { title, zoom_link, scheduled_at } = req.body;

  try {
    const schedule = await ClassSchedule.findByPk(id);
    if (!schedule) return res.status(404).json({ message: 'Schedule not found' });

    schedule.title = title || schedule.title;
    schedule.zoom_link = zoom_link || schedule.zoom_link;
    schedule.scheduled_at = scheduled_at || schedule.scheduled_at;
    await schedule.save();

    res.json({ message: 'Schedule updated successfully', schedule });
  } catch (err) {
    res.status(500).json({ message: 'Update failed', error: err.message });
  }
};
