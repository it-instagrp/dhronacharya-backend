import express from 'express';
import {
  createGroup,
  addMembersToGroup,
  getGroupMembers,
  getMyGroups,
  removeGroupMember,
  getAllGroupsForAdmin
} from '../controllers/group.controller.js';

import { authenticate } from '../middlewares/auth.middleware.js';
const router = express.Router();

// 🔐 All routes below require login
router.use(authenticate);

// Create a new group (tutor or student)
router.post('/', createGroup);

// Add members to an existing group
router.post('/add-members', addMembersToGroup);

// Get all groups for current user
router.get('/my-groups', getMyGroups);

// Get all members in a group
router.get('/:groupId/members', getGroupMembers);

// Remove a member from a group
router.delete('/:groupId/remove-member/:userId', removeGroupMember);

// Admin: Get all groups + members + classes
router.get('/admin/all', getAllGroupsForAdmin);

export default router;
