// controllers/invoice.controller.js
import db from '../models/index.js';
import PDFDocument from 'pdfkit';
import { Parser } from 'json2csv';
import { Op } from 'sequelize';

// ---------------- Helper: Calculate invoice amounts ----------------
function calculateInvoiceAmounts(payment) {
  const gstRate = Number(payment.tax_percentage) || 18;
  const amount = Number(payment.amount);

  const gstAmount =
    payment.tax_amount != null
      ? Number(payment.tax_amount)
      : amount - amount / (1 + gstRate / 100);

  const baseAmount =
    payment.SubscriptionPlan?.price != null
      ? Number(payment.SubscriptionPlan.price)
      : amount - gstAmount;

  return { gstRate, amount, gstAmount, baseAmount };
}

// ---------------- Helper: Format date to India timezone ----------------
function formatIndiaDate(date) {
  if (!date) return 'N/A';
  try {
    return new Date(date).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  } catch {
    return String(date);
  }
}

// ---------------- Helper: Fetch subscription details ----------------
async function fetchSubscriptionDetailsForPayment(payment) {
  const subscription = await db.UserSubscription.findOne({
    where: { payment_id: payment.id },
    order: [['createdAt', 'DESC']],
  });

  if (!subscription) {
    const fallback = payment.user_id
      ? await db.UserSubscription.findOne({
          where: { user_id: payment.user_id },
          order: [['createdAt', 'DESC']],
        })
      : null;

    return {
      contacts_remaining: fallback ? fallback.contacts_remaining : 0,
      carried_from_old: 0,
      stacked: false,
      previous_end_date: null,
      start_date: fallback ? fallback.start_date : null,
      end_date: fallback ? fallback.end_date : null,
    };
  }

  const previousSub = await db.UserSubscription.findOne({
    where: {
      user_id: subscription.user_id,
      id: { [Op.ne]: subscription.id },
      createdAt: { [Op.lt]: subscription.createdAt },
    },
    order: [['createdAt', 'DESC']],
  });

  const currentContacts = Number(subscription.contacts_remaining || 0);
  const carried_from_old = previousSub ? Number(previousSub.contacts_remaining || 0) : 0;
  const stacked = !!previousSub;

  return {
    contacts_remaining: currentContacts,
    carried_from_old,
    stacked,
    previous_end_date: previousSub ? previousSub.end_date : null,
    start_date: subscription.start_date,
    end_date: subscription.end_date,
  };
}

