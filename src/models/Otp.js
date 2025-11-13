import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Otp = sequelize.define('Otp', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  otp: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  type: {
    type: DataTypes.ENUM('email', 'mobile'),
    allowNull: false,
    comment: 'Indicates whether OTP is for email or mobile verification',
  },
  value: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Email or mobile number to verify',
  },
  expires_at: {
    type: DataTypes.DATE,
    allowNull: false,
    comment: 'OTP expiry time (e.g. 5 minutes)',
  },
  verified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  updated_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'otp_verifications',
  timestamps: false, // ✅ Manual timestamps
  underscored: true,
});

export default Otp;
