// src/routes/bookmark.routes.js
import express from 'express';
import { toggleBookmark, getBookmarks } from '../controllers/bookmark.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = express.Router();
router.use(authenticate);

router.post('/toggle', toggleBookmark);      // Toggle (add/remove) bookmark
router.get('/', getBookmarks);               // Get current user's bookmarks

export default router;
