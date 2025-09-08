import db from '../models/index.js';
import { sendEmail } from '../utils/email.js';
import { sendSMS } from '../utils/sms.js';

export const deactivateExpiredSubscriptions = async () => {
  try {
    const now = new Date();
    const threeDaysLater = new Date(now);
    threeDaysLater.setDate(now.getDate() + 3);

    console.log(`🔍 Checking for expired subscriptions before: ${now.toISOString()}`);

    // 🔹 Deactivate expired subscriptions
    const result = await db.UserSubscription.update(
      { is_active: false },
      {
        where: {
          end_date: { [db.Sequelize.Op.lt]: now },
          is_active: true,
        },
      }
    );
    console.log(`⏱️ Deactivated ${result[0]} expired subscriptions`);

    // 🔹 Notify users whose subscriptions expire in 3 days
    const upcomingExpiries = await db.UserSubscription.findAll({
      where: {
        end_date: {
          [db.Sequelize.Op.between]: [now, threeDaysLater]
        },
        is_active: true,
      },
      include: [{ model: db.User }]
    });

    for (const sub of upcomingExpiries) {
      const user = sub.User;
      const daysLeft = Math.ceil((sub.end_date - now) / (1000 * 60 * 60 * 24));
      const message = `Hi ${user.name}, your subscription will expire in ${daysLeft} day(s). Please renew to continue uninterrupted access.`;

      await sendEmail(user.email, 'Subscription Expiry Reminder', message);
      await sendSMS(user.mobile_number, message);

      console.log(`📩 Reminder sent to ${user.email} and ${user.mobile_number}`);
    }

  } catch (error) {
    console.error('❌ Error during subscription deactivation/reminder:', error);
  }
};

// ✅ Manual CLI run support
if (process.argv[1] === new URL(import.meta.url).pathname) {
  console.log('🚀 Starting deactivateExpiredSubscriptions job');
  deactivateExpiredSubscriptions()
    .then(() => {
      console.log('✅ Manual job completed');
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ Error running job:', err);
      process.exit(1);
    });
}
