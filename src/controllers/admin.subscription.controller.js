import db from '../models/index.js';
import { Op } from 'sequelize';

const { UserSubscription, SubscriptionPlan, User, Tutor, Student } = db;

// GET /api/admin/subscriptions?role=tutor|student
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

// GET /api/admin/subscriptions/unsubscribed?role=tutor|student
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

// POST /api/admin/subscriptions/plans
export const createSubscriptionPlan = async (req, res) => {
  const { plan_name, price, duration_days, contact_limit, plan_type, features, user_type } = req.body;

  // Required fields
  if (!plan_name || price == null || !duration_days || !user_type) {
    return res.status(400).json({ message: 'plan_name, price, duration_days, and user_type are required' });
  }

  // Negative value checks
  if (price < 0 || duration_days <= 0 || (contact_limit != null && contact_limit < 0)) {
    return res.status(400).json({ message: 'Price, duration_days, and contact_limit must be positive values' });
  }

  try {
    // Check duplicate plan name for same user_type
    const existing = await SubscriptionPlan.findOne({
      where: { plan_name, user_type }
    });

    if (existing) {
      return res.status(400).json({ message: `Plan '${plan_name}' already exists for ${user_type}` });
    }

    // Create plan
    const plan = await SubscriptionPlan.create({
      plan_name,
      price,
      duration_days,
      contact_limit,
      plan_type,
      features,
      user_type,
    });

    return res.status(201).json({ message: 'Plan created successfully', plan });

  } catch (err) {
    return res.status(500).json({ message: 'Failed to create plan', error: err.message });
  }
};

// PUT /api/admin/subscriptions/plans/:id
export const updateSubscriptionPlan = async (req, res) => {
  try {
    const { id } = req.params;
    const { plan_name, price, duration_days, contact_limit, user_type } = req.body;

    const plan = await SubscriptionPlan.findByPk(id);
    if (!plan) return res.status(404).json({ message: 'Plan not found' });

    // Negative value checks
    if (price != null && price < 0) {
      return res.status(400).json({ message: 'Price must be positive' });
    }
    if (duration_days != null && duration_days <= 0) {
      return res.status(400).json({ message: 'duration_days must be greater than 0' });
    }
    if (contact_limit != null && contact_limit < 0) {
      return res.status(400).json({ message: 'contact_limit must be positive' });
    }

    // Check duplicate plan name (EXCLUDING current plan)
    if (plan_name || user_type) {
      const existing = await SubscriptionPlan.findOne({
        where: {
          plan_name: plan_name || plan.plan_name,
          user_type: user_type || plan.user_type,
          id: { [Op.ne]: id }
        }
      });

      if (existing) {
        return res.status(400).json({ message: `Plan '${plan_name}' already exists for this user type` });
      }
    }

    await plan.update(req.body);

    return res.status(200).json({ message: 'Plan updated successfully', plan });

  } catch (err) {
    return res.status(500).json({ message: 'Failed to update plan', error: err.message });
  }
};


// DELETE /api/admin/subscriptions/plans/:id
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

// GET /api/admin/subscriptions/plans
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
