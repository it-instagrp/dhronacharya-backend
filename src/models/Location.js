// models/location.js
import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Location = sequelize.define('Location', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  country: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  state: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  city: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  pincode: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  latitude: {
    type: DataTypes.DECIMAL,
    allowNull: true,
  },
  longitude: {
    type: DataTypes.DECIMAL,
    allowNull: true,
  }
}, {
  tableName: 'locations',
  timestamps: true,
  underscored: true,
});

export default Location;
