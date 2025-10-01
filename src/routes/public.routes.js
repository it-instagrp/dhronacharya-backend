import express from "express";
import { getPublicStudentEnquiries } from "../controllers/public.controller.js";

const router = express.Router();

// Public endpoint (no auth)
router.get("/students", getPublicStudentEnquiries);

export default router;
