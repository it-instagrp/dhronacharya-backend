// models/ContactLog.js
import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const ContactLog = sequelize.define('ContactLog', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  viewer_id: { type: DataTypes.UUID, allowNull: false },   // the one viewing
  target_id: { type: DataTypes.UUID, allowNull: false },   // the one being viewed
  timestamp: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'contact_logs',
  timestamps: true,
  underscored: true,
});

export default ContactLog;
