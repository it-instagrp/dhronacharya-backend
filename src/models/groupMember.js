import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const GroupMember = sequelize.define('GroupMember', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  group_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  role: {
    type: DataTypes.ENUM('tutor', 'student'),
    allowNull: false
  }
}, {
  tableName: 'group_members',
  timestamps: true,
  underscored: true
});

export default GroupMember;
