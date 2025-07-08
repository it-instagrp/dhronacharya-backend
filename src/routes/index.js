import express from 'express';
const router = express.Router();

/**** Route Imports ****/
import userRoutes from './user.route.js';
import authRoutes from './auth.route.js';
import profileRoutes from './profileRoutes.js';
import enquiryRoutes from './enquiry.route.js';
import paymentRoutes from './payment.route.js';
import contactRoutes from './contact.route.js';
import classRoutes from './class.route.js';
import subscriptionRoutes from './subscription.route.js';
import messageRoutes from './message.routes.js';
import tutorRoutes from './tutor.routes.js';
import adminRoutes from './admin.routes.js';
import searchRoutes from './search.routes.js';   // ✅ Corrected path here

/**
 * Function contains Application routes
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
  router.use('/payments', paymentRoutes);
  router.use('/subscriptions', subscriptionRoutes);
  router.use('/contacts', contactRoutes);
  router.use('/classes', classRoutes);
  router.use('/admin', adminRoutes);
  router.use('/messages', messageRoutes);
  router.use('/tutors', tutorRoutes);
  router.use('/search', searchRoutes);           // ✅ Fixed: added inside router

  return router;
};

export default routes;
