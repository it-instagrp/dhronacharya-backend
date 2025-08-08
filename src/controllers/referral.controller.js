import db from '../models/index.js';
import { v4 as uuidv4 } from 'uuid';
import { referralTemplates } from '../templates/referralTemplates.js';
import { sendEmail } from '../utils/email.js';
import { sendSMS } from '../utils/sms.js';
import { sendWhatsApp } from '../utils/whatsapp.js';
import { Op } from 'sequelize';

const {
  ReferralCode,
  User,
  Student,
  Tutor,
  UserSubscription,
  Sequelize,
} = db;

// ✅ 1. Generate a referral code
export const generateReferralCode = async (req, res) => {
  const userId = req.user.id;

  try {
    let existing = await ReferralCode.findOne({
      where: { referrer_user_id: userId, referred_user_id: null },
    });

    if (existing) {
      return res.status(200).json({
        status: true,
        message: `Your referral code is: ${existing.code}`,
        code: existing.code,
      });
    }

    const newCode = await ReferralCode.create({
      id: uuidv4(),
      code: `DRONA-${uuidv4().slice(0, 6).toUpperCase()}`,
      referrer_user_id: userId,
    });

    return res.status(200).json({
      status: true,
      message: `Referral code created: ${newCode.code}`,
      code: newCode.code,
    });
  } catch (err) {
    console.error('Error generating referral code:', err);
    return res.status(500).json({ status: false, message: 'Internal Server Error' });
  }
};


// ✅ 2. Apply referral code
export const applyReferralCode = async (req, res) => {
  const { code } = req.body;
  const referredUser = req.user;

  if (!code || !referredUser) {
    return res
      .status(400)
      .json({ status: false, message: 'Referral code and login required.' });
  }

  try {
    const referral = await ReferralCode.findOne({ where: { code } });

    if (!referral) {
      return res.status(404).json({ status: false, message: 'Invalid referral code.' });
    }

    if (referral.referrer_user_id === referredUser.id) {
      return res
        .status(400)
        .json({ status: false, message: 'You cannot refer yourself.' });
    }

    const existingReferral = await ReferralCode.findOne({
      where: { referred_user_id: referredUser.id },
    });

    if (existingReferral) {
      return res
        .status(400)
        .json({ status: false, message: 'Referral already applied.' });
    }

    referral.referred_name = referredUser.username || referredUser.name;
    referral.referred_email = referredUser.email;
    referral.referred_user_id = referredUser.id;
    referral.referred_at = new Date();
    referral.status = 'converted';
    await referral.save();

    const referrer = await User.findByPk(referral.referrer_user_id);

    const emailMessage = referralTemplates.codeApplied.email({
      referrerName: referrer.name,
      referredName: referredUser.username || referredUser.name,
    });

    const smsMessage = referralTemplates.codeApplied.sms({
      referredName: referredUser.name,
    });

    const whatsappMessage = referralTemplates.codeApplied.whatsapp({
      referredName: referredUser.name,
    });

    try {
      await sendEmail(referrer.email, 'Your referral was used!', emailMessage);
    } catch (e) {
      console.error('❌ Email send failed:', e.message);
    }

    if (referrer.mobile_number) {
      try {
        await sendSMS(referrer.mobile_number, smsMessage);
        await sendWhatsApp(referrer.mobile_number, whatsappMessage);
      } catch (e) {
        console.error('❌ SMS/WhatsApp failed:', e.message);
      }
    }

    return res
      .status(200)
      .json({ status: true, message: 'Referral applied successfully.' });
  } catch (err) {
    console.error('❌ Error applying referral:', err);
    return res.status(500).json({ status: false, message: 'Internal Server Error' });
  }
};

// ✅ 3. Get my referrals
export const getMyReferralCodes = async (req, res) => {
  const userId = req.user.id;

  try {
    const codes = await ReferralCode.findAll({
      where: { referrer_user_id: userId },
      include: [
        {
          model: User,
          as: 'Referred',
          attributes: ['id', 'name', 'email'],
          required: false,
        },
      ],
      order: [['referred_at', 'DESC']],
    });

    const result = codes.map((code) => ({
      id: code.id,
      code: code.code,
      status: code.status,
      rewardGiven: code.reward_given,
      rewardType: code.reward_type,
      rewardValue: code.reward_value,
      referredAt: code.referred_at,
      referredUser: code.Referred
        ? {
            id: code.Referred.id,
            name: code.Referred.name,
            email: code.Referred.email,
          }
        : {
            id: null,
            name: code.referred_name,
            email: code.referred_email,
          },
    }));

    const total = result.length;
    const signedUp = result.filter((r) => r.referredUser?.id).length;
    const rewardsGiven = result.filter((r) => r.rewardGiven).length;

    return res.status(200).json({
      status: true,
      summary: {
        totalReferred: total,
        signedUp,
        rewardsGiven,
      },
      data: result,
    });
  } catch (err) {
    console.error('Error fetching referral codes:', err);
    return res.status(500).json({ status: false, message: 'Internal Server Error' });
  }
};

