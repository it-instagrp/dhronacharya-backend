import db from '../models/index.js';
import { v4 as uuidv4 } from 'uuid';

const { ReferralCode, User } = db;

/**
 * ✅ 1. Generate a referral code
 */
export const generateReferralCode = async (req, res) => {
  const { id: userId } = req.user;

  try {
    const existing = await ReferralCode.findOne({
      where: { referrer_user_id: userId },
    });

    if (existing) {
      return res.status(400).json({ message: 'Referral code already exists.' });
    }

    const code = `REF-${uuidv4().slice(0, 8).toUpperCase()}`;

    const referral = await ReferralCode.create({
      code,
      referrer_user_id: userId,
    });

    return res.status(201).json({ message: 'Referral code generated', referral });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Error generating referral code.' });
  }
};

/**
 * ✅ 2. Get referral code(s) for current user
 */
export const getMyReferralCodes = async (req, res) => {
  const { id: userId } = req.user;

  try {
    const codes = await ReferralCode.findAll({
      where: { referrer_user_id: userId },
      include: [
        { model: User, as: 'Referred', attributes: ['id', 'username', 'email'] }
      ],
      order: [['created_at', 'DESC']]
    });

    return res.status(200).json({ codes });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Error fetching referral codes.' });
  }
};

/**
 * ✅ 3. Apply referral code (when user signs up or subscribes)
 */
/**
 * ✅ 3. Apply referral code (when user signs up or subscribes)
 */
export const applyReferralCode = async (req, res) => {
  const { code } = req.body;
  const { id: referredUserId } = req.user;

  try {
    const referral = await ReferralCode.findOne({ where: { code } });

    if (!referral) {
      return res.status(404).json({ message: 'Invalid referral code.' });
    }

    if (referral.referred_user_id) {
      return res.status(400).json({ message: 'Referral code already used.' });
    }

    referral.referred_user_id = referredUserId;
    referral.status = 'converted';
    await referral.save();

    // ✅ Auto-reward logic: notify the referrer
    const referrer = await User.findByPk(referral.referrer_user_id);

    if (referrer) {
      const rewardMessage = `🎉 Congratulations! You've earned a reward for referring a user.`;

      // Save reward details (optional: if these fields exist)
      referral.reward_given = true;
      referral.reward_type = 'coupon';
      referral.reward_value = '25% off';
      await referral.save();

      // Send notification (email or SMS or WhatsApp)
      await db.Notification.create({
        user_id: referrer.id,
        type: 'email',
        template_name: 'Referral Reward',
        recipient: referrer.email,
        content: rewardMessage,
        status: 'sent',
        sent_at: new Date()
      });

      // Or use: await sendEmail(referrer.email, 'Referral Reward', rewardMessage);
      // Or use: await sendWhatsApp(referrer.mobile_number, rewardMessage);
    }

    return res.status(200).json({ message: 'Referral code applied and reward issued.', referral });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Error applying referral code.' });
  }
};

/**
 * ✅ 4. Admin: Get all referral usages
 */
export const getAllReferrals = async (req, res) => {
  try {
    const referrals = await ReferralCode.findAll({
      include: [
        { model: User, as: 'Referrer', attributes: ['id', 'email', 'role'] },
        { model: User, as: 'Referred', attributes: ['id', 'email', 'role'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({ referrals });
  } catch (error) {
    console.error('❌ Error in getAllReferrals:', error); // ← Add this
    res.status(500).json({ message: 'Error fetching referrals.' });
  }
};


/**
 * ✅ 5. Admin: Mark referral as rewarded
 */
export const markRewardGiven = async (req, res) => {
  const { id } = req.params;
  const { reward_type, reward_value } = req.body;

  try {
    const referral = await db.ReferralCode.findByPk(id);

    if (!referral) return res.status(404).json({ message: 'Referral not found.' });

    referral.reward_given = true;
    referral.reward_type = reward_type || null;
    referral.reward_value = reward_value || null;

    await referral.save();

    return res.status(200).json({
      message: 'Referral marked as rewarded.',
      referral
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Error updating referral.' });
  }
};
