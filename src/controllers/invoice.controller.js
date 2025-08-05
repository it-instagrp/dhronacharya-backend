import db from '../models/index.js';
import PDFDocument from 'pdfkit';
import { Parser } from 'json2csv';

// 📄 Generate single invoice PDF
export const generateInvoice = async (req, res) => {
  const { payment_id } = req.params;

  try {
    const payment = await db.Payment.findByPk(payment_id, {
      attributes: ['id', 'amount', 'razorpay_payment_id', 'created_at'],
      include: [
        { model: db.User, attributes: ['email', 'mobile_number', 'role'] },
        { model: db.SubscriptionPlan, attributes: ['plan_name'] }
      ]
    });

    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    const doc = new PDFDocument();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename=invoice_${payment_id}.pdf`);
    doc.pipe(res);

    doc.fontSize(16).text('Payment Invoice', { align: 'center' }).moveDown();
    doc.fontSize(12).text(`Invoice ID: ${payment.id}`);
    doc.text(`Date: ${new Date(payment.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
    doc.text(`User Email: ${payment.User.email}`);
    doc.text(`Role: ${payment.User.role}`);
    doc.text(`Plan: ${payment.SubscriptionPlan.plan_name}`);
    doc.text(`Amount: ₹${payment.amount}`);
    doc.text(`Razorpay Payment ID: ${payment.razorpay_payment_id}`);
    doc.end();
  } catch (error) {
    res.status(500).json({ message: 'Failed to generate invoice', error: error.message });
  }
};

// 🧑‍🎓 Get my invoices (Student/Tutor)
export const getMyInvoices = async (req, res) => {
  const userId = req.user.id;

  try {
    const payments = await db.Payment.findAll({
      where: { user_id: userId, status: 'paid' },
      attributes: ['id', 'amount', 'razorpay_payment_id', 'created_at'],
      include: [{ model: db.SubscriptionPlan, attributes: ['plan_name'] }],
      order: [['created_at', 'DESC']]
    });

    const formatted = payments.map(p => ({
      payment_id: p.id,
      plan_name: p.SubscriptionPlan?.plan_name,
      amount: p.amount,
      date: p.getDataValue('created_at')
        ? new Date(p.getDataValue('created_at')).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
        : 'N/A',
      razorpay_payment_id: p.razorpay_payment_id,
      invoice_url: `/api/invoices/${p.id}/pdf`
    }));

    res.json({ invoices: formatted });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch invoices', error: err.message });
  }
};


// 👨‍💼 Admin: Get all invoices
export const getAllInvoicesForAdmin = async (req, res) => {
  try {
    const payments = await db.Payment.findAll({
      where: { status: 'paid' },
      attributes: ['id', 'user_id', 'amount', 'razorpay_payment_id', 'created_at'],
      include: [
        {
          model: db.User,
          attributes: ['id', 'email', 'role'],
          include: [
            { model: db.Tutor, attributes: ['name'] },
            { model: db.Student, attributes: ['name'] }
          ]
        },
        { model: db.SubscriptionPlan, attributes: ['plan_name'] }
      ],
      order: [['created_at', 'DESC']]
    });

    const formatted = payments.map(p => ({
      user_name: p.User?.Tutor?.name || p.User?.Student?.name || 'Unnamed',
      user_email: p.User?.email,
      role: p.User?.role,
      plan_name: p.SubscriptionPlan?.plan_name,
      amount: p.amount,
      date: p.created_at
        ? new Date(p.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
        : 'N/A',
      razorpay_payment_id: p.razorpay_payment_id,
      invoice_url: `/api/invoices/${p.id}/pdf`
    }));

    res.json({ invoices: formatted });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch invoices', error: error.message });
  }
};

// 📤 Admin: Export all invoices to CSV
export const exportAllInvoicesCSV = async (req, res) => {
  try {
    const payments = await db.Payment.findAll({
      where: { status: 'paid' },
      attributes: ['id', 'user_id', 'amount', 'razorpay_payment_id', 'created_at'],
      include: [
        {
          model: db.User,
          attributes: ['email', 'role'],
          include: [
            { model: db.Tutor, attributes: ['name'] },
            { model: db.Student, attributes: ['name'] }
          ]
        },
        { model: db.SubscriptionPlan, attributes: ['plan_name'] }
      ],
      order: [['created_at', 'DESC']]
    });

    const data = payments.map(p => ({
  invoice_id: p.id,
  user_name: p.User?.Tutor?.name || p.User?.Student?.name || 'Unnamed',
  email: p.User?.email,
  role: p.User?.role,
  plan: p.SubscriptionPlan?.plan_name,
  amount: p.amount,
  date: p.getDataValue('created_at')
    ? new Date(p.getDataValue('created_at')).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
    : 'N/A',
  razorpay_payment_id: p.razorpay_payment_id
}));


    const fields = [
      'invoice_id',
      'user_name',
      'email',
      'role',
      'plan',
      'amount',
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
