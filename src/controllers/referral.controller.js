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

    return res.status(200).json({ message: 'Referral code applied.', referral });
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
