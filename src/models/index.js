// src/models/index.js
import { Sequelize } from 'sequelize';
import User from './user.js';
import Admin from './admin.js';
import Tutor from './tutor.js';
import Student from './student.js';
import SubscriptionPlan from './subscriptionPlan.js';
import Payment from './payment.js';
import UserSubscription from './userSubscription.js';
import Coupon from './coupon.js';
import Notification from './notification.js';


const sequelize = new Sequelize(
  process.env.DATABASE,
  process.env.USERNAME,
  process.env.PASSWORD,
  {
    host: process.env.HOST,
    dialect: 'postgres',
    logging: false,
  }
);

const db = {};
db.Sequelize = Sequelize;
db.sequelize = sequelize;

db.User = User;
db.Admin = Admin;
db.Tutor = Tutor;
db.Student = Student;

// Define associations
db.User.hasOne(db.Admin, { foreignKey: 'user_id' });
db.User.hasOne(db.Tutor, { foreignKey: 'user_id' });
db.User.hasOne(db.Student, { foreignKey: 'user_id' });

db.Admin.belongsTo(db.User, { foreignKey: 'user_id' });
db.Tutor.belongsTo(db.User, { foreignKey: 'user_id' });
db.Student.belongsTo(db.User, { foreignKey: 'user_id' });

// after other imports and definitions
db.SubscriptionPlan = SubscriptionPlan;
db.Payment = Payment;
db.UserSubscription = UserSubscription;
db.Coupon = Coupon;
db.Notification = Notification;

// Associations

db.User.hasMany(db.Payment, { foreignKey: 'user_id' });
db.Payment.belongsTo(db.User, { foreignKey: 'user_id' });

db.SubscriptionPlan.hasMany(db.Payment, { foreignKey: 'plan_id' });
db.Payment.belongsTo(db.SubscriptionPlan, { foreignKey: 'plan_id' });

db.User.hasMany(db.UserSubscription, { foreignKey: 'user_id' });
db.UserSubscription.belongsTo(db.User, { foreignKey: 'user_id' });

db.SubscriptionPlan.hasMany(db.UserSubscription, { foreignKey: 'plan_id' });
db.UserSubscription.belongsTo(db.SubscriptionPlan, { foreignKey: 'plan_id' });

db.Payment.hasOne(db.UserSubscription, { foreignKey: 'payment_id' });
db.UserSubscription.belongsTo(db.Payment, { foreignKey: 'payment_id' });

db.User.hasMany(db.Notification, { foreignKey: 'user_id' });
db.Notification.belongsTo(db.User, { foreignKey: 'user_id' });

db.Coupon; // standalone model, use as needed
export default db;
