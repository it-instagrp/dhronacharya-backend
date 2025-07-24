// src/models/coupon.model.js
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
    defaultValue: 1
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
  // ✅ Update in src/models/coupon.model.js
applicable_plan: {
  type: DataTypes.STRING,
  defaultValue: 'all'
}
,
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'coupons',
  timestamps: true,       // Sequelize will auto-manage created_at & updated_at
  underscored: true       // Matches your DB naming conventions (snake_case)
});

export default Coupon;