// ---------------- Generate Invoice PDF ----------------
export const generateInvoice = async (req, res) => {
  const { payment_id } = req.params;

  try {
    const payment = await db.Payment.findByPk(payment_id, {
      attributes: [
        'id',
        'amount',
        'tax_percentage',
        'tax_amount',
        'discount_amount',
        'coupon_code',
        'razorpay_payment_id',
        'createdAt',
        'user_id',
        'payment_gateway_response',
      ],
      include: [
        { model: db.User, attributes: ['id', 'name', 'email', 'mobile_number', 'role'] },
        { model: db.SubscriptionPlan, attributes: ['plan_name', 'price'] },
      ],
    });

    if (!payment) return res.status(404).json({ message: 'Payment not found' });

    const {
      contacts_remaining,
      carried_from_old,
      stacked,
      previous_end_date,
      start_date,
      end_date,
    } = await fetchSubscriptionDetailsForPayment(payment);

    const { gstRate, amount, gstAmount, baseAmount } = calculateInvoiceAmounts(payment);
    const discountAmount =
      payment.discount_amount != null
        ? Number(payment.discount_amount)
        : Number(payment.payment_gateway_response?.discount_amount || 0);
    const couponCode =
      payment.coupon_code || payment.payment_gateway_response?.coupon_code || '—';
    const finalAmount = amount - discountAmount;

    // PDF Generation
    const doc = new PDFDocument({ margin: 40 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename=invoice_${payment_id}.pdf`);
    doc.pipe(res);

    doc.fontSize(16).text('Payment Invoice', { align: 'center' }).moveDown(1);
    doc.fontSize(11).text(`Invoice ID: ${payment.id}`);
    doc.text(`Date: ${formatIndiaDate(payment.createdAt)}`);
    doc.text(`User Name: ${payment.User?.name || 'N/A'}`);
    doc.text(`User Email: ${payment.User?.email || 'N/A'}`);
    doc.text(`User Mobile: ${payment.User?.mobile_number || 'N/A'}`);
    doc.text(`Role: ${payment.User?.role || 'N/A'}`);
    doc.text(`Plan: ${payment.SubscriptionPlan?.plan_name || 'N/A'}`);

    doc.moveDown(0.5);
    doc.text(`Base Amount: ₹${baseAmount.toFixed(2)}`);
    doc.text(`GST (${gstRate}%): ₹${gstAmount.toFixed(2)}`);
    doc.text(`Discount (${couponCode}): ₹${discountAmount.toFixed(2)}`);
    doc.text(`Final Amount: ₹${finalAmount.toFixed(2)}`);
    doc.moveDown(0.5);
    doc.text(`Razorpay Payment ID: ${payment.razorpay_payment_id}`);
    doc.moveDown(0.5);

    doc.text('Subscription Details:', { underline: true });
    doc.text(`Contacts Remaining: ${contacts_remaining}`);
    doc.text(`Carried From Old: ${carried_from_old}`);
    doc.text(`Stacked: ${stacked ? 'Yes' : 'No'}`);
    doc.text(`Previous End Date: ${previous_end_date ? formatIndiaDate(previous_end_date) : 'N/A'}`);
    doc.text(`Start Date: ${start_date ? formatIndiaDate(start_date) : 'N/A'}`);
    doc.text(`End Date: ${end_date ? formatIndiaDate(end_date) : 'N/A'}`);

    doc.moveDown(1);
    doc.text('Thank you for your purchase!', { align: 'center' });

    doc.end();
  } catch (error) {
    console.error('generateInvoice error:', error);
    res.status(500).json({ message: 'Failed to generate invoice', error: error.message });
  }
};

// ---------------- Get My Invoices ----------------
export const getMyInvoices = async (req, res) => {
  const userId = req.user.id;

  try {
    const payments = await db.Payment.findAll({
      where: { user_id: userId, status: 'paid' },
      attributes: [
        'id',
        'amount',
        'tax_percentage',
        'tax_amount',
        'discount_amount',
        'coupon_code',
        'razorpay_payment_id',
        'payment_gateway_response',
        'createdAt',
        'user_id',
      ],
      include: [
        { model: db.User, attributes: ['name', 'email', 'mobile_number'] },
        { model: db.SubscriptionPlan, attributes: ['plan_name', 'price'] },
      ],
      order: [['createdAt', 'DESC']],
    });

    const formatted = await Promise.all(
      payments.map(async (p) => {
        const { gstRate, amount, gstAmount, baseAmount } = calculateInvoiceAmounts(p);
        const discount_amount =
          p.discount_amount !== null
            ? Number(p.discount_amount)
            : Number(p.payment_gateway_response?.discount_amount || 0);
        const coupon_code = p.coupon_code || p.payment_gateway_response?.coupon_code || '—';
        const final_amount = amount - discount_amount;

        const {
          contacts_remaining,
          carried_from_old,
          stacked,
          previous_end_date,
          start_date,
          end_date,
        } = await fetchSubscriptionDetailsForPayment(p);

        return {
          payment_id: p.id,
          plan_name: p.SubscriptionPlan?.plan_name,
          base_amount: baseAmount.toFixed(2),
          gst_percentage: gstRate,
          gst_amount: gstAmount.toFixed(2),
          discount_amount: discount_amount.toFixed(2),
          coupon_code,
          total_amount: amount.toFixed(2),
          final_amount: final_amount.toFixed(2),
          date: p.createdAt ? formatIndiaDate(p.createdAt) : 'N/A',
          razorpay_payment_id: p.razorpay_payment_id,
          invoice_url: `/api/invoices/${p.id}/pdf`,

          user_name: p.User?.name,
          user_email: p.User?.email,
          user_mobile: p.User?.mobile_number,

          contacts_remaining,
          carried_from_old,
          stacked,
          previous_end_date: previous_end_date ? formatIndiaDate(previous_end_date) : null,
          start_date: start_date ? formatIndiaDate(start_date) : null,
          end_date: end_date ? formatIndiaDate(end_date) : null,
        };
      })
    );

    res.json({ invoices: formatted });
  } catch (err) {
    console.error('getMyInvoices error:', err);
    res.status(500).json({ message: 'Failed to fetch invoices', error: err.message });
  }
};

// ---------------- Admin: All Invoices ----------------
export const getAllInvoicesForAdmin = async (req, res) => {
  try {
    const payments = await db.Payment.findAll({
      where: { status: 'paid' },
      attributes: [
        'id',
        'user_id',
        'amount',
        'tax_percentage',
        'tax_amount',
        'discount_amount',
        'coupon_code',
        'razorpay_payment_id',
        'createdAt',
      ],
      include: [
        {
          model: db.User,
          attributes: ['id', 'name', 'email', 'mobile_number', 'role'],
          include: [
            { model: db.Tutor, attributes: ['name'] },
            { model: db.Student, attributes: ['name'] },
          ],
        },
        { model: db.SubscriptionPlan, attributes: ['plan_name', 'price'] },
      ],
      order: [['createdAt', 'DESC']],
    });

    const formatted = await Promise.all(
      payments.map(async (p) => {
        const { gstRate, amount, gstAmount, baseAmount } = calculateInvoiceAmounts(p);
        const discount_amount = Number(p.discount_amount || 0);
        const coupon_code = p.coupon_code || '—';
        const final_amount = amount - discount_amount;

        const {
          contacts_remaining,
          carried_from_old,
          stacked,
          previous_end_date,
          start_date,
          end_date,
        } = await fetchSubscriptionDetailsForPayment(p);

        return {
          invoice_id: p.id,
          user_name: p.User?.Tutor?.name || p.User?.Student?.name || p.User?.name || 'Unnamed',
          user_email: p.User?.email,
          user_mobile: p.User?.mobile_number,
          role: p.User?.role,
          plan_name: p.SubscriptionPlan?.plan_name,
          base_amount: baseAmount.toFixed(2),
          gst_percentage: gstRate,
          gst_amount: gstAmount.toFixed(2),
          discount_amount: discount_amount.toFixed(2),
          coupon_code,
          total_amount: amount.toFixed(2),
          final_amount: final_amount.toFixed(2),
          date: p.createdAt ? formatIndiaDate(p.createdAt) : null,
          razorpay_payment_id: p.razorpay_payment_id,
          invoice_url: `/api/invoices/${p.id}/pdf`,

          contacts_remaining,
          carried_from_old,
          stacked,
          previous_end_date: previous_end_date ? formatIndiaDate(previous_end_date) : null,
          start_date: start_date ? formatIndiaDate(start_date) : null,
          end_date: end_date ? formatIndiaDate(end_date) : null,
        };
      })
    );

    res.json({ invoices: formatted });
  } catch (error) {
    console.error('getAllInvoicesForAdmin error:', error);
    res.status(500).json({ message: 'Failed to fetch invoices', error: error.message });
  }
};

// ---------------- Admin: Export CSV ----------------
export const exportAllInvoicesCSV = async (req, res) => {
  try {
    const payments = await db.Payment.findAll({
      where: { status: 'paid' },
      attributes: [
        'id',
        'user_id',
        'amount',
        'tax_percentage',
        'tax_amount',
        'discount_amount',
        'coupon_code',
        'razorpay_payment_id',
        'createdAt',
      ],
      include: [
        {
          model: db.User,
          attributes: ['name', 'email', 'mobile_number', 'role'],
          include: [
            { model: db.Tutor, attributes: ['name'] },
            { model: db.Student, attributes: ['name'] },
          ],
        },
        { model: db.SubscriptionPlan, attributes: ['plan_name', 'price'] },
      ],
      order: [['createdAt', 'DESC']],
    });

    const data = await Promise.all(
      payments.map(async (p) => {
        const { gstRate, amount, gstAmount, baseAmount } = calculateInvoiceAmounts(p);
        const discount_amount = Number(p.discount_amount || 0);
        const coupon_code = p.coupon_code || '—';
        const final_amount = amount - discount_amount;

        const {
          contacts_remaining,
          carried_from_old,
          stacked,
          previous_end_date,
          start_date,
          end_date,
        } = await fetchSubscriptionDetailsForPayment(p);

        return {
          invoice_id: p.id,
          user_name: p.User?.Tutor?.name || p.User?.Student?.name || p.User?.name || 'Unnamed',
          email: p.User?.email,
          mobile: p.User?.mobile_number,
          role: p.User?.role,
          plan: p.SubscriptionPlan?.plan_name,
          base_amount: baseAmount.toFixed(2),
          gst_percentage: gstRate,
          gst_amount: gstAmount.toFixed(2),
          discount_amount: discount_amount.toFixed(2),
          coupon_code,
          total_amount: amount.toFixed(2),
          final_amount: final_amount.toFixed(2),
          date: p.createdAt ? formatIndiaDate(p.createdAt) : null,
          razorpay_payment_id: p.razorpay_payment_id,

          contacts_remaining,
          carried_from_old,
          stacked,
          previous_end_date: previous_end_date ? formatIndiaDate(previous_end_date) : null,
          start_date: start_date ? formatIndiaDate(start_date) : null,
          end_date: end_date ? formatIndiaDate(end_date) : null,
        };
      })
    );

    const fields = [
      'invoice_id',
      'user_name',
      'email',
      'mobile',
      'role',
      'plan',
      'base_amount',
      'gst_percentage',
      'gst_amount',
      'discount_amount',
      'coupon_code',
      'total_amount',
      'final_amount',
      'contacts_remaining',
      'carried_from_old',
      'stacked',
      'previous_end_date',
      'start_date',
      'end_date',
      'date',
      'razorpay_payment_id',
    ];

    const parser = new Parser({ fields });
    const csv = parser.parse(data);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=invoices.csv');
    res.status(200).end(csv);
  } catch (error) {
    console.error('exportAllInvoicesCSV error:', error);
    res.status(500).json({ message: 'Failed to export invoice CSV', error: error.message });
  }
};