// ✅ 4. Admin - Get all referrals
export const getAllReferrals = async (req, res) => {
  try {
    const referrals = await db.ReferralCode.findAll({
      include: [
        {
          model: db.User,
          as: 'Referrer',
          attributes: ['id', 'name', 'email'],
        },
        {
          model: db.User,
          as: 'Referred',
          attributes: ['id', 'name', 'email'],
          required: false,
        },
      ],
      order: [['referred_at', 'DESC']],
    });

    const grouped = {};

    for (const r of referrals) {
      const referrer = r.Referrer;
      if (!referrer) continue; // Skip if no referrer user

      const refId = referrer.id;

      if (!grouped[refId]) {
        grouped[refId] = {
          referrerId: referrer.id,
          referrerName: referrer.name || '',
          referrerEmail: referrer.email || '',
          referredUsers: [],
          referredCount: 0,
        };
      }

      // Always push referral entry (even if not used)
      grouped[refId].referredUsers.push({
        referralId: r.id,
        id: r.Referred?.id || null,
         code: r.code || '',
        name: r.Referred?.name || r.referred_name || '',
        email: r.Referred?.email || r.referred_email || '',
        status: r.status || 'pending',
        rewardGiven: r.reward_given || false,
        rewardType: r.reward_type || '',
        rewardValue: r.reward_value || '',
        referredAt: r.referred_at || null,
      });

      // ✅ Only count referral if actually applied and converted
      if (r.referred_user_id && r.status === 'converted') {
        grouped[refId].referredCount++;
      }
    }

    const final = Object.values(grouped);
    return res.status(200).json({ status: true, data: final });
  } catch (err) {
    console.error('Error fetching all referrals:', err);
    return res.status(500).json({ status: false, message: 'Internal Server Error' });
  }
};


// ✅ 5. Mark reward as given (Updated for student/tutor + subscription)
export const markRewardGiven = async (req, res) => {
  const { id } = req.params;
  const { rewardType, rewardValue } = req.body;

  try {
    const referral = await ReferralCode.findByPk(id);
    if (!referral)
      return res.status(404).json({ status: false, message: 'Referral not found.' });

    const referrer = await User.findByPk(referral.referrer_user_id);
    if (!referrer)
      return res.status(404).json({ status: false, message: 'Referrer not found.' });

    // ✅ 1. CONTACT VIEW BONUS — student/tutor
    if (rewardType === 'contact_view_bonus' && !isNaN(parseInt(rewardValue))) {
      const bonusViews = parseInt(rewardValue);

      if (referrer.role === 'student') {
        const student = await Student.findOne({ where: { user_id: referrer.id } });
        if (student) {
          student.contact_views_left = (student.contact_views_left || 0) + bonusViews;
          await student.save();
        }
      }

      if (referrer.role === 'tutor') {
        const tutor = await Tutor.findOne({ where: { user_id: referrer.id } });
        if (tutor) {
          tutor.contact_views_left = (tutor.contact_views_left || 0) + bonusViews;
          await tutor.save();
        }
      }
    }

    // ✅ 2. SUBSCRIPTION BONUS
    if (rewardType === 'subscription_bonus' && rewardValue.includes('Days')) {
      const bonusDays = parseInt(rewardValue.split(' ')[0]);

      const activeSubscription = await UserSubscription.findOne({
        where: {
          user_id: referral.referrer_user_id,
          is_active: true,
          end_date: { [Op.gt]: new Date() },
        },
      });

      if (activeSubscription) {
        const newEndDate = new Date(activeSubscription.end_date);
        newEndDate.setDate(newEndDate.getDate() + bonusDays);
        activeSubscription.end_date = newEndDate;
        await activeSubscription.save();
      }
    }

    // ✅ 3. COUPON or DISCOUNT (Log only)
    if (rewardType === 'coupon' || rewardType === 'discount') {
      console.log(`Apply ${rewardType}: ${rewardValue} to user ID ${referrer.id}`);
    }

    // ✅ Finalize reward entry
    referral.reward_given = true;
    referral.reward_type = rewardType;
    referral.reward_value = rewardValue;
    await referral.save();

    // ✅ 4. Notify referrer via Email, SMS, WhatsApp
    const template = referralTemplates.rewardGiven;

    const emailContent = template.email({
      name: referrer.name,
      rewardType,
      rewardValue,
    });

    const smsContent = template.sms({
      name: referrer.name,
      rewardType,
      rewardValue,
    });

    const whatsappContent = template.whatsapp({
      name: referrer.name,
      rewardType,
      rewardValue,
    });

    try {
      await sendEmail(referrer.email, 'You received a referral reward!', emailContent);
    } catch (e) {
      console.error('❌ Email send failed:', e.message);
    }

    if (referrer.mobile_number) {
      try {
        await sendSMS(referrer.mobile_number, smsContent);
        await sendWhatsApp(referrer.mobile_number, whatsappContent);
      } catch (e) {
        console.error('❌ SMS/WhatsApp failed:', e.message);
      }
    }

    return res.status(200).json({
      status: true,
      message: 'Referral reward processed and notification sent.',
      referral,
    });
  } catch (err) {
    console.error('❌ Error processing reward:', err);
    return res.status(500).json({ status: false, message: 'Internal Server Error' });
  }
};
