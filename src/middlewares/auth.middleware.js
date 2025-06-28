import HttpStatus from 'http-status-codes';
import jwt from 'jsonwebtoken';
import db from '../models/index.js';

const { User, Tutor, Student, Admin } = db;

/**
 * Enhanced authentication middleware with:
 * - Public route whitelisting
 * - Token verification
 * - User existence check
 * - Role-based access control
 */
export const authenticate = async (req, res, next) => {
  try {
    // Define public routes that don't require authentication
    const publicRoutes = [
      { method: 'GET', path: '/api/' },
      { method: 'POST', path: '/api/auth/signup' },
      { method: 'POST', path: '/api/auth/login' },
      { method: 'POST', path: '/api/auth/verify-otp' },
      { method: 'POST', path: '/api/auth/forgot-password' },
      { method: 'POST', path: '/api/auth/reset-password' },
      { method: 'POST', path: '/api/auth/send-login-otp' },
      { method: 'POST', path: '/api/auth/verify-login-otp' },
       { method: 'POST', path: '/api/payments/create-order' }
    ];

    // Check if current route is public
    const isPublic = publicRoutes.some(
      route => route.method === req.method && req.path.startsWith(route.path)
    );

    if (isPublic) {
      return next();
    }

    // Check for Authorization header
    const authHeader = req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(HttpStatus.UNAUTHORIZED).json({
        success: false,
        message: 'Authorization token is required',
        code: HttpStatus.UNAUTHORIZED
      });
    }

    // Extract and verify token
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Verify user exists and is active
    const user = await User.findByPk(decoded.id, {
      include: [
        { model: Tutor, as: 'Tutor' },
        { model: Student, as: 'Student' },
        { model: Admin, as: 'Admin' }
      ]
    });

    if (!user || !user.is_active) {
      return res.status(HttpStatus.UNAUTHORIZED).json({
        success: false,
        message: 'User not found or account is inactive',
        code: HttpStatus.UNAUTHORIZED
      });
    }

    // Attach user to request
    req.user = {
      id: user.id,
      email: user.email,
      mobile_number: user.mobile_number,
      role: user.role,
      profile: user.Tutor || user.Student || user.Admin || null,
      token
    };

    next();
  } catch (error) {
    // Handle specific JWT errors
    if (error.name === 'TokenExpiredError') {
      return res.status(HttpStatus.UNAUTHORIZED).json({
        success: false,
        message: 'Session expired, please login again',
        code: HttpStatus.UNAUTHORIZED
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(HttpStatus.UNAUTHORIZED).json({
        success: false,
        message: 'Invalid token',
        code: HttpStatus.UNAUTHORIZED
      });
    }

    // Generic error handler
    console.error('Authentication error:', error);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Authentication failed',
      code: HttpStatus.INTERNAL_SERVER_ERROR
    });
  }
};

/**
 * Role authorization middleware
 * @param {...string} roles - Allowed roles
 */
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(HttpStatus.FORBIDDEN).json({
        success: false,
        message: `User role ${req.user.role} is not authorized`,
        code: HttpStatus.FORBIDDEN
      });
    }
    next();
  };
};

/**
 * Tutor-specific middleware to check if profile is approved
 */
export const checkTutorApproval = async (req, res, next) => {
  if (req.user.role !== 'tutor') {
    return next();
  }

  if (req.user.profile?.profile_status !== 'approved') {
    return res.status(HttpStatus.FORBIDDEN).json({
      success: false,
      message: 'Tutor profile not approved yet',
      code: HttpStatus.FORBIDDEN
    });
  }

  next();
};