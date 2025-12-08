
import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const UserCoupon = sequelize.define('UserCoupon', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },

  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },

  coupon_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },

  discount_amount: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },

  coupon_type: {
    type: DataTypes.ENUM('promotional', 'referral', 'global', 'retention'),
    allowNull: true
  },

  used_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },

}, {
  tableName: 'user_coupons',
  timestamps: true,
  underscored: true,
});

export default UserCoupon;
