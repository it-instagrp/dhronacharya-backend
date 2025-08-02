import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const ReferralCode = sequelize.define('ReferralCode', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  code: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  referrer_user_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  referred_user_id: {
    type: DataTypes.UUID,
    allowNull: true
  },
  referred_name: {
    type: DataTypes.STRING,
    allowNull: true
  },
  referred_email: {
    type: DataTypes.STRING,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('pending', 'converted'),
    defaultValue: 'pending'
  },
  reward_given: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  reward_type: {
    type: DataTypes.STRING, // e.g., 'cash', 'subscription_bonus'
    allowNull: true
  },
  referred_at: {
  type: DataTypes.DATE,
  allowNull: true,
},

  reward_value: {
    type: DataTypes.STRING, // e.g., '₹100', '7 Days'
    allowNull: true
  }
}, {
  tableName: 'referral_codes',
  timestamps: true,
  underscored: true
});

export default ReferralCode;
