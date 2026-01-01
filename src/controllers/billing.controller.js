// src/controllers/billing.controller.js
import db from "../models/index.js";

// Helper: format date to India timezone
function formatIndiaDate(date) {
  if (!date) return 'N/A';
  try {
    return new Date(date).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  } catch {
    return String(date);
  }
}

// Helper: Generate invoice number on the fly
function generateInvoiceNumber(paymentId) {
  return `DRONA-${paymentId}`;
}

export const getBillingHistory = async (req, res) => {
  const userId = req.user.id;

  try {
    const subscriptions = await db.UserSubscription.findAll({
      where: { user_id: userId },
      include: [
        { model: db.SubscriptionPlan },
        { model: db.Payment }
      ],
      order: [["createdAt", "DESC"]]
    });

    if (!subscriptions || subscriptions.length === 0) {
      return res.status(404).json({ message: "No subscriptions found" });
    }

    const billingHistory = subscriptions
      .map(subscription => {
        const plan = subscription.SubscriptionPlan;
        const payment = subscription.Payment;

        if (!plan || !payment) return null;

        // Generate invoice number
        const invoiceNumber = generateInvoiceNumber(payment.id);
        
        // Extract CGST/SGST from payment_gateway_response or calculate
        const paymentResponse = payment.payment_gateway_response || {};
        const cgstPercentage = paymentResponse.cgst_percentage || 9;
        const sgstPercentage = paymentResponse.sgst_percentage || 9;
        let cgstAmount = paymentResponse.cgst_amount;
        let sgstAmount = paymentResponse.sgst_amount;
        
        // If not stored in JSON, calculate from tax_amount
        if (!cgstAmount || !sgstAmount) {
          const taxAmount = Number(payment.tax_amount) || 0;
          cgstAmount = taxAmount / 2;
          sgstAmount = taxAmount / 2;
        }

        return {
          plan: {
            id: plan.id,
            plan_name: plan.plan_name,
            price: parseFloat(plan.price).toFixed(2),
            duration_days: plan.duration_days,
            contact_limit: plan.contact_limit,
            plan_type: plan.plan_type,
            features: plan.features,
            user_type: plan.user_type,
            created_at: formatIndiaDate(plan.createdAt),
            updated_at: formatIndiaDate(plan.updatedAt)
          },

          subscription: {
            id: subscription.id,
            start_date: formatIndiaDate(subscription.start_date),
            end_date: formatIndiaDate(subscription.end_date),
            is_active: subscription.is_active,
            contacts_remaining: subscription.contacts_remaining,
          },

          payment: {
            id: payment.id,
            invoice_number: invoiceNumber,
            razorpay_order_id: payment.razorpay_order_id,
            razorpay_payment_id: payment.razorpay_payment_id,

            base_amount: Number(payment.base_amount).toFixed(2),
            cgst_percentage: cgstPercentage,
            cgst_amount: Number(cgstAmount).toFixed(2),
            sgst_percentage: sgstPercentage,
            sgst_amount: Number(sgstAmount).toFixed(2),
            total_tax: (Number(cgstAmount) + Number(sgstAmount)).toFixed(2),
            discount_amount: Number(payment.discount_amount).toFixed(2),
            final_amount: Number(payment.amount).toFixed(2),

            coupon_code: payment.coupon_code || '—',
            coupon_type: payment.coupon_type || '—',

            currency: payment.currency,
            status: payment.status,
            paid_at: formatIndiaDate(payment.paid_at || payment.createdAt),
          },

          purchase_date: formatIndiaDate(payment.createdAt)
        };
      })
      .filter(Boolean);

    return res.status(200).json({
      message: "Billing history fetched successfully",
      history: billingHistory
    });

  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch billing history",
      error: error.message
    });
  }
};
