// // src/routes/group.routes.js
// import express from "express";
// import {
//   createGroup,
//   addMembersToGroup,
//   getGroupMembers,
//   getMyGroups,
//   removeGroupMember,
//   getAllGroupsForAdmin,
//   scheduleGroupClass,
//   getGroupClasses,
//   getMyScheduledClasses,
//   deleteGroupClass,
//   updateGroupClass,
//   updateGroup,   //  added
//   deleteGroup,
//   cancelGroupClass,
//   completeGroupClass
// } from "../controllers/group.controller.js";

// import { authenticate } from "../middlewares/auth.middleware.js";

// const router = express.Router();

// //  All routes below require login
// router.use(authenticate);

// //  Create a new group (tutor or student)
// router.post("/", createGroup);

// //  Add members to an existing group
// router.post("/add-members", addMembersToGroup);

// //  Schedule a class for a group
// router.post("/schedule-class", scheduleGroupClass);

// //  Get all classes for a specific group
// router.get("/:groupId/classes", getGroupClasses);

// //  Get all scheduled classes for logged-in user (as tutor)
// router.get("/my-classes/scheduled", getMyScheduledClasses);

// // Delete a scheduled class
// router.delete("/classes/:classId", deleteGroupClass);

// // Update (reschedule) a class
// router.put("/classes/:classId", updateGroupClass);

// // Get all groups for current user
// router.get("/my-groups", getMyGroups);

// //  Get all members in a group
// router.get("/:groupId/members", getGroupMembers);

// //  Remove a member from a group
// router.delete("/:groupId/remove-member/:userId", removeGroupMember);

// // Admin: Get all groups + members + classes
// router.get("/admin/all", getAllGroupsForAdmin);

// // Update a group
// router.put("/:groupId", updateGroup);

// //  Delete a group
// router.delete("/:groupId", deleteGroup);

// // Cancel group class
// router.put("/classes/:classId/cancel", cancelGroupClass);

// // Mark as completed
// router.put("/classes/:classId/complete", completeGroupClass);

// export default router;

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
  updateGroup,
  deleteGroup,
  cancelGroupClass,
  completeGroupClass,
  getMyAcceptedConnections,
  getAvailableUsersForGroup,
  getAcceptedStudentsForTutorAPI,
  getAcceptedTutorsForStudentAPI,
  leaveGroup
} from "../controllers/group.controller.js";

import { authenticate } from "../middlewares/auth.middleware.js";

const router = express.Router();

// All routes below require login
router.use(authenticate);

// Create a new group (tutor or student)
router.post("/", createGroup);

// Add members to an existing group
router.post("/add-members", addMembersToGroup);

// Schedule a class for a group
router.post("/schedule-class", scheduleGroupClass);

// Get all classes for a specific group
router.get("/:groupId/classes", getGroupClasses);

// Get all scheduled classes for logged-in user (as tutor)
router.get("/my-classes/scheduled", getMyScheduledClasses);

// Delete a scheduled class
router.delete("/classes/:classId", deleteGroupClass);

// Update (reschedule) a class
router.put("/classes/:classId", updateGroupClass);

// Get all groups for current user WITH accepted connections
router.get("/my-groups", getMyGroups);

// Get accepted connections for current user
router.get("/my-connections", getMyAcceptedConnections);

// Get available users to add to group
router.get("/:groupId/available-users", getAvailableUsersForGroup);

// Get accepted students for tutor
router.get("/accepted-students", getAcceptedStudentsForTutorAPI);

// Get accepted tutors for student
router.get("/accepted-tutors", getAcceptedTutorsForStudentAPI);

// Leave group (self-remove)
router.delete("/:groupId/leave", leaveGroup);

// Get all members in a group
router.get("/:groupId/members", getGroupMembers);

// Remove a member from a group (group creator/admin only)
router.delete("/:groupId/remove-member/:userId", removeGroupMember);

// Admin: Get all groups + members + classes
router.get("/admin/all", getAllGroupsForAdmin);

// Update a group
router.put("/:groupId", updateGroup);

// Delete a group
router.delete("/:groupId", deleteGroup);

// Cancel group class
router.put("/classes/:classId/cancel", cancelGroupClass);

// Mark as completed
router.put("/classes/:classId/complete", completeGroupClass);

export default router;