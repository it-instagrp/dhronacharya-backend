import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Message = sequelize.define('Message', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  enquiry_id: {
    type: DataTypes.UUID,
    allowNull: true,  // ✅ Now optional for direct chat
  },
  conversation_id: {
    type: DataTypes.UUID,
    allowNull: true,  // ✅ For direct student-tutor chat
  },
  sender_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
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
  }
}, {
  tableName: 'messages',
  timestamps: false, // ✅ Keep false because we define columns manually
  underscored: true,
});

export default Message;
