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
