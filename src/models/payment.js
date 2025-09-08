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
  // 💰 Amount is total (base + GST)
  amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  currency: { type: DataTypes.STRING, defaultValue: 'INR' },
  status: { type: DataTypes.STRING, defaultValue: 'created' },
  payment_gateway_response: { type: DataTypes.JSONB },

  // 🆕 GST fields
  tax_percentage: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 18.00, // default GST rate
  },
  tax_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true, // will be set when order is created
  },
  base_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true, // plan price before tax
  }
}, {
  tableName: 'payments',
  timestamps: true,
  underscored: true,
});

export default Payment;
