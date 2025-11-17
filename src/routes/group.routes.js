// src/routes/group.routes.js
import express from "express";
import {
  createGroup,
  addMembersToGroup,
  getGroupMembers,
  getMyGroups,
  removeGroupMember,
  getAllGroupsForAdmin,
  scheduleGroupClass,
  getGroupClasses,
  getMyScheduledClasses,
  deleteGroupClass,
  updateGroupClass,
  updateGroup,   //  added
  deleteGroup,
  cancelGroupClass,
  completeGroupClass
} from "../controllers/group.controller.js";

import { authenticate } from "../middlewares/auth.middleware.js";

const router = express.Router();

//  All routes below require login
router.use(authenticate);

//  Create a new group (tutor or student)
router.post("/", createGroup);

//  Add members to an existing group
router.post("/add-members", addMembersToGroup);

//  Schedule a class for a group
router.post("/schedule-class", scheduleGroupClass);

//  Get all classes for a specific group
router.get("/:groupId/classes", getGroupClasses);

//  Get all scheduled classes for logged-in user (as tutor)
router.get("/my-classes/scheduled", getMyScheduledClasses);

// Delete a scheduled class
router.delete("/classes/:classId", deleteGroupClass);

// Update (reschedule) a class
router.put("/classes/:classId", updateGroupClass);

// Get all groups for current user
router.get("/my-groups", getMyGroups);

//  Get all members in a group
router.get("/:groupId/members", getGroupMembers);

//  Remove a member from a group
router.delete("/:groupId/remove-member/:userId", removeGroupMember);

// Admin: Get all groups + members + classes
router.get("/admin/all", getAllGroupsForAdmin);

// Update a group
router.put("/:groupId", updateGroup);

//  Delete a group
router.delete("/:groupId", deleteGroup);

// Cancel group class
router.put("/classes/:classId/cancel", cancelGroupClass);

// Mark as completed
router.put("/classes/:classId/complete", completeGroupClass);

export default router;
