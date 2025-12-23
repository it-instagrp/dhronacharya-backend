import db from '../models/index.js';
import { triggerNotification } from '../utils/triggerNotification.js';
import { enquiryTemplates } from '../templates/enquiry.template.js';
import { Op } from 'sequelize';
const { Enquiry, User, Tutor, Student, UserSubscription ,Location} = db;


// Create a New Enquiry
export const createEnquiry = async (req, res) => {
  const { receiver_id, subject, class: className, mode } = req.body; // removed description
  const sender_id = req.user.id;

  try {
    const receiver = await User.findByPk(receiver_id, {
      include: [{ model: Tutor }, { model: Student }],
    });

    const sender = await User.findByPk(sender_id, {
      include: [{ model: Tutor }, { model: Student }],
    });

    if (!receiver) {
      return res.status(404).json({ message: 'Receiver not found' });
    }

    // Tutor validation
    if (receiver.role === 'tutor') {
      const tutorSub = await UserSubscription.findOne({
        where: { user_id: receiver_id, is_active: true },
      });

      if (!tutorSub) {
        return res.status(403).json({ message: 'Tutor is not subscribed. Cannot send enquiry.' });
      }

      if (receiver.Tutor?.profile_status !== 'approved') {
        return res.status(403).json({ message: 'Tutor profile is not approved yet.' });
      }
    }

    const sender_location = sender?.Student?.location || sender?.Tutor?.location || null;
    const receiver_location = receiver?.Student?.location || receiver?.Tutor?.location || null;

    // Create enquiry without description, add mode and subject
    const enquiry = await Enquiry.create({
      sender_id,
      receiver_id,
      subject: subject?.trim(),
      class: className?.trim(),
      mode: mode || 'Not specified',
      sender_location,
      receiver_location,
    });

    const senderName = sender.Student?.name || sender.Tutor?.name || sender.email || sender.mobile_number;

    // Email
    if (receiver.email) {
      let emailBody = '';

      if (receiver.role === 'tutor') {
        emailBody = enquiryTemplates.new_enquiry_email.tutor({
          name: senderName,
          studentClass: className,
          mode,
          subject,
        });
      } else {
        emailBody = enquiryTemplates.new_enquiry_email.student({
          name: senderName,
          subject,
        });
      }

      await triggerNotification({
        user_id: receiver.id,
        type: 'email',
        template_name: 'new_enquiry_email',
        recipient: receiver.email,
        params: {
          name: senderName,
          studentClass: className,
          mode,
          subject
        }
      });
    }

    // WhatsApp
    if (receiver.mobile_number) {
      const whatsappBody = enquiryTemplates.new_enquiry_whatsapp({
        link: `https://dronacharya.in/${receiver.role}/enquiries`
      });

      await triggerNotification({
        user_id: receiver.id,
        type: 'whatsapp',
        template_name: 'new_enquiry_whatsapp',
        recipient: receiver.mobile_number,
        params: {
          link: `https://dronacharya.in/${receiver.role}/enquiries`
        }
      });
    }

    // SMS
    if (receiver.mobile_number) {
      const smsBody = enquiryTemplates.new_enquiry_sms({
        name: senderName,
        subject,
      });

      await triggerNotification({
        user_id: receiver.id,
        type: 'sms',
        template_name: 'new_enquiry_sms',
        recipient: receiver.mobile_number,
        params: {
          name: senderName,
          subject
        }
      });
    }

    return res.status(201).json({
      message: 'Enquiry sent and notifications triggered',
      enquiry,
    });
  } catch (err) {
    console.error('createEnquiry error:', err);
    return res.status(500).json({ message: 'Failed to send enquiry', error: err.message });
  }
};


