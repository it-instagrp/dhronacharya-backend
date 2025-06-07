import Razorpay from 'razorpay';
import db from '../models/index.js';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

export const createOrder = async (req, res) => {
  const { user_id, plan_id, coupon_code } = req.body;

  try {
    // Fetch plan
    const plan = await db.SubscriptionPlan.findByPk(plan_id);
    if (!plan) return res.status(404).json({ message: 'Subscription plan not found' });

    let amount = parseFloat(plan.price) * 100; // Razorpay expects amount in paise

    // Apply coupon if exists and valid
    if (coupon_code) {
      const coupon = await db.Coupon.findOne({
        where: {
          code: coupon_code,
          is_active: true,
          expiry_date: { [db.Sequelize.Op.gte]: new Date() }
        }
      });

      if (coupon) {
        if (coupon.max_uses && coupon.uses_count >= coupon.max_uses) {
          return res.status(400).json({ message: 'Coupon usage limit reached' });
        }

        if (coupon.discount_type === 'percentage') {
          amount = amount - (amount * parseFloat(coupon.discount_value) / 100);
        } else if (coupon.discount_type === 'fixed') {
          amount = amount - (parseFloat(coupon.discount_value) * 100);
        }

        // Prevent negative price
        amount = Math.max(amount, 0);

        // Increase coupon usage count (you might do this on successful payment instead)
        await coupon.increment('uses_count');
      } else {
        return res.status(400).json({ message: 'Invalid or expired coupon' });
      }
    }

    // Create razorpay order
    const options = {
      amount: Math.round(amount), // amount in paise
      currency: 'INR',
      receipt: `receipt_${user_id}_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);

    // Create payment record with status pending
    const payment = await db.Payment.create({
      user_id,
      plan_id,
      razorpay_order_id: order.id,
      amount: amount / 100,
      currency: 'INR',
      status: 'created',
    });

    res.json({ order_id: order.id, amount: amount / 100, currency: 'INR', payment_id: payment.id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error creating order', error: error.message });
  }
};

// To be called after successful payment, from webhook or frontend callback
export const verifyPayment = async (req, res) => {
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
  } = req.body;

  // Verify signature (implement signature verification as per Razorpay docs)

  try {
    // Find payment record
    const payment = await db.Payment.findOne({ where: { razorpay_order_id } });
    if (!payment) return res.status(404).json({ message: 'Payment not found' });

    // Update payment status
    payment.razorpay_payment_id = razorpay_payment_id;
    payment.status = 'paid';
    payment.payment_gateway_response = req.body;
    await payment.save();

    // Create user subscription
    const plan = await db.SubscriptionPlan.findByPk(payment.plan_id);
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(startDate.getDate() + plan.duration_days);

    await db.UserSubscription.create({
      user_id: payment.user_id,
      plan_id: plan.id,
      payment_id: payment.id,
      start_date: startDate,
      end_date: endDate,
      contacts_remaining: plan.contact_limit,
      is_active: true,
    });

    res.json({ message: 'Payment verified and subscription activated' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Payment verification failed', error: error.message });
  }
};
