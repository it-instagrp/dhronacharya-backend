import db from '../models/index.js';

const { UserSubscription, SubscriptionPlan, User, Tutor, Student } = db;

// GET /api/admin/subscriptions
export const getAllSubscriptions = async (req, res) => {
  try {
    const subscriptions = await UserSubscription.findAll({
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

// Create
export const createSubscriptionPlan = async (req, res) => {
  const { plan_name, price, duration_days, contact_limit, plan_type, features, user_type } = req.body;

  if (!plan_name || !price || !duration_days) {
    return res.status(400).json({ message: 'plan_name, price, and duration_days are required' });
  }

  try {
    const plan = await db.SubscriptionPlan.create({
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

// Update
export const updateSubscriptionPlan = async (req, res) => {
  try {
    const { id } = req.params;
    const plan = await db.SubscriptionPlan.findByPk(id);
    if (!plan) return res.status(404).json({ message: 'Plan not found' });

    await plan.update(req.body);
    return res.status(200).json({ message: 'Plan updated successfully', plan });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to update plan', error: err.message });
  }
};

// Delete
export const deleteSubscriptionPlan = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await db.SubscriptionPlan.destroy({ where: { id } });
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
