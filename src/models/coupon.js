
import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Coupon = sequelize.define('Coupon', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },

  code: {
    type: DataTypes.STRING(50),
    unique: true,
    allowNull: false
  },

  coupon_type: {
    type: DataTypes.ENUM('promotional', 'referral', 'global', 'retention'),
    defaultValue: 'global',
    allowNull: false
  },

  discount_type: {
    type: DataTypes.ENUM('percentage', 'fixed'),
    allowNull: false
  },

  discount_value: {
    type: DataTypes.FLOAT,
    allowNull: false
  },

  usage_limit: {
    type: DataTypes.INTEGER,
    defaultValue: null,
    allowNull: true
  },

  used_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },

  valid_from: {
    type: DataTypes.DATE,
    allowNull: false
  },

  valid_until: {
    type: DataTypes.DATE,
    allowNull: false
  },

  applicable_plan: {
    type: DataTypes.STRING,
    defaultValue: 'all'
  },

  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },

  description: {
    type: DataTypes.STRING,
    allowNull: true
  }

}, {
  tableName: 'coupons',
  timestamps: true,
  underscored: true
});

export default Coupon;
