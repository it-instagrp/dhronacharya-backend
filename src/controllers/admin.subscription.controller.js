import db from '../models/index.js';
import { Op } from 'sequelize';

const { UserSubscription, SubscriptionPlan, User, Tutor, Student } = db;

// ✅ GET /api/admin/subscriptions?role=tutor|student
export const getAllSubscriptions = async (req, res) => {
  const { role } = req.query;
  const where = role ? { '$User.role$': role } : {};

  try {
    const subscriptions = await UserSubscription.findAll({
      where,
      include: [
        {
          model: User,
          attributes: ['id', 'email', 'mobile_number', 'role'],
          include: [
            { model: Tutor, attributes: ['name'] },
            { model: Student, attributes: ['name'] },
          ],
        },
        {
          model: SubscriptionPlan,
          attributes: ['plan_name']
        }
      ],
      order: [['created_at', 'DESC']]
    });

    const result = subscriptions.map((sub) => ({
      name: sub.User?.Tutor?.name || sub.User?.Student?.name || 'Unnamed',
      email: sub.User?.email,
      phone: sub.User?.mobile_number,
      profession: sub.User?.role === 'tutor' ? 'Tutor' : 'Student',
      plan: sub.SubscriptionPlan?.plan_name || 'Plan Purchased',
    }));

    return res.status(200).json(result);
  } catch (error) {
    console.error('Failed to fetch subscriptions:', error);
    return res.status(500).json({ message: 'Failed to fetch subscriptions', error: error.message });
  }
};

// ✅ GET /api/admin/subscriptions/unsubscribed?role=tutor|student
export const getUnsubscribedUsers = async (req, res) => {
  const { role } = req.query;

  if (!['tutor', 'student'].includes(role)) {
    return res.status(400).json({ message: 'Invalid role. Must be tutor or student' });
  }

  try {
    const subscribed = await UserSubscription.findAll({ attributes: ['user_id'] });
    const subscribedIds = subscribed.map((s) => s.user_id);

    const unsubscribedUsers = await User.findAll({
      where: {
        id: { [Op.notIn]: subscribedIds },
        role,
      },
      attributes: ['id', 'email', 'mobile_number', 'role'],
      include: [
        { model: Tutor, attributes: ['name'] },
        { model: Student, attributes: ['name'] }
      ]
    });

    const formatted = unsubscribedUsers.map(user => ({
      id: user.id,
      name: user.Tutor?.name || user.Student?.name || 'Unnamed',
      email: user.email,
      phone: user.mobile_number,
      profession: user.role === 'tutor' ? 'Tutor' : 'Student'
    }));

    res.status(200).json(formatted);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch unsubscribed users', error: err.message });
  }
};

// ✅ POST /api/admin/subscriptions/plans
export const createSubscriptionPlan = async (req, res) => {
  const { plan_name, price, duration_days, contact_limit, plan_type, features, user_type } = req.body;

  if (!plan_name || !price || !duration_days) {
    return res.status(400).json({ message: 'plan_name, price, and duration_days are required' });
  }

  try {
    const plan = await SubscriptionPlan.create({
      plan_name,
      price,
      duration_days,
      contact_limit,
      plan_type,
      features,
      user_type
    });

    return res.status(201).json({ message: 'Plan created successfully', plan });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to create plan', error: err.message });
  }
};

// ✅ PUT /api/admin/subscriptions/plans/:id
export const updateSubscriptionPlan = async (req, res) => {
  try {
    const { id } = req.params;
    const plan = await SubscriptionPlan.findByPk(id);
    if (!plan) return res.status(404).json({ message: 'Plan not found' });

    await plan.update(req.body);
    return res.status(200).json({ message: 'Plan updated successfully', plan });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to update plan', error: err.message });
  }
};

// ✅ DELETE /api/admin/subscriptions/plans/:id
export const deleteSubscriptionPlan = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await SubscriptionPlan.destroy({ where: { id } });
    if (!deleted) return res.status(404).json({ message: 'Plan not found' });

    return res.status(200).json({ message: 'Plan deleted successfully' });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to delete plan', error: err.message });
  }
};

// ✅ GET /api/admin/subscriptions/plans
export const getAllSubscriptionPlans = async (req, res) => {
  try {
    const plans = await SubscriptionPlan.findAll({
      order: [['price', 'ASC']]
    });

    return res.status(200).json({ plans });
  } catch (error) {
    console.error('Failed to fetch subscription plans:', error);
    return res.status(500).json({
      message: 'Failed to fetch subscription plans',
      error: error.message
    });
  }
};
