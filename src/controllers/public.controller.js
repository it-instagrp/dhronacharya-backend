import HttpStatus from "http-status-codes";
import db from "../models/index.js";

const { Student, User, Location, UserSubscription } = db;

/**
 * Get all verified student enquiries (public view)
 * - Returns verified students
 * - If tutor logged in → checks active subscription
 * - Adds flags & readable message for frontend display
 */
export const getPublicStudentEnquiries = async (req, res) => {
  try {
    const tutorId = req.user?.id || null;
    let hasActiveSubscription = false;
    let subscriptionRequired = false;
    let activePlan = null;
    let userMessage = "Login as a tutor to view contact details.";

    // ✅ Step 1: Check if logged-in user is tutor
    if (tutorId && req.user?.role === "tutor") {
      const activeSubscription = await UserSubscription.findOne({
        where: { user_id: tutorId, is_active: true },
        order: [["created_at", "DESC"]],
      });

      // ✅ Step 2: Validate subscription status
      if (
        activeSubscription &&
        new Date(activeSubscription.end_date) > new Date()
      ) {
        if (activeSubscription.contacts_remaining > 0) {
          hasActiveSubscription = true;
          subscriptionRequired = false;
          activePlan = {
            plan_id: activeSubscription.plan_id,
            end_date: activeSubscription.end_date,
            contacts_remaining: activeSubscription.contacts_remaining,
          };
          userMessage =
            "You have an active subscription. You can view student contact details.";
        } else {
          subscriptionRequired = true;
          userMessage =
            "You’ve used all your contact views. Please upgrade your plan to continue.";
        }
      } else {
        subscriptionRequired = true;
        userMessage =
          "Your subscription has expired or is inactive. Please renew to view contact details.";
      }
    }

    // ✅ Step 3: Fetch verified students
    const enquiries = await Student.findAll({
      include: [
        {
          model: User,
          attributes: [
            "id",
            "name",
            "email",
            "mobile_number",
            "is_active",
          ],
          required: true,
          where: { is_active: true },
        },
        {
          model: Location,
          attributes: ["country", "state", "city", "pincode"],
        },
      ],
      order: [["created_at", "DESC"]],
    });

    // ✅ Step 4: Format response with conditional contact visibility
    const formatted = enquiries.map((student) => {
      const contactInfo = hasActiveSubscription
        ? {
            email: student.User.email,
            mobile_number: student.User.mobile_number,
          }
        : {
            email: null,
            mobile_number: null,
          };

      return {
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
        user_id: student.User.id,
        user: {
          id: student.User.id,
          name: student.User.name,
          status: "verified",
          ...contactInfo,
        },
        location: student.Location
          ? {
              country: student.Location.country,
              state: student.Location.state,
              city: student.Location.city,
              pincode: student.Location.pincode,
            }
          : null,
        can_view_contact: hasActiveSubscription,
        subscription_required: subscriptionRequired,
      };
    });

    // ✅ Step 5: Send final response with readable message
    return res.status(HttpStatus.OK).json({
      success: true,
      enquiries: formatted,
      subscription_status: hasActiveSubscription
        ? "active"
        : subscriptionRequired
        ? "inactive_or_expired"
        : "none",
      active_plan: activePlan,
      message: userMessage, // 👈 user-friendly message added
    });
  } catch (err) {
    console.error("Public Enquiries Error:", err);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      message: "Failed to fetch public student enquiries",
      error:
        process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};
