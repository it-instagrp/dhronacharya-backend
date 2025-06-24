import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Enquiry = sequelize.define('Enquiry', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  sender_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  receiver_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  subject: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  class: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('pending', 'accepted', 'rejected'),
    defaultValue: 'pending',
  },
  response_message: {
    type: DataTypes.TEXT,
    allowNull: true,
  }
}, {
  tableName: 'enquiries',
  timestamps: true,
  underscored: true,
});

export default Enquiry;
