// src/models/review.js
import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Review = sequelize.define(
  'Review',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    reviewer_id: {
      type: DataTypes.UUID,
      allowNull: false, // student who wrote the review
    },
    tutor_id: {
      type: DataTypes.UUID,
      allowNull: false, // tutor being reviewed
    },
    rating: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: { min: 1, max: 5 },
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    comment: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('published', 'pending', 'deleted'),
      defaultValue: 'published',
    },
  },
  {
    tableName: 'reviews',
    timestamps: true,
    underscored: true,
  }
);

export default Review;
