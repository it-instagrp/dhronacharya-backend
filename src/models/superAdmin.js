import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const SuperAdmin = sequelize.define(
  'SuperAdmin',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true
    }
  },
  {
    tableName: 'super_admins',
    timestamps: true,
    underscored: true
  }
);

export default SuperAdmin;
