'use strict';
import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: true,
    unique: true,
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
    defaultValue: 'user',
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
  tableName: 'users', /**** table name ****/
  timestamps: true,    /**** Sequelize will automatically manage createdAt and updatedAt ****/
  underscored: true,   /**** Use snake_case for column names in the database ****/
});

export default User;