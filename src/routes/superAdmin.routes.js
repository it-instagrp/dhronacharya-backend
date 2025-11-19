import express from "express";
import { authenticate } from "../middlewares/auth.middleware.js";
import { isSuperAdmin } from "../middlewares/isSuperAdmin.js";

import {
  superAdminSignup,
  superAdminLogin,
  createAdmin,
  getAllAdmins,
  deleteAdmin
} from "../controllers/superAdmin.controller.js";

const router = express.Router();

/* -----------------------------------------
   PUBLIC ROUTES (No Token Required)
------------------------------------------ */

// Super Admin Signup (Only First Time)
router.post("/signup", superAdminSignup);

// Super Admin Login
router.post("/login", superAdminLogin);

/* -----------------------------------------
   SUPER ADMIN PROTECTED ROUTES
------------------------------------------ */

// Create Admin
router.post("/admin", authenticate, isSuperAdmin, createAdmin);

// List All Admins
router.get("/admins", authenticate, isSuperAdmin, getAllAdmins);

// Delete Admin
router.delete("/admin/:admin_id", authenticate, isSuperAdmin, deleteAdmin);

export default router;
