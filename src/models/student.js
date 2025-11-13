import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Student = sequelize.define('Student', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4, // independent student ID
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: true, // ✅ allow null for pre-registration
    references: { model: 'users', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  },
  temp_user_id: { // 👈 used during OTP flow
    type: DataTypes.UUID,
    allowNull: true,
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  class: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  subjects: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    allowNull: true,
  },
  board: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  availability: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    allowNull: true,
  },
  start_timeline: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  class_modes: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    allowNull: true,
  },
  tutor_gender_preference: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  hourly_charges: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
  },
  location_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'locations', key: 'id' },
  },
  profile_photo: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  languages: {
    type: DataTypes.ARRAY(DataTypes.JSON),
    allowNull: true,
  },
  school_name: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  sms_alerts: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'students',
  timestamps: true,
  underscored: true,
});

export default Student;
