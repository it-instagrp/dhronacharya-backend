import HttpStatus from 'http-status-codes';
import * as UserService from '../services/user.service.js';

/**
 * Controller to get all users available
 * @param  {object} req - request object
 * @param {object} res - response object
 * @param {Function} next
 */
/**** This method is for users to find all list of users ****/
export const getAllUsers = async (req, res, next) => {
  try {
    const role = req.query.role; // e.g., ?role=student
    const data = await UserService.getAllUsers(role);
    res.status(HttpStatus.OK).json({
      code: HttpStatus.OK,
      data,
      message: 'All users fetched successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**** Just like this add all controller methods ****/