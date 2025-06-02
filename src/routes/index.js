import express from 'express';
const router = express.Router();
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
