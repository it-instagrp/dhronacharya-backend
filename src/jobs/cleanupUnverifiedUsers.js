import cron from "node-cron";
import db from "../models/index.js";
import { Op } from "sequelize";

const { User } = db;

export const cleanupUnverifiedUsers = () => {
  // Run every 5 minutes
  cron.schedule("*/5 * * * *", async () => {
    try {
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago

      // Just log info — no deletion
      const unverifiedUsers = await User.findAll({
        where: {
          is_active: false,
          created_at: { [Op.lt]: cutoff },
        },
        attributes: ["id", "name", "email", "created_at"],
      });

      console.log("Cleanup job ran — no users will be deleted.");

      if (unverifiedUsers.length > 0) {
        console.log(
          `Found ${unverifiedUsers.length} unverified users older than 24 hours (kept for now).`
        );
      } else {
        console.log("No unverified users found.");
      }
    } catch (err) {
      console.error("Cleanup job failed:", err);
    }
  });
};
