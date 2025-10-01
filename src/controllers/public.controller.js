import HttpStatus from "http-status-codes";
import db from "../models/index.js";

const { Student, User, Location } = db;

/**
 * Get all verified student enquiries (public view)
 * - Only returns users who have not verified (is_active = false)
 */
export const getPublicStudentEnquiries = async (req, res) => {
  try {
    const enquiries = await Student.findAll({
      include: [
        {
          model: User,
          attributes: ["id", "name", "is_active"], // hide email/mobile
          required: false, // include students even if no user
        },
        {
          model: Location,
          attributes: ["country", "state", "city", "pincode"],
        },
      ],
      order: [["created_at", "DESC"]],
    });

    const formatted = enquiries.map((student) => ({
      id: student.id,
      name: student.name,
      class: student.class,
      subjects: student.subjects,
      board: student.board,
      availability: student.availability,
      start_timeline: student.start_timeline,
      class_modes: student.class_modes,
      tutor_gender_preference: student.tutor_gender_preference,
      hourly_charges: student.hourly_charges,
      languages: student.languages,
      school_name: student.school_name,
      sms_alerts: student.sms_alerts,
      created_at: student.created_at,
      user: student.User
        ? {
            id: student.User.id,
            name: student.User.name,
            status: student.User.is_active ? "verified" : "pending",
          }
        : { status: "not registered" },
      location: student.Location
        ? {
            country: student.Location.country,
            state: student.Location.state,
            city: student.Location.city,
            pincode: student.Location.pincode,
          }
        : null,
    }));

    return res.status(HttpStatus.OK).json(formatted);
  } catch (err) {
    console.error("Public Enquiries Error:", err);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      message: "Failed to fetch public student enquiries",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};