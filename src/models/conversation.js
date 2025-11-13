// src/models/conversation.js
import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Conversation = sequelize.define('Conversation', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  student_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  tutor_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  // optional: last_message_at for quick sort
  last_message_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'conversations',
  timestamps: true,
  underscored: true,
  indexes: [
    { unique: true, fields: ['student_id', 'tutor_id'] }, // 1 pair -> 1 conversation
  ],
});

export default Conversation;
