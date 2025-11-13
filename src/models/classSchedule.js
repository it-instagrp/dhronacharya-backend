import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const ClassSchedule = sequelize.define('ClassSchedule', {
  id: { 
    type: DataTypes.UUID, 
    defaultValue: DataTypes.UUIDV4, 
    primaryKey: true 
  },
  title: { 
    type: DataTypes.STRING, 
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  tutor_id: { 
    type: DataTypes.UUID, 
    allowNull: false 
  },
  tutor_name: { 
    type: DataTypes.STRING, 
    allowNull: true 
  },
  student_id: { 
    type: DataTypes.UUID, 
    allowNull: true 
  },
  student_name: { 
    type: DataTypes.STRING, 
    allowNull: true 
  },
  meeting_link: { 
    type: DataTypes.TEXT, // Changed to TEXT for unlimited length
    allowNull: true,
    validate: {
      isUrl: {
        msg: 'Meeting link must be a valid URL',
        protocols: ['http', 'https'],
        require_protocol: true
      }
    }
  },
  group_id: {
  type: DataTypes.UUID,
  allowNull: true, // Optional: means class can be either individual or group
  references: {
    model: 'groups', // table name must match the tableName in your Group model
    key: 'id'
  }
},

  date_time: { 
    type: DataTypes.DATE, 
    allowNull: false,
    validate: {
      isDate: true,
      isAfter: {
        args: new Date().toISOString(),
        msg: 'Class must be scheduled in the future'
      }
    }
  },
  type: { 
    type: DataTypes.ENUM('regular', 'demo'), 
    defaultValue: 'regular' 
  },
  status: { 
    type: DataTypes.ENUM('scheduled', 'completed', 'cancelled'), 
    defaultValue: 'scheduled' 
  },
  subject: { 
    type: DataTypes.STRING,
    allowNull: true
  },
  mode: {
    type: DataTypes.ENUM('online', 'offline'),
    allowNull: false,
    defaultValue: 'online'
  },
  cancellation_reason: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'class_schedules',
  timestamps: true,
  underscored: true,
  paranoid: true, // Adds deletedAt for soft deletes
  indexes: [
    {
      fields: ['tutor_id']
    },
    {
      fields: ['student_id']
    },
    {
      fields: ['date_time']
    },
    {
      fields: ['status']
    }
  ]
});

export default ClassSchedule;