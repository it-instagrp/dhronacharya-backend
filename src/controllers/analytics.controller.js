// src/controllers/analytics.controller.js
import db from '../models/index.js';
import { Parser } from 'json2csv';
import PDFDocument from 'pdfkit';
import { Op, fn, col, literal } from 'sequelize';

const { UserSubscription, SubscriptionPlan, Payment, ReferralCode, User, ClassSchedule, Enquiry } = db;

const getDateRangeFilter = (start, end, column = 'created_at') => {
  const where = {};
  if (start && end) {
    where[column] = { [Op.between]: [new Date(start), new Date(end)] }; // ✅ fixed here
  }
  return where;
};


export const getAnalyticsSummary = async (req, res) => {
  try {
    const subscriptions = await UserSubscription.count({ where: { is_active: true } });
    const revenue = await Payment.sum('amount', { where: { status: 'paid' } });
    const referrals = await ReferralCode.count({ where: { status: 'converted' } });
    res.json({ subscriptions, revenue, referrals });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching analytics summary', error: err.message });
  }
};

export const exportSubscriptionsCSV = async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    const where = getDateRangeFilter(start_date, end_date);

    const data = await UserSubscription.findAll({
      where,
      include: [
        { model: User, attributes: ['email', 'role'] },
        { model: SubscriptionPlan, attributes: ['plan_name'] }
      ],
      raw: true,
      nest: true
    });

    const fields = ['User.email', 'User.role', 'SubscriptionPlan.plan_name', 'start_date', 'end_date', 'is_active'];
    const parser = new Parser({ fields });
    const csv = parser.parse(data);

    res.header('Content-Type', 'text/csv');
    res.attachment('subscriptions.csv');
    res.send(csv);
  } catch (err) {
    res.status(500).json({ message: 'Error exporting subscriptions CSV', error: err.message });
  }
};

export const exportRevenuePDF = async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    const where = {
      ...getDateRangeFilter(start_date, end_date),
      status: 'paid'
    };

    const payments = await Payment.findAll({
      where,
      include: [
        { model: User, attributes: ['email'] },
        { model: SubscriptionPlan, attributes: ['plan_name'] }
      ],
      order: [['created_at', 'DESC']],
      raw: true,
      nest: true
    });

    const doc = new PDFDocument();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=revenue.pdf');
    doc.pipe(res);

    doc.fontSize(16).text('Revenue Report', { align: 'center' });
    doc.moveDown();

    payments.forEach(p => {
      doc.fontSize(12).text(`User: ${p.User.email}`);
      doc.text(`Plan: ${p.SubscriptionPlan.plan_name}`);
      doc.text(`Amount: ₹${p.amount}`);
      doc.text(`Date: ${new Date(p.created_at).toLocaleString()}`);
      doc.moveDown();
    });

    doc.end();
  } catch (err) {
    res.status(500).json({ message: 'Error exporting revenue PDF', error: err.message });
  }
};

export const exportReferralsCSV = async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    const where = getDateRangeFilter(start_date, end_date);

    const data = await ReferralCode.findAll({
      where,
      include: [
        { model: User, as: 'Referrer', attributes: ['name', 'email'] },
        { model: User, as: 'Referred', attributes: ['name', 'email'], required: false }
      ],
      raw: true,
      nest: true
    });

    // Count total referred users per referral code
    const referralCounts = {};
    for (const d of data) {
     if (d.Referred?.email || d.referred_email) {
  referralCounts[d.code] = (referralCounts[d.code] || 0) + 1;
}

    }

    // Format final data for CSV (1 row per referred user)
    const formatted = data.map(d => ({
      code: d.code,
      referrerName: d.Referrer?.name || '',
      referrerEmail: d.Referrer?.email || '',
      referredName: d.Referred?.name || '',
      referredEmail: d.Referred?.email || d.referred_email || '',
      status: d.status || '',
      reward_given: d.reward_given ? 'Yes' : 'No',
      reward_type: d.reward_type || '',
      reward_value: d.reward_value || '',
      referred_at: d.referred_at
        ? new Date(d.referred_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
        : '',
      totalReferredCount: referralCounts[d.code] || 0
    }));

    const fields = [
      'code',
      'referrerName',
      'referrerEmail',
      'referredName',
      'referredEmail',
      'status',
      'reward_given',
      'reward_type',
      'reward_value',
      'referred_at',
      'totalReferredCount'
    ];

    const parser = new Parser({ fields });
    const csv = parser.parse(formatted);

    res.header('Content-Type', 'text/csv');
    res.attachment('referrals-detailed.csv');
    res.send(csv);
  } catch (err) {
    console.error('❌ Error exporting referral CSV:', err);
    res.status(500).json({ message: 'Error exporting referral CSV', error: err.message });
  }
};



