import express from "express";
import { getPublicStudentEnquiries } from "../controllers/public.controller.js";
import { optionalAuth } from "../middlewares/optionalAuth.js"; // Correct path

const router = express.Router();

// Works for both guests & tutors (with token)
router.get("/students", optionalAuth, getPublicStudentEnquiries);

export default router;
