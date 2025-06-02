import express from 'express';
const router = express.Router();

/**** Route Imports ****/
import userRoutes from './user.route.js';

/**
 * Function contains Application routes
 *
 * @returns router
 */
const routes = () => {
  router.get('/', (req, res) => {
    res.json('Welcome');
  });
  // router.use('/auth', authRoutes); <---- Use routes according to our project

  return router;
};

export default routes;
