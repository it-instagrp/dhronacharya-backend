import HttpStatus from 'http-status-codes';
import jwt from 'jsonwebtoken';

/**
 * Middleware to authenticate requests except public ones
 *
 * Authorization: Bearer <token>
 */

export const authenticate = async (req, res, next) => {
  try {
    // Allow public routes without authentication
    const openRoutes = [
      { method: 'GET', path: '/api/' },
      { method: 'POST', path: '/api/query' },
      { method: 'POST', path: '/api/auth/signup' },
      { method: 'POST', path: '/api/auth/login' },
    ];

    const isPublic = openRoutes.some(
      (route) => route.method === req.method && route.path === req.path
    );

    if (isPublic) {
      return next();
    }

    let bearerToken = req.header('Authorization');
    if (!bearerToken || !bearerToken.startsWith('Bearer ')) {
      return res.status(HttpStatus.UNAUTHORIZED).json({
        code: HttpStatus.UNAUTHORIZED,
        message: 'Authorization token is required'
      });
    }

    bearerToken = bearerToken.split(' ')[1];

    const decoded = jwt.verify(bearerToken, process.env.JWT_SECRET);
    res.locals.user = decoded;
    res.locals.token = bearerToken;
    req.user = decoded;

    next();
  } catch (error) {
    return res.status(HttpStatus.UNAUTHORIZED).json({
      code: HttpStatus.UNAUTHORIZED,
      message: 'Invalid or expired token'
    });
  }
};
