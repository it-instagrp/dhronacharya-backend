// src/controllers/blog.controller.js
import db from '../models/index.js';
import slugify from 'slugify'; // npm i slugify
import { Op } from 'sequelize';

const { Blog, User } = db;

// Admin: Create blog
export const createBlog = async (req, res) => {
  try {
    const {
      title, subtitle, short_description, content,
      cover_image, meta_title, meta_description, meta_keywords,
      is_published
    } = req.body;

    const author_id = req.user?.id; // admin id

    let baseSlug = slugify(title || '', { lower: true, strict: true });
    let slug = baseSlug || `blog-${Date.now()}`;

    // ensure unique slug
    let count = 0;
    while (await Blog.findOne({ where: { slug } })) {
      count += 1;
      slug = `${baseSlug}-${count}`;
    }

    const blog = await Blog.create({
      title, subtitle, short_description, content,
      cover_image, meta_title, meta_description,
      meta_keywords: meta_keywords || null,
      slug, author_id,
      is_published: !!is_published,
      published_at: is_published ? new Date() : null
    });

    return res.status(201).json({ message: 'Blog created', blog });
  } catch (err) {
    console.error('Create blog error:', err);
    return res.status(500).json({ message: 'Failed to create blog', error: err.message });
  }
};

// Admin: Update blog
export const updateBlog = async (req, res) => {
  try {
    const { id } = req.params;
    const payload = req.body;

    const blog = await Blog.findByPk(id);
    if (!blog) return res.status(404).json({ message: 'Blog not found' });

    // If title changed -> optionally update slug (careful with SEO)
   if (payload.title && payload.title !== blog.title) {
  let base = slugify(payload.title, { lower: true, strict: true });
  let slug = base || `blog-${Date.now()}`;
  let count = 0;
  // ✅ ensure uniqueness
  while (await Blog.findOne({ where: { slug, id: { [Op.ne]: id } } })) {
    count += 1;
    slug = `${base}-${count}`;
  }
  payload.slug = slug;
}


    if (payload.is_published && !blog.is_published) {
      payload.published_at = new Date();
    }
    if (!payload.is_published) {
      payload.published_at = null;
    }

    await blog.update(payload);
    return res.json({ message: 'Blog updated', blog });
  } catch (err) {
    console.error('Update blog error:', err);
    return res.status(500).json({ message: 'Failed to update blog', error: err.message });
  }
};

// Admin: Delete blog (soft because paranoid: true)
export const deleteBlog = async (req, res) => {
  try {
    const { id } = req.params;
    const blog = await Blog.findByPk(id);
    if (!blog) return res.status(404).json({ message: 'Blog not found' });

    await blog.destroy();
    return res.json({ message: 'Blog deleted' });
  } catch (err) {
    console.error('Delete blog error:', err);
    return res.status(500).json({ message: 'Failed to delete blog', error: err.message });
  }
};

// Public: list blogs (pagination + optional search)
export const getPublicBlogs = async (req, res) => {
  try {
    const page = parseInt(req.query.page || '1', 10);
    const limit = parseInt(req.query.limit || '10', 10);
    const offset = (page - 1) * limit;
    const q = req.query.q || null;

    const where = { is_published: true };
    if (q) {
      where[Op.or] = [
        { title: { [Op.iLike]: `%${q}%` } },
        { short_description: { [Op.iLike]: `%${q}%` } },
        { content: { [Op.iLike]: `%${q}%` } }
      ];
    }

    const { rows: blogs, count } = await Blog.findAndCountAll({
      where,
      include: [{ model: User, as: 'Author', attributes: ['id', 'name'] }],
      order: [['published_at', 'DESC']],
      offset,
      limit
    });

    return res.json({
      data: blogs,
      meta: {
        total: count,
        page,
        limit,
        pages: Math.ceil(count / limit)
      }
    });
  } catch (err) {
    console.error('Get public blogs error:', err);
    return res.status(500).json({ message: 'Failed to fetch blogs', error: err.message });
  }
};

// Public: single blog by slug
export const getBlogBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const blog = await Blog.findOne({
      where: { slug, is_published: true },
      include: [{ model: User, as: 'Author', attributes: ['id', 'name'] }]
    });
    if (!blog) return res.status(404).json({ message: 'Blog not found' });
    return res.json(blog);
  } catch (err) {
    console.error('Get blog by slug error:', err);
    return res.status(500).json({ message: 'Failed to fetch blog', error: err.message });
  }
};
