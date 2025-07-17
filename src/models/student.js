import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Student = sequelize.define('Student', {
  user_id: {
    type: DataTypes.UUID,
    primaryKey: true,
    references: { model: 'users', key: 'id' },
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: true,  // Optional
  },
  class: {
    type: DataTypes.STRING(50),
    allowNull: false, // Required
  },
  subjects: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    allowNull: false, // Required
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
location_id: {
  type: DataTypes.UUID,
  allowNull: true,
  references: {
    model: 'locations',
    key: 'id'
  }
},
class_modes: {
  type: DataTypes.ARRAY(DataTypes.STRING), // ['Online', 'Offline']
  allowNull: true
},

profile_photo: {
  type: DataTypes.STRING,
  allowNull: true,
},

languages: {
  type: DataTypes.ARRAY(DataTypes.JSON), // [{ language, proficiency }]
  allowNull: true
}
,
school_name: {
  type: DataTypes.STRING,
  allowNull: true
},

sms_alerts: {
  type: DataTypes.BOOLEAN,
  defaultValue: false
},

}, {
  tableName: 'students',
  timestamps: true,
  underscored: true,
});

export default Student;
