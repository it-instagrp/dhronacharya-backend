import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const ClassSchedule = sequelize.define('ClassSchedule', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  title: { type: DataTypes.STRING, allowNull: false },
  tutor_id: { type: DataTypes.UUID, allowNull: false },
  student_id: { type: DataTypes.UUID, allowNull: false },
  zoom_link: { type: DataTypes.STRING },
  date_time: { type: DataTypes.DATE, allowNull: false },
  type: { type: DataTypes.ENUM('regular', 'demo'), defaultValue: 'regular' },
  status: { type: DataTypes.ENUM('scheduled', 'completed', 'cancelled'), defaultValue: 'scheduled' }
}, {
  tableName: 'class_schedules',
  timestamps: true,
  underscored: true,
});

export default ClassSchedule;
