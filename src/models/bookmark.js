// src/models/bookmark.js
import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Bookmark = sequelize.define('Bookmark', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  user_id: { // the one who bookmarks (student or tutor)
    type: DataTypes.UUID,
    allowNull: false,
  },
  bookmarked_user_id: { // the one who is bookmarked
    type: DataTypes.UUID,
    allowNull: false,
  }
}, {
  tableName: 'bookmarks',
  timestamps: true,
  underscored: true,
});

export default Bookmark;
