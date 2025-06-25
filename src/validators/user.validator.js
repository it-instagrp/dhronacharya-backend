import Joi from '@hapi/joi';

export const newUserValidator = (req, res, next) => {
  // Base schema for common user fields
  let schema = Joi.object({
    email: Joi.string().email().required(),
    mobile_number: Joi.string().min(10).max(15).required(),
    password: Joi.string().min(6).required(),
    role: Joi.string().valid('admin', 'tutor', 'student').default('student'),
    name: Joi.string().optional(),
  });

  // Extend schema depending on role
  if (req.body.role === 'student') {
    schema = schema.append({
      class: Joi.string().required(),
      subjects: Joi.array().items(Joi.string()).min(1).required(),
    });
  } else if (req.body.role === 'tutor') {
    schema = schema.append({
      classes: Joi.array().items(Joi.string()).min(1).required(),
      subjects: Joi.array().items(Joi.string()).min(1).required(),
      // degrees: Joi.array().items(Joi.string()).optional(),
      // introduction_video: Joi.string().optional(),
    });
  }
  // For admin, no extra fields required (you can add if needed)

  // Validate request body strictly (no unknown keys allowed)
  const { error, value } = schema.validate(req.body, { abortEarly: false, allowUnknown: false });

  if (error) {
    return res.status(400).json({ message: 'Validation error', details: error.details });
  }

  req.validatedBody = value;
  next();
};

export const loginValidator = (req, res, next) => {
  const schema = Joi.object({
    email: Joi.string().email().when('mobile_number', {
      is: Joi.exist(),
      then: Joi.optional(),
      otherwise: Joi.required()
    }),
    mobile_number: Joi.string().min(10).max(15).when('email', {
      is: Joi.exist(),
      then: Joi.optional(),
      otherwise: Joi.required()
    }),
    password: Joi.string().required()
  }).or('email', 'mobile_number');

  const { error, value } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ message: 'Validation error', details: error.details });
  }

  req.validatedBody = value;
  next();
};
