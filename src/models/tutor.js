import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Tutor = sequelize.define('Tutor', {
  user_id: {
    type: DataTypes.UUID,
    primaryKey: true,
    references: { model: 'users', key: 'id' },
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: true,  // Optional
  },
  subjects: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    allowNull: false, // Required
  },
  classes: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    allowNull: false, // Required
  },
  degrees: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    allowNull: true,  // Optional
  },
  introduction_video: {
    type: DataTypes.STRING(255),
    allowNull: true,  // Optional
  },
 profile_status: {
  type: DataTypes.ENUM('pending', 'approved', 'rejected'),
  defaultValue: 'pending',
}
,
documents: {
  type: DataTypes.JSON,
  allowNull: true,
  defaultValue: {}
}
,

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
}
,
languages: {
  type: DataTypes.ARRAY(DataTypes.JSON), // [{ language, proficiency }]
  allowNull: true
}
,
experience: {
  type: DataTypes.INTEGER,
  allowNull: true
},
teaching_modes: {
  type: DataTypes.ARRAY(DataTypes.STRING), // ['Online', 'Offline']
  allowNull: true
},
pricing_per_hour: {
  type: DataTypes.DECIMAL(10, 2),
  allowNull: true
},
// Add to both Student and Tutor models
profile_photo: {
  type: DataTypes.STRING,
  allowNull: true,
},


}, {
  tableName: 'tutors',
  timestamps: true,
  underscored: true,
});

export default Tutor;
