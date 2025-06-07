import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Tutor = sequelize.define('Tutor', {
  user_id: {
    type: DataTypes.UUID,
    primaryKey: true,
    references: { model: 'users', key: 'id' },
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: true,  // Optional
  },
  subjects: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    allowNull: false, // Required
  },
  classes: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    allowNull: false, // Required
  },
  degrees: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    allowNull: true,  // Optional
  },
  introduction_video: {
    type: DataTypes.STRING(255),
    allowNull: true,  // Optional
  },
  profile_status: {
    type: DataTypes.STRING(50),
    defaultValue: 'pending',
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
  tableName: 'tutors',
  timestamps: true,
  underscored: true,
});

export default Tutor;
