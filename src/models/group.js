import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Group = sequelize.define('Group', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  creator_id: {
    type: DataTypes.UUID,
    allowNull: false // ID of the tutor or student who created the group
  },
  type: {
    type: DataTypes.ENUM('tutor', 'student'),
    allowNull: false
  }
}, {
  tableName: 'groups',
  timestamps: true,
  underscored: true
});

export default Group;
