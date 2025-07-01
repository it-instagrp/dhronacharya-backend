// src/models/index.js
import sequelize from '../config/database.js';
import User from './user.js';
import Admin from './admin.js';
import Tutor from './tutor.js';
import Student from './student.js';
import SubscriptionPlan from './subscriptionPlan.js';
import Payment from './payment.js';
import UserSubscription from './userSubscription.js';
import Coupon from './coupon.js';
import Notification from './notification.js';
import Location from './Location.js';
import Enquiry from './enquiry.js';
import ClassSchedule from './classSchedule.js';


const db = {};
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

db.Location = Location;

db.Tutor.belongsTo(db.Location, { foreignKey: 'location_id' });
db.Student.belongsTo(db.Location, { foreignKey: 'location_id' });
db.Enquiry = Enquiry;

db.User.hasMany(Enquiry, { foreignKey: 'sender_id', as: 'SentEnquiries' });
db.User.hasMany(Enquiry, { foreignKey: 'receiver_id', as: 'ReceivedEnquiries' });

Enquiry.belongsTo(db.User, { foreignKey: 'sender_id', as: 'Sender' });
Enquiry.belongsTo(db.User, { foreignKey: 'receiver_id', as: 'Receiver' });
 //class schedules 
db.ClassSchedule = ClassSchedule;

db.User.hasMany(ClassSchedule, { foreignKey: 'tutor_id', as: 'TutorClasses' });
db.User.hasMany(ClassSchedule, { foreignKey: 'student_id', as: 'StudentClasses' });

ClassSchedule.belongsTo(db.User, { foreignKey: 'tutor_id', as: 'Tutor' });
ClassSchedule.belongsTo(db.User, { foreignKey: 'student_id', as: 'Student' });

sequelize.sync().then(()=>console.log("Model Synced"));

export default db;