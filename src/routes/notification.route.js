import express from 'express';
import * as notificationController from '../controllers/notification.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';  // include authorize

const router = express.Router();
router.use(authenticate);

// Create notification (admin/manual)
router.post('/create', notificationController.createNotification);

// Logged-in user: get their own notifications
router.get('/', notificationController.getUserNotifications);

// Admin: Get all notifications sent to anyone
router.get('/admin/all', authorize('admin','super_admin'), notificationController.getAllNotifications);

// Mark notification as read/unread
router.patch('/:id/read', notificationController.markNotificationRead);

// Delete a notification
router.delete('/:id', notificationController.deleteNotification);

export default router;