export const exportClassAttendanceCSV = async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    const where = getDateRangeFilter(start_date, end_date, 'date_time');

    const data = await ClassSchedule.findAll({
      where,
      include: [
        { model: User, as: 'Tutor', attributes: ['email'] },
        { model: User, as: 'Student', attributes: ['email'] }
      ],
      raw: true,
      nest: true
    });

    const fields = ['title', 'Tutor.email', 'Student.email', 'status', 'date_time'];
    const parser = new Parser({ fields });
    const csv = parser.parse(data);

    res.header('Content-Type', 'text/csv');
    res.attachment('class_attendance.csv');
    res.send(csv);
  } catch (err) {
    res.status(500).json({ message: 'Error exporting class attendance CSV', error: err.message });
  }
};
export const exportClassAttendancePDF = async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    const where = getDateRangeFilter(start_date, end_date, 'date_time');

    const records = await ClassSchedule.findAll({
      where,
      include: [
        { model: User, as: 'Tutor', attributes: ['email'] },
        { model: User, as: 'Student', attributes: ['email'] }
      ],
      order: [['date_time', 'DESC']],
      raw: true,
      nest: true
    });

    const doc = new PDFDocument();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=class_attendance.pdf');
    doc.pipe(res);

    doc.fontSize(16).text('Class Attendance Report', { align: 'center' });
    doc.moveDown();

    records.forEach(record => {
      doc.fontSize(12).text(`Class: ${record.title}`);
      doc.text(`Tutor: ${record.Tutor?.email || 'N/A'}`);
      doc.text(`Student: ${record.Student?.email || 'N/A'}`);
      doc.text(`Status: ${record.status}`);
      doc.text(`Date & Time: ${new Date(record.date_time).toLocaleString()}`);
      doc.moveDown();
    });

    doc.end();
  } catch (err) {
    res.status(500).json({ message: 'Error exporting class attendance PDF', error: err.message });
  }
};
// 📦 Export Enquiries CSV
export const exportEnquiriesCSV = async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    const where = getDateRangeFilter(start_date, end_date);

    const data = await Enquiry.findAll({
      where,
      include: [{ model: User, as: 'Student', attributes: ['email'] }],
      raw: true,
      nest: true
    });

    const fields = ['Student.email', 'subject', 'message', 'status', 'created_at'];
    const parser = new Parser({ fields });
    const csv = parser.parse(data);

    res.header('Content-Type', 'text/csv');
    res.attachment('enquiries.csv');
    res.send(csv);
  } catch (err) {
    res.status(500).json({ message: 'Error exporting enquiries CSV', error: err.message });
  }
};

