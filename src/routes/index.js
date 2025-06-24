import express from 'express';
const router = express.Router();

/**** Route Imports ****/
import userRoutes from './user.route.js';
import authRoutes from './auth.route.js';
import profileRoutes from './profileRoutes.js';
import enquiryRoutes from './enquiry.route.js';

/**
 * Function contains Application routes
 *
 * @returns router
 */
const routes = () => {
  router.get('/', (req, res) => {
    res.json('Welcome');
  });
  
  router.use('/auth', authRoutes);
  router.use('/users', userRoutes);
  router.use('/profile', profileRoutes);
  router.use('/enquiries', enquiryRoutes);


  return router;
};

export default routes;