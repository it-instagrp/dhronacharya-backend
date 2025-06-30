import Razorpay from 'razorpay';
import { v4 as uuidv4 } from 'uuid';
import db from '../models/index.js';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ------------------------
// Create Razorpay Order
// ------------------------
export const createOrder = async (req, res) => {
  const { user_id, plan_id } = req.body;

  try {
    console.log('📥 Create Order Request:', { user_id, plan_id });

    const plan = await db.SubscriptionPlan.findByPk(plan_id);
    if (!plan) {
      console.log('❌ Plan not found!');
      return res.status(404).json({ message: 'Plan not found' });
    }

    const amount = parseFloat(plan.price) * 100;

    // ✅ Fix: Razorpay receipt max length = 40 characters
    const shortReceipt = `rcpt_${Date.now()}_${user_id.slice(0, 6)}`.slice(0, 40);

    const order = await razorpay.orders.create({
      amount: Math.round(amount),
      currency: 'INR',
      receipt: shortReceipt,
    });

    console.log('✅ Razorpay Order Created:', order.id);

    const payment = await db.Payment.create({
      user_id,
      plan_id,
      razorpay_order_id: order.id,
      amount: amount / 100,
      currency: 'INR',
      status: 'created',
    });

    console.log('✅ Payment record created:', payment.id);

    res.json({
      order_id: order.id,
      amount: amount / 100,
      currency: 'INR',
      payment_id: payment.id,
    });

  } catch (err) {
    console.error('❌ Error in createOrder:', err);
    res.status(500).json({ message: 'Error creating order', error: err.message });
  }
};

// ------------------------
// Verify Razorpay Payment
// ------------------------
export const verifyPayment = async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  try {
    console.log('📥 Verifying Payment:', { razorpay_order_id });

    const payment = await db.Payment.findOne({ where: { razorpay_order_id } });
    if (!payment) {
      console.log('❌ Payment not found!');
      return res.status(404).json({ message: 'Payment not found' });
    }

    payment.razorpay_payment_id = razorpay_payment_id;
    payment.status = 'paid';
    payment.payment_gateway_response = req.body;
    await payment.save();

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

    console.log('✅ Subscription activated');

    res.json({ message: 'Payment verified and subscription activated' });

  } catch (err) {
    console.error('❌ Error in verifyPayment:', err);
    res.status(500).json({ message: 'Verification failed', error: err.message });
  }
};