// 📄 Export Enquiries PDF
export const exportEnquiriesPDF = async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    const where = getDateRangeFilter(start_date, end_date);

    const enquiries = await Enquiry.findAll({
      where,
      include: [{ model: User, as: 'Student', attributes: ['email'] }],
      order: [['created_at', 'DESC']],
      raw: true,
      nest: true
    });

    const doc = new PDFDocument();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=enquiries.pdf');
    doc.pipe(res);

    doc.fontSize(16).text('Enquiries Report', { align: 'center' });
    doc.moveDown();

    enquiries.forEach(e => {
      doc.fontSize(12).text(`Student: ${e.Student?.email || 'N/A'}`);
      doc.text(`Subject: ${e.subject}`);
      doc.text(`Message: ${e.message}`);
      doc.text(`Status: ${e.status}`);
      doc.text(`Date: ${new Date(e.created_at).toLocaleString()}`);
      doc.moveDown();
    });

    doc.end();
  } catch (err) {
    res.status(500).json({ message: 'Error exporting enquiries PDF', error: err.message });
  }
};
export const exportUserReportCSV = async (req, res) => {
  try {
    const { role, start_date, end_date } = req.query;
    const where = {
      ...getDateRangeFilter(start_date, end_date),
      ...(role ? { role } : {}) // optional role filter
    };

    const users = await User.findAll({
      where,
      attributes: ['id', 'username', 'email', 'role', 'created_at'],
      raw: true
    });

    const fields = ['id', 'username', 'email', 'role', 'created_at'];
    const parser = new Parser({ fields });
    const csv = parser.parse(users);

    res.header('Content-Type', 'text/csv');
    res.attachment('users_report.csv');
    res.send(csv);
  } catch (err) {
    res.status(500).json({ message: 'Error exporting user report CSV', error: err.message });
  }
};
// 📄 Export Users Report PDF
export const exportUsersPDF = async (req, res) => {
  try {
    const { role, start_date, end_date } = req.query;
    const where = {
      ...getDateRangeFilter(start_date, end_date),
      ...(role ? { role } : {}) // optional filter
    };

    const users = await User.findAll({
      where,
      attributes: ['username', 'email', 'role', 'created_at'],
      order: [['created_at', 'DESC']],
      raw: true
    });

    const doc = new PDFDocument();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=users_report.pdf');
    doc.pipe(res);

    doc.fontSize(16).text('User Report', { align: 'center' });
    doc.moveDown();

    users.forEach(user => {
      doc.fontSize(12).text(`Name: ${user.username}`);
      doc.text(`Email: ${user.email}`);
      doc.text(`Role: ${user.role}`);
      doc.text(`Joined: ${new Date(user.created_at).toLocaleString()}`);
      doc.moveDown();
    });

    doc.end();
  } catch (err) {
    res.status(500).json({ message: 'Error exporting users PDF', error: err.message });
  }
};

// 📊 Get Class Attendance Chart Data (Group by Day)
export const getClassAttendanceChart = async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    const where = getDateRangeFilter(start_date, end_date, 'date_time');

    const records = await ClassSchedule.findAll({
      where,
      attributes: [
        [db.Sequelize.fn('DATE', db.Sequelize.col('date_time')), 'date'],
        [db.Sequelize.fn('COUNT', '*'), 'count']
      ],
      group: ['date'],
      order: [[db.Sequelize.literal('date'), 'ASC']],
      raw: true
    });

    const chartData = records.map(r => ({
      date: r.date,
      count: Number(r.count)
    }));

    res.json({ data: chartData });
  } catch (err) {
    res.status(500).json({ message: 'Error generating class attendance chart', error: err.message });
  }
};

// 📊 Get Enquiries Chart Data (Group by Day)
export const getEnquiriesChart = async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    const where = getDateRangeFilter(start_date, end_date);

    const records = await Enquiry.findAll({
      where,
      attributes: [
        [db.Sequelize.fn('DATE', db.Sequelize.col('created_at')), 'date'],
        [db.Sequelize.fn('COUNT', '*'), 'count']
      ],
      group: ['date'],
      order: [[db.Sequelize.literal('date'), 'ASC']],
      raw: true
    });

    const chartData = records.map(r => ({
      date: r.date,
      count: Number(r.count)
    }));

    res.json({ data: chartData });
  } catch (err) {
    res.status(500).json({ message: 'Error generating enquiries chart', error: err.message });
  }
};
// 📊 Get Users Chart Data (Group by Day)
export const getUsersChart = async (req, res) => {
  try {
    const { start_date, end_date, role } = req.query;
    const where = {
      ...getDateRangeFilter(start_date, end_date),
      ...(role ? { role } : {}) // optional role filter
    };

    const records = await User.findAll({
      where,
      attributes: [
        [db.Sequelize.fn('DATE', db.Sequelize.col('created_at')), 'date'],
        [db.Sequelize.fn('COUNT', '*'), 'count']
      ],
      group: ['date'],
      order: [[db.Sequelize.literal('date'), 'ASC']],
      raw: true
    });

    const chartData = records.map(r => ({
      date: r.date,
      count: Number(r.count)
    }));

    res.json({ data: chartData });
  } catch (err) {
    res.status(500).json({ message: 'Error generating users chart', error: err.message });
  }
};
