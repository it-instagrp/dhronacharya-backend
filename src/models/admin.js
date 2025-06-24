import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';


const Admin = sequelize.define('Admin', {
  user_id: {
    type: DataTypes.UUID,
    primaryKey: true,
    references: { model: 'users', key: 'id' },
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
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
  tableName: 'admins',
  timestamps: true,
  underscored: true,
});


export default Admin;
