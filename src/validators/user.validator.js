import Joi from '@hapi/joi';

export const newUserValidator = (req, res, next) => {
  let schema = Joi.object({
    email: Joi.string().email().optional(),
    mobile_number: Joi.string().min(10).max(15).required(),
    password: Joi.string().min(6).optional(), // base optional
    role: Joi.string().valid('admin', 'tutor', 'student').default('student'),
    name: Joi.string().required(),
  });

  // 🎓 Student rules
  // 🎓 Student rules
if (req.body.role === 'student') {
  schema = schema.keys({
    password: Joi.forbidden(),
    temp_student_id: Joi.string().uuid().optional(),
    class: Joi.when('temp_student_id', {
      is: Joi.exist(),
      then: Joi.forbidden(),
      otherwise: Joi.string().optional()
    }),
    subjects: Joi.when('temp_student_id', {
      is: Joi.exist(),
      then: Joi.forbidden(),
      otherwise: Joi.array().items(Joi.string()).optional()
    }),
    board: Joi.string().optional(),
    availability: Joi.alternatives().try(Joi.array().items(Joi.string()), Joi.string()).optional(),
    start_timeline: Joi.string().optional(),
    class_modes: Joi.alternatives().try(Joi.array().items(Joi.string()), Joi.string()).optional(),
    tutor_gender_preference: Joi.string().optional(),
    hourly_charges: Joi.number().optional(),
    place_id: Joi.string().optional(),
    location_id: Joi.string().uuid().optional(),
    
    // 🔹 Add these new fields
    offline_type: Joi.string().valid('home', 'nearby').optional(),
    pincode: Joi.string().pattern(/^[0-9]{4,10}$/).optional(), // support 4–10 digit postal codes
    country: Joi.string().length(2).optional(), // ISO code (e.g. IN, US, UK)

    profile_photo: Joi.string().uri().optional(),
    languages: Joi.array().items(Joi.object({
      language: Joi.string().required(),
      proficiency: Joi.string().optional()
    })).optional(),
    school_name: Joi.string().optional(),
    sms_alerts: Joi.boolean().optional(),
  });
}


  // 🎓 Tutor rules
  if (req.body.role === 'tutor') {
    schema = schema.keys({
      password: Joi.string().min(6).required(),
      classes: Joi.array().items(Joi.string()).min(1).required(),
      subjects: Joi.array().items(Joi.string()).min(1).required(),
    });
  }

  // 🎓 Admin rules
  if (req.body.role === 'admin') {
    schema = schema.keys({
      password: Joi.string().min(6).required(),
    });
  }

  const { error, value } = schema.validate(req.body, {
    abortEarly: false,
    allowUnknown: false,
  });

  if (error) {
    return res.status(400).json({ message: 'Validation error', details: error.details });
  }

  req.validatedBody = value;
  next();
};

// ✅ Separate login validator
export const loginValidator = (req, res, next) => {
  let schema = Joi.object({
    role: Joi.string().valid('admin', 'tutor', 'student').required(),
  });

  if (req.body.role === 'student') {
    // 🎓 Student login → OTP only
    schema = schema.keys({
      emailOrMobile: Joi.string().required(),
      otp: Joi.string().length(6).required(), // OTP must be 6-digit
    });
  } else {
    // 🎓 Tutor/Admin login → password
    schema = schema.keys({
      emailOrMobile: Joi.string().required(),
      password: Joi.string().required(),
    });
  }

  const { error, value } = schema.validate(req.body, {
    abortEarly: false,
    allowUnknown: false,
  });

  if (error) {
    return res.status(400).json({ message: 'Validation error', details: error.details });
  }

  req.validatedBody = value;
  next();
};
