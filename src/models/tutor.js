import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Tutor = sequelize.define('Tutor', {
  user_id: {
    type: DataTypes.UUID,
    primaryKey: true,
    references: { model: 'users', key: 'id' },
  },

  // ✅ Basic Info
  name: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  gender: {
    type: DataTypes.ENUM('Male', 'Female', 'Other'),
    allowNull: true,
  },
  tutor_gender_preference: {
    type: DataTypes.ENUM('Male', 'Female', 'Any'),
    allowNull: true,
  },

  // ✅ Academic Info
  subjects: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    allowNull: false,
  },
  classes: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    allowNull: false,
  },
  degrees: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    allowNull: true,
  },
  board: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    allowNull: true,
  },
  availability: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    allowNull: true,
  },
  degree_status: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  school_name: {
    type: DataTypes.STRING,
    allowNull: true,
  },

  // ✅ Media
  profile_photo: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  introduction_video: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  introduction_text: {
    type: DataTypes.TEXT,
    allowNull: true,
  },

  // ✅ Location
  location_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'locations', key: 'id' }
  },

  // ✅ Languages
  languages: {
    type: DataTypes.ARRAY(DataTypes.STRING), // e.g. ["English","Hindi"]
    allowNull: true,
  },

  // ✅ Teaching
  teaching_modes: {
    type: DataTypes.ARRAY(DataTypes.STRING), // ['Online', 'Offline']
    allowNull: true,
  },
  experience: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  pricing_per_hour: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
  },

  // ✅ Profile status
  profile_status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected'),
    defaultValue: 'pending',
  },
  documents: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {},
  },
  sms_alerts: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },

  // ✅ Timestamps
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },

}, {
  tableName: 'tutors',
  timestamps: true,
  underscored: true,
});

export default Tutor;
