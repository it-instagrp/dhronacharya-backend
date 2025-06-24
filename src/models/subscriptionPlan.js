import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const SubscriptionPlan = sequelize.define('SubscriptionPlan', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  plan_name: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  duration_days: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  contact_limit: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  plan_type: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  features: {
    type: DataTypes.JSONB,
    allowNull: true,
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
  tableName: 'subscription_plans',
  timestamps: true,
  underscored: true,
});

export default SubscriptionPlan;
