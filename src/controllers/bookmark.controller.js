// src/controllers/bookmark.controller.js
import db from '../models/index.js';
const { Bookmark, User, Tutor, Student } = db;

export const toggleBookmark = async (req, res) => {
  const userId = req.user.id;
  const { bookmarked_user_id } = req.body;

  try {
    const existing = await Bookmark.findOne({ where: { user_id: userId, bookmarked_user_id } });

    if (existing) {
      await existing.destroy();
      return res.status(200).json({ message: 'Bookmark removed' });
    }

    await Bookmark.create({ user_id: userId, bookmarked_user_id });
    return res.status(201).json({ message: 'Bookmarked successfully' });

  } catch (err) {
    return res.status(500).json({ message: 'Bookmark toggle failed', error: err.message });
  }
};

export const getBookmarks = async (req, res) => {
  const userId = req.user.id;

  try {
    const bookmarks = await Bookmark.findAll({
      where: { user_id: userId },
      include: [{
        model: User,
        as: 'BookmarkedUser',
        include: [
          { model: Tutor },
          { model: Student }
        ]
      }]
    });

    res.status(200).json({ bookmarks });

  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch bookmarks', error: err.message });
  }
};
