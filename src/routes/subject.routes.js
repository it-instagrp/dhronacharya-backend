// src/routes/subject.routes.js
import express from "express";
import { bulkInsertSubjects, getAllClassesWithSubjects } from "../controllers/subject.controller.js";

const router = express.Router();

// POST /api/subjects/bulk
router.post("/bulk", bulkInsertSubjects);

// GET /api/subjects
router.get("/", getAllClassesWithSubjects);

export default router;
