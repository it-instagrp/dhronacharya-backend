import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const ClassSchedule = sequelize.define('ClassSchedule', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  tutor_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  student_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  zoom_link: {
    type: DataTypes.STRING,
    allowNull: true
  },
  scheduled_at: {
    type: DataTypes.DATE,
    allowNull: false
  },
  type: {
    type: DataTypes.ENUM('class', 'demo'),
    defaultValue: 'class'
  },
  status: {
    type: DataTypes.ENUM('scheduled', 'cancelled', 'completed'),
    defaultValue: 'scheduled'
  }
}, {
  tableName: 'class_schedules',
  timestamps: true,
  underscored: true
});

export default ClassSchedule;
