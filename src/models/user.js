'use strict';
import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {  // ✅ NEW FIELD ADDED
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: true,
    unique: true,
    validate: {
      isEmail: true,
    },
  },
  mobile_number: {
    type: DataTypes.STRING(15),
    allowNull: true,
    unique: true,
  },
  password_hash: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  otp_secret: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  otp_expires_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  role: {
    type: DataTypes.STRING(50),
    defaultValue: 'student',
    allowNull: false,
    validate: {
      isIn: [['admin', 'tutor', 'student']]
    }
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
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
  tableName: 'users',
  timestamps: true,
  underscored: true,
});

export default User;