// src/models/reviewComment.js
import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const ReviewComment = sequelize.define(
  'ReviewComment',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    review_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    commenter_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    comment: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('visible', 'hidden'),
      defaultValue: 'visible',
    },
  },
  {
    tableName: 'review_comments',
    timestamps: true,
    underscored: true,
  }
);

export default ReviewComment;
