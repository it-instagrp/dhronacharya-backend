import cron from 'node-cron';
import { deactivateExpiredSubscriptions } from './jobs/deactivateExpiredSubscriptions.js';
import { sendPendingNotifications } from './jobs/sendPendingNotifications.js';
import { cleanupUnverifiedUsers } from './jobs/cleanupUnverifiedUsers.js';

// 🔄 Run at midnight every day
cron.schedule('0 0 * * *', () => {
  console.log('🔄 Running cron job: Deactivate expired subscriptions');
  deactivateExpiredSubscriptions();
});

// ⏰ Run every 5 minutes
cron.schedule('*/5 * * * *', () => {
  console.log('⏰ Running cron job: Send pending notifications');
  sendPendingNotifications();
});

// 🧹 Run every 5 minutes to clean unverified users older than 30 minutes
cron.schedule('*/5 * * * *', () => {
  console.log('🧹 Running cron job: Cleanup unverified users');
  cleanupUnverifiedUsers();
});
