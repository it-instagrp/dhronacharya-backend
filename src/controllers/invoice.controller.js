import db from '../models/index.js';
import PDFDocument from 'pdfkit';
import { Parser } from 'json2csv';

// Helper function to calculate invoice amounts
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

// Generate single invoice PDF
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
        'created_at'
      ],
      include: [
        { model: db.User, attributes: ['name', 'email', 'mobile_number', 'role'] },
        { model: db.SubscriptionPlan, attributes: ['plan_name', 'price'] }
      ]
    });

    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    const { gstRate, amount, gstAmount, baseAmount } =
      calculateInvoiceAmounts(payment);

    const discountAmount = Number(payment.discount_amount || 0);
    const couponCode = payment.coupon_code || '—';
    const finalAmount = amount - discountAmount;

    const doc = new PDFDocument();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename=invoice_${payment_id}.pdf`
    );
    doc.pipe(res);

    doc.fontSize(16).text('Payment Invoice', { align: 'center' }).moveDown();
    doc.fontSize(12).text(`Invoice ID: ${payment.id}`);
    doc.text(
      `Date: ${new Date(payment.created_at).toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata'
      })}`
    );
    doc.text(`User Name: ${payment.User.name}`);
    doc.text(`User Email: ${payment.User.email}`);
    doc.text(`User Mobile: ${payment.User.mobile_number}`);
    doc.text(`Role: ${payment.User.role}`);
    doc.text(`Plan: ${payment.SubscriptionPlan.plan_name}`);

    doc.moveDown();
    doc.text(`Base Amount: ₹${baseAmount.toFixed(2)}`);
    doc.text(`GST (${gstRate}%): ₹${gstAmount.toFixed(2)}`);
    doc.text(`Discount (${couponCode}): ₹${discountAmount.toFixed(2)}`);
    doc.text(`Final Amount: ₹${finalAmount.toFixed(2)}`);

    doc.moveDown();
    doc.text(`Razorpay Payment ID: ${payment.razorpay_payment_id}`);
    doc.end();
  } catch (error) {
    res
      .status(500)
      .json({ message: 'Failed to generate invoice', error: error.message });
  }
};

// Get logged-in user's invoices
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
        'created_at'
      ],
      include: [
        { model: db.User, attributes: ['name', 'email', 'mobile_number'] },
        { model: db.SubscriptionPlan, attributes: ['plan_name', 'price'] }
      ],
      order: [['created_at', 'DESC']]
    });

    const formatted = payments.map(p => {
      const { gstRate, amount, gstAmount, baseAmount } = calculateInvoiceAmounts(p);

      // ✅ Properly extract discount and coupon
      const discount_amount =
        p.discount_amount !== null
          ? Number(p.discount_amount)
          : Number(p.payment_gateway_response?.discount_amount || 0);

      const coupon_code = p.coupon_code || p.payment_gateway_response?.coupon_code || '—';
      const final_amount = amount - discount_amount;

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
        date: p.getDataValue('created_at')
          ? new Date(p.getDataValue('created_at')).toLocaleString('en-IN', {
              timeZone: 'Asia/Kolkata'
            })
          : 'N/A',
        razorpay_payment_id: p.razorpay_payment_id,
        invoice_url: `/api/invoices/${p.id}/pdf`,
        user_name: p.User?.name,
        user_email: p.User?.email,
        user_mobile: p.User?.mobile_number
      };
    });

    res.json({ invoices: formatted });
  } catch (err) {
    res.status(500).json({
      message: 'Failed to fetch invoices',
      error: err.message
    });
  }
};

// Admin: Get all invoices
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
        'created_at'
      ],
      include: [
        {
          model: db.User,
          attributes: ['id', 'name', 'email', 'mobile_number', 'role'],
          include: [
            { model: db.Tutor, attributes: ['name'] },
            { model: db.Student, attributes: ['name'] }
          ]
        },
        { model: db.SubscriptionPlan, attributes: ['plan_name', 'price'] }
      ],
      order: [['created_at', 'DESC']]
    });

    const formatted = payments.map(p => {
      const { gstRate, amount, gstAmount, baseAmount } = calculateInvoiceAmounts(p);

      const discount_amount = Number(p.discount_amount || 0);
      const coupon_code = p.coupon_code || '—';
      const final_amount = amount - discount_amount;

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
        date: p.created_at
          ? new Date(p.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
          : 'N/A',
        razorpay_payment_id: p.razorpay_payment_id,
        invoice_url: `/api/invoices/${p.id}/pdf`
      };
    });

    res.json({ invoices: formatted });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch invoices', error: error.message });
  }
};

// Admin: Export all invoices to CSV
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
        'created_at'
      ],
      include: [
        {
          model: db.User,
          attributes: ['name', 'email', 'mobile_number', 'role'],
          include: [
            { model: db.Tutor, attributes: ['name'] },
            { model: db.Student, attributes: ['name'] }
          ]
        },
        { model: db.SubscriptionPlan, attributes: ['plan_name', 'price'] }
      ],
      order: [['created_at', 'DESC']]
    });

    const data = payments.map(p => {
      const { gstRate, amount, gstAmount, baseAmount } = calculateInvoiceAmounts(p);

      const discount_amount = Number(p.discount_amount || 0);
      const coupon_code = p.coupon_code || '—';
      const final_amount = amount - discount_amount;

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
        date: p.getDataValue('created_at')
          ? new Date(p.getDataValue('created_at')).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
          : 'N/A',
        razorpay_payment_id: p.razorpay_payment_id
      };
    });

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
      'date',
      'razorpay_payment_id'
    ];

    const parser = new Parser({ fields });
    const csv = parser.parse(data);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=invoices.csv');
    res.status(200).end(csv);
  } catch (error) {
    res.status(500).json({ message: 'Failed to export invoice CSV', error: error.message });
  }
};
