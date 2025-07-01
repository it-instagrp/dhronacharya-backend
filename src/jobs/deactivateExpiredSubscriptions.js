// ✅ src/jobs/deactivateExpiredSubscriptions.js

import db from '../models/index.js';

export const deactivateExpiredSubscriptions = async () => {
  try {
    const now = new Date();
    console.log(`🔍 Checking for expired subscriptions before: ${now.toISOString()}`);

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
  } catch (error) {
    console.error('❌ Error during subscription deactivation:', error);
  }
};

// ✅ Run manually if called directly from CLI
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
