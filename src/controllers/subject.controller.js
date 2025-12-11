// src/controllers/subject.controller.js
import db from "../models/index.js";

const { Subject, Class } = db;

// Bulk insert subjects & classes
export const bulkInsertSubjects = async (req, res) => {
  const data = req.body; // expects array like subjectsData
  try {
    for (const item of data) {
      // 1️Create or find class
      let [classRecord] = await Class.findOrCreate({
        where: { name: item.class, category: item.category },
      });

      // 2️Insert subjects under that class
      for (const subjectName of item.subjects) {
        await Subject.findOrCreate({
          where: { name: subjectName, class_id: classRecord.id },
        });
      }
    }

    return res.status(201).json({ message: "✅ Subjects & Classes inserted successfully" });
  } catch (error) {
    console.error("❌ Error inserting subjects:", error);
    return res.status(500).json({ message: "Error inserting subjects", error: error.message });
  }
};

// ✅ Fetch all classes with subjects
// src/controllers/subject.controller.js
export const getAllClassesWithSubjects = async (req, res) => {
  try {
    const classes = await Class.findAll({
      include: [
        {
          model: Subject,
          as: "subjects",   // ✅ must match association alias
          attributes: ["id", "name"],
        },
      ],
      attributes: ["id", "name", "category"],
      order: [["category", "ASC"], ["name", "ASC"]],
    });

    return res.status(200).json({ classes });
  } catch (error) {
    console.error("❌ Error fetching classes with subjects:", error);
    return res.status(500).json({ message: "Error fetching classes", error: error.message });
  }
};

