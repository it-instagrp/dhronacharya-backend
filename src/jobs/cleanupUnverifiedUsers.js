import cron from "node-cron";
import db from "../models/index.js";
import { Op } from "sequelize"; // import Op directly from sequelize

const { User } = db;

export const cleanupUnverifiedUsers = () => {
  // Run every 5 minutes
  cron.schedule("*/5 * * * *", async () => {
    try {
      const cutoff = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes ago

      const deleted = await User.destroy({
        where: {
          is_active: false,
          created_at: { [Op.lt]: cutoff } // ✅ use Op here
        }
      });

      if (deleted > 0) {
        console.log(`🧹 Cleanup: Deleted ${deleted} unverified users older than 30 minutes`);
      }
    } catch (err) {
      console.error("Cleanup job failed:", err);
    }
  });
};
