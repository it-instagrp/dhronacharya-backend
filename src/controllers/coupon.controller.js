import db from '../models/index.js';

export const applyCoupon = async (req, res) => {
  const { code } = req.body;
  try {
    const coupon = await db.Coupon.findOne({
      where: {
        code,
        is_active: true,
        expiry_date: { [db.Sequelize.Op.gte]: new Date() },
      }
    });
    if (!coupon) return res.status(404).json({ message: 'Invalid or expired coupon' });

    res.json({ coupon });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