// Get User/Admin Enquiries (protected)
export const getEnquiries = async (req, res) => {
  try {
    const currentUser = req.user;
    // const isAdmin = currentUser.role === "admin";
const isAdmin = currentUser.role === "admin" || currentUser.role === "super_admin";

    // Admin sees all, others see only related enquiries
    const whereClause = isAdmin
      ? {}
      : {
          [Op.or]: [
            { sender_id: currentUser.id },
            { receiver_id: currentUser.id },
          ],
        };

    const enquiries = await db.Enquiry.findAll({
      where: whereClause,
      include: [
        // 🔹 Sender details
        {
          model: db.User,
          as: "Sender",
          attributes: ["id", "role", "is_active"],
          include: [
            {
              model: db.Tutor,
              as: "Tutor",
              attributes: [
                "user_id",
                "name",
                "gender",
                "tutor_gender_preference",
                "subjects",
                "classes",
                "degrees",
                "board",
                "availability",
                "degree_status",
                "school_name",
                "introduction_video",
                "introduction_text",
                "profile_photo",
                "teaching_modes",
                "languages",
                "experience",
                "pricing_per_hour",
                "profile_status",
                "documents",
                "sms_alerts",
                "location_id",
                "created_at",
                "updated_at",
              ],
              include: [
                {
                  model: db.Location,
                  attributes: ["city", "state", "country"],
                },
              ],
            },
            {
              model: db.Student,
              as: "Student",
              attributes: [
                "user_id",
                "name",
                "class",
                "subjects",
                "class_modes",
                "school_name",
                "sms_alerts",
                "languages",
                "location_id",
                "profile_photo",
                "board",
                "availability",
                "hourly_charges",
                "created_at",
                "updated_at",
              ],
              include: [
                {
                  model: db.Location,
                  attributes: ["city", "state", "country"],
                },
              ],
            },
          ],
        },

        // 🔹 Receiver details
        {
          model: db.User,
          as: "Receiver",
          attributes: ["id", "role",  "is_active"],
          include: [
            {
              model: db.Tutor,
              as: "Tutor",
              attributes: [
                "user_id",
                "name",
                "gender",
                "tutor_gender_preference",
                "subjects",
                "classes",
                "degrees",
                "board",
                "availability",
                "degree_status",
                "school_name",
                "introduction_video",
                "introduction_text",
                "profile_photo",
                "teaching_modes",
                "languages",
                "experience",
                "pricing_per_hour",
                "profile_status",
                "documents",
                "sms_alerts",
                "location_id",
                "created_at",
                "updated_at",
              ],
              include: [
                {
                  model: db.Location,
                  attributes: ["city", "state", "country"],
                },
              ],
            },
            {
              model: db.Student,
              as: "Student",
              attributes: [
                "user_id",
                "name",
                "class",
                "subjects",
                "class_modes",
                "school_name",
                "sms_alerts",
                "languages",
                "location_id",
                "profile_photo",
                "board",
                "availability",
                "hourly_charges",
                "created_at",
                "updated_at",
              ],
              include: [
                {
                  model: db.Location,
                  attributes: ["city", "state", "country"],
                },
              ],
            },
          ],
        },
      ],
      order: [["created_at", "DESC"]],
    });

    // Format response
    const formattedEnquiries = enquiries.map((enquiry) => ({
      id: enquiry.id,
      subject: enquiry.subject,
      class: enquiry.class,
      status: enquiry.status,
      description: enquiry.description,
      response_message: enquiry.response_message,
      created_at: enquiry.createdAt,
      sender: {
        id: enquiry.Sender.id,
        role: enquiry.Sender.role,
        // email: enquiry.Sender.email,
        // mobile_number: enquiry.Sender.mobile_number,
        name: enquiry.Sender.Tutor?.name || enquiry.Sender.Student?.name,
        profile:
          enquiry.Sender.role === "tutor"
            ? enquiry.Sender.Tutor
            : enquiry.Sender.Student,
      },
      receiver: {
        id: enquiry.Receiver.id,
        role: enquiry.Receiver.role,
        // email: enquiry.Receiver.email,
        // mobile_number: enquiry.Receiver.mobile_number,
        name: enquiry.Receiver.Tutor?.name || enquiry.Receiver.Student?.name,
        profile:
          enquiry.Receiver.role === "tutor"
            ? enquiry.Receiver.Tutor
            : enquiry.Receiver.Student,
      },
    }));

    res.status(200).json({
      message: "Enquiries fetched successfully",
      enquiries: formattedEnquiries,
    });
  } catch (error) {
    console.error("getEnquiries error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Update Enquiry Status (Accept / Reject)
export const updateEnquiryStatus = async (req, res) => {
  const { id } = req.params;
  const { status, response_message } = req.body;


  try {
    const enquiry = await Enquiry.findByPk(id);
    if (!enquiry) {
      return res.status(404).json({ message: 'Enquiry not found' });
    }


    if (!['pending', 'accepted', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }


    enquiry.status = status;
    enquiry.response_message = response_message || null;


    const [sender, receiver] = await Promise.all([
      User.findByPk(enquiry.sender_id, { include: [Tutor, Student] }),
      User.findByPk(enquiry.receiver_id, { include: [Tutor, Student] }),
    ]);


    if (!enquiry.sender_location) {
      enquiry.sender_location = sender?.Student?.location || sender?.Tutor?.location || null;
    }
    if (!enquiry.receiver_location) {
      enquiry.receiver_location = receiver?.Student?.location || receiver?.Tutor?.location || null;
    }


    await enquiry.save();


    if (sender?.email) {
      await triggerNotification({
        user_id: sender.id,
        type: 'email',
        template_name: 'enquiry_response',
        recipient: sender.email,
        params: {
          subject: enquiry.subject,
          status: status.toUpperCase(),
          response: response_message || 'No message provided.'
        }
      });
    }


    return res.status(200).json({ message: 'Enquiry updated successfully', enquiry });
  } catch (err) {
    console.error('updateEnquiryStatus error:', err);
    return res.status(500).json({ message: 'Failed to update enquiry', error: err.message });
  }
};


// NEW: Public Get Recent Enquiries
export const getRecentEnquiries = async (req, res) => {
  try {
    const enquiries = await Enquiry.findAll({
      order: [['created_at', 'DESC']],
      limit: 10,
      include: [
        {
          model: User,
          as: 'Sender',
          attributes: ['id', 'role'],
          include: [
            { 
              model: Student, 
              as: 'Student', 
              attributes: ['name', 'class', 'subjects', 'profile_photo', 'class_modes', 'hourly_charges'],
              include: [{ model: Location, attributes: ['city', 'state', 'country'] }]
            },
            { 
              model: Tutor, 
              as: 'Tutor', 
              attributes: ['name', 'subjects', 'profile_photo', 'teaching_modes', 'pricing_per_hour'],
              include: [{ model: Location, attributes: ['city', 'state', 'country'] }]
            }
          ]
        },
        {
          model: User,
          as: 'Receiver',
          attributes: ['id', 'role'],
          include: [
            { 
              model: Student, 
              as: 'Student', 
              attributes: ['name', 'class', 'subjects', 'profile_photo', 'class_modes', 'hourly_charges'],
              include: [{ model: Location, attributes: ['city', 'state', 'country'] }]
            },
            { 
              model: Tutor, 
              as: 'Tutor', 
              attributes: ['name', 'subjects', 'profile_photo', 'teaching_modes', 'pricing_per_hour'],
              include: [{ model: Location, attributes: ['city', 'state', 'country'] }]
            }
          ]
        }
      ]
    });

    const formatted = enquiries.map(e => ({
      id: e.id,
      subject: e.subject,
      class: e.class,
      description: e.description,
      created_at: e.createdAt,
      sender: {
        id: e.Sender.id,
        role: e.Sender.role,
        name: e.Sender.Tutor?.name || e.Sender.Student?.name,
        class: e.Sender.Student?.class || null,
        subjects: e.Sender.Student?.subjects || e.Sender.Tutor?.subjects || [],
        profile_photo: e.Sender.Student?.profile_photo || e.Sender.Tutor?.profile_photo || null,
        location: e.Sender.Student?.Location || e.Sender.Tutor?.Location || null,
        modes: e.Sender.Student?.class_modes || e.Sender.Tutor?.teaching_modes || [],
        charges: e.Sender.Student?.hourly_charges || e.Sender.Tutor?.pricing_per_hour || null
      },
      receiver: {
        id: e.Receiver.id,
        role: e.Receiver.role,
        name: e.Receiver.Tutor?.name || e.Receiver.Student?.name,
        class: e.Receiver.Student?.class || null,
        subjects: e.Receiver.Student?.subjects || e.Receiver.Tutor?.subjects || [],
        profile_photo: e.Receiver.Student?.profile_photo || e.Receiver.Tutor?.profile_photo || null,
        location: e.Receiver.Student?.Location || e.Receiver.Tutor?.Location || null,
        modes: e.Receiver.Student?.class_modes || e.Receiver.Tutor?.teaching_modes || [],
        charges: e.Receiver.Student?.hourly_charges || e.Receiver.Tutor?.pricing_per_hour || null
      }
    }));

    res.status(200).json({
      message: 'Recent enquiries fetched successfully',
      enquiries: formatted
    });
  } catch (err) {
    console.error('getRecentEnquiries error:', err);
    res.status(500).json({ message: 'Failed to fetch recent enquiries', error: err.message });
  }
};


export const checkSenderSubscription = async (req, res) => {
  const senderId = req.user.id;

  try {
    const subscription = await UserSubscription.findOne({
      where: { user_id: senderId, is_active: true },
    });

    if (!subscription) {
      return res.status(403).json({
        allowed: false,
        message: 'You need an active subscription to send enquiries.',
      });
    }

    return res.status(200).json({ allowed: true });
  } catch (err) {
    console.error('checkSenderSubscription error:', err);
    return res.status(500).json({ message: 'Failed to check subscription', error: err.message });
  }
};

export const getFollowUpEnquiries = async (req, res) => {
  try {
    const currentUser = req.user;

    // Fetch accepted enquiries for this user
    const enquiries = await Enquiry.findAll({
      where: {
        status: { [Op.eq]: "accepted" },
        [Op.or]: [
          { sender_id: currentUser.id },
          { receiver_id: currentUser.id },
        ],
      },
      include: [
        // 🔹 Sender Info
        {
          model: User,
          as: "Sender",
          attributes: ["id", "role", "email", "mobile_number", "is_active"],
          include: [
            {
              model: Tutor,
              as: "Tutor",
              attributes: [
                "user_id",
                "name",
                "gender",
                "tutor_gender_preference",
                "subjects",
                "classes",
                "degrees",
                "board",
                "availability",
                "degree_status",
                "school_name",
                "introduction_video",
                "introduction_text",
                "profile_photo",
                "teaching_modes",
                "languages",
                "experience",
                "pricing_per_hour",
                "profile_status",
                "documents",
                "sms_alerts",
                "location_id",
                "created_at",
                "updated_at",
              ],
              include: [
                {
                  model: Location,
                  attributes: ["city", "state", "country"],
                },
              ],
            },
            {
              model: Student,
              as: "Student",
              attributes: [
                "user_id",
                "name",
                "class",
                "subjects",
                "class_modes",
                "school_name",
                "sms_alerts",
                "languages",
                "location_id",
                "profile_photo",
                "board",
                "availability",
                "hourly_charges",
                "created_at",
                "updated_at",
              ],
              include: [
                {
                  model: Location,
                  attributes: ["city", "state", "country"],
                },
              ],
            },
          ],
        },

        // 🔹 Receiver Info
        {
          model: User,
          as: "Receiver",
          attributes: ["id", "role", "email", "mobile_number", "is_active"],
          include: [
            {
              model: Tutor,
              as: "Tutor",
              attributes: [
                "user_id",
                "name",
                "gender",
                "tutor_gender_preference",
                "subjects",
                "classes",
                "degrees",
                "board",
                "availability",
                "degree_status",
                "school_name",
                "introduction_video",
                "introduction_text",
                "profile_photo",
                "teaching_modes",
                "languages",
                "experience",
                "pricing_per_hour",
                "profile_status",
                "documents",
                "sms_alerts",
                "location_id",
                "created_at",
                "updated_at",
              ],
              include: [
                {
                  model: Location,
                  attributes: ["city", "state", "country"],
                },
              ],
            },
            {
              model: Student,
              as: "Student",
              attributes: [
                "user_id",
                "name",
                "class",
                "subjects",
                "class_modes",
                "school_name",
                "sms_alerts",
                "languages",
                "location_id",
                "profile_photo",
                "board",
                "availability",
                "hourly_charges",
                "created_at",
                "updated_at",
              ],
              include: [
                {
                  model: Location,
                  attributes: ["city", "state", "country"],
                },
              ],
            },
          ],
        },
      ],
      order: [["updatedAt", "DESC"]],
    });

    // Format response
    const formatted = enquiries.map((e) => ({
      id: e.id,
      subject: e.subject,
      class: e.class,
      status: e.status,
      response_message: e.response_message,
      created_at: e.createdAt,
      updated_at: e.updatedAt,

      sender: {
        id: e.Sender.id,
        role: e.Sender.role,
        email: e.Sender.email,
        mobile_number: e.Sender.mobile_number,
        name: e.Sender.Tutor?.name || e.Sender.Student?.name,
        profile:
          e.Sender.role === "tutor"
            ? e.Sender.Tutor
            : e.Sender.Student,
      },

      receiver: {
        id: e.Receiver.id,
        role: e.Receiver.role,
        email: e.Receiver.email,
        mobile_number: e.Receiver.mobile_number,
        name: e.Receiver.Tutor?.name || e.Receiver.Student?.name,
        profile:
          e.Receiver.role === "tutor"
            ? e.Receiver.Tutor
            : e.Receiver.Student,
      },

      hasConversationStarted: e.status === "accepted",
    }));

    return res.status(200).json({
      message: "Follow-up enquiries fetched successfully",
      enquiries: formatted,
    });
  } catch (error) {
    console.error("getFollowUpEnquiries error:", error);
    return res.status(500).json({
      message: "Failed to fetch follow-up enquiries",
      error: error.message,
    });
  }
};