// src/routes/blog.route.js
import express from 'express';
import {
  createBlog,
  updateBlog,
  deleteBlog,
  getPublicBlogs,
  getBlogBySlug
} from '../controllers/blog.controller.js';

import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { uploadBlogImage } from '../middlewares/uploadBlog.middleware.js'; // NEW

const router = express.Router();

/**
 * Public routes
 */
// GET /api/blogs
router.get('/', getPublicBlogs);

// GET /api/blogs/:slug
router.get('/:slug', getBlogBySlug);

/**
 * Admin routes (create/update/delete)
 * apply authenticate + authorize('admin')
 * + upload image
 */
router.post(
  '/',
  authenticate,
  authorize('admin','super_admin'),
  uploadBlogImage.single('cover_image'), // ✅ allow image upload from laptop
  createBlog
);

router.put(
  '/:id',
  authenticate,
  authorize('admin','super_admin'),
  uploadBlogImage.single('cover_image'), // allow new image upload while updating
  updateBlog
);

router.delete('/:id', authenticate, authorize('admin','super_admin'), deleteBlog);

export default router;
