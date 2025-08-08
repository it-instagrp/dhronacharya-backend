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
import userSubscriptionRoutes from './subscription.route.js';    // ✅ renamed
import messageRoutes from './message.routes.js';
import tutorRoutes from './tutor.routes.js';
import adminRoutes from './admin.routes.js';
import searchRoutes from './search.routes.js';
import billingRoutes from './billing.routes.js';
import bookmarkRoutes from './bookmark.routes.js';
import recommendationRoutes from './recommendation.routes.js';
import conversationRoutes from './conversation.routes.js';
import adminSubscriptionRoutes from './admin.subscription.js';   // ✅ renamed
import referralRoutes from './referral.routes.js';
import couponRoutes from './coupon.route.js';
import analyticsRoutes from './analytics.routes.js';
import notificationRoutes from './notification.route.js';
import invoiceRoutes from './invoice.route.js';
import groupRoutes from './group.routes.js'; 


const routes = () => {
  router.get('/', (req, res) => {
    res.json('Welcome to API');
  });

  router.use('/auth', authRoutes);
  router.use('/users', userRoutes);
  router.use('/profile', profileRoutes);
  router.use('/enquiries', enquiryRoutes);
  router.use('/payments', paymentRoutes);
  router.use('/subscriptions', userSubscriptionRoutes);   // ✅ correct
  router.use('/contacts', contactRoutes);
  router.use('/classes', classRoutes);
  router.use('/admin', adminRoutes);
  router.use('/messages', messageRoutes);
  router.use('/tutors', tutorRoutes);
  router.use('/search', searchRoutes);
  router.use('/billing', billingRoutes);
  router.use('/bookmarks', bookmarkRoutes);
  router.use('/recommendations', recommendationRoutes);
  router.use('/conversations', conversationRoutes);
  router.use('/admin/subscriptions', adminSubscriptionRoutes);  // ✅ correct
  router.use('/referrals', referralRoutes);
  router.use('/coupons', couponRoutes);
  router.use('/analytics', analyticsRoutes);
  router.use('/notifications', notificationRoutes);
  router.use('/invoices', invoiceRoutes);
  router.use('/groups', groupRoutes);


  return router;
};

export default routes;
