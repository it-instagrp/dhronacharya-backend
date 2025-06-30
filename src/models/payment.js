import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Payment = sequelize.define('Payment', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  user_id: { type: DataTypes.UUID, allowNull: false },
  plan_id: { type: DataTypes.UUID, allowNull: false },
  razorpay_order_id: { type: DataTypes.STRING },
  razorpay_payment_id: { type: DataTypes.STRING },
  amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  currency: { type: DataTypes.STRING, defaultValue: 'INR' },
  status: { type: DataTypes.STRING, defaultValue: 'created' },
  payment_gateway_response: { type: DataTypes.JSONB },
}, {
  tableName: 'payments',
  timestamps: true,
  underscored: true,
});

export default Payment;
