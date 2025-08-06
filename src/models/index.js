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
import Message from './message.js';
import Bookmark from './bookmark.js';
import Conversation from './conversation.js';
import ReferralCode from './referralCode.model.js';

const db = {};
db.sequelize = sequelize;

// Core models
db.User = User;
db.Admin = Admin;
db.Tutor = Tutor;
db.Student = Student;

// Role associations
db.User.hasOne(db.Admin, { foreignKey: 'user_id' });
db.User.hasOne(db.Tutor, { foreignKey: 'user_id' });
db.User.hasOne(db.Student, { foreignKey: 'user_id' });

db.Admin.belongsTo(db.User, { foreignKey: 'user_id' });
db.Tutor.belongsTo(db.User, { foreignKey: 'user_id' });
db.Student.belongsTo(db.User, { foreignKey: 'user_id' });

// Other models
db.SubscriptionPlan = SubscriptionPlan;
db.Payment = Payment;
db.UserSubscription = UserSubscription;
db.Coupon = Coupon;
db.Notification = Notification;
db.Location = Location;
db.Enquiry = Enquiry;
db.ClassSchedule = ClassSchedule;
db.Message = Message;
db.Bookmark = Bookmark;
db.Conversation = Conversation;

// Subscription & payment
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

// Notifications
db.User.hasMany(db.Notification, { foreignKey: 'user_id' });
db.Notification.belongsTo(db.User, { foreignKey: 'user_id' });
db.User.hasMany(db.Notification, { foreignKey: 'sent_by', as: 'SentNotifications' });
db.Notification.belongsTo(db.User, { foreignKey: 'sent_by', as: 'Sender' });


// Locations
db.Tutor.belongsTo(db.Location, { foreignKey: 'location_id' });
db.Student.belongsTo(db.Location, { foreignKey: 'location_id' });

// Enquiries
db.User.hasMany(db.Enquiry, { foreignKey: 'sender_id', as: 'SentEnquiries' });
db.User.hasMany(db.Enquiry, { foreignKey: 'receiver_id', as: 'ReceivedEnquiries' });

db.Enquiry.belongsTo(db.User, { foreignKey: 'sender_id', as: 'Sender' });
db.Enquiry.belongsTo(db.User, { foreignKey: 'receiver_id', as: 'Receiver' });

// Class schedules
db.User.hasMany(db.ClassSchedule, { foreignKey: 'tutor_id', as: 'TutorClasses' });
db.User.hasMany(db.ClassSchedule, { foreignKey: 'student_id', as: 'StudentClasses' });

db.ClassSchedule.belongsTo(db.User, { foreignKey: 'tutor_id', as: 'Tutor' });
db.ClassSchedule.belongsTo(db.User, { foreignKey: 'student_id', as: 'Student' });

// Messages (enquiry-threaded)
db.Enquiry.hasMany(db.Message, { foreignKey: 'enquiry_id', as: 'Messages' });
db.Message.belongsTo(db.Enquiry, { foreignKey: 'enquiry_id' });

db.User.hasMany(db.Message, { foreignKey: 'sender_id' });
db.Message.belongsTo(db.User, { foreignKey: 'sender_id' });

// ✅ Conversations (direct bookmark chat)
db.User.hasMany(db.Conversation, { foreignKey: 'student_id', as: 'StudentConversations' });
db.User.hasMany(db.Conversation, { foreignKey: 'tutor_id', as: 'TutorConversations' });

db.Conversation.belongsTo(db.User, { foreignKey: 'student_id', as: 'Student' });
db.Conversation.belongsTo(db.User, { foreignKey: 'tutor_id', as: 'Tutor' });

db.Conversation.hasMany(db.Message, { foreignKey: 'conversation_id', as: 'Messages' });
db.Message.belongsTo(db.Conversation, { foreignKey: 'conversation_id' });

// Bookmarks
db.User.hasMany(db.Bookmark, { foreignKey: 'user_id', as: 'Bookmarks' });
db.User.hasMany(db.Bookmark, { foreignKey: 'bookmarked_user_id', as: 'BookmarkedBy' });

db.Bookmark.belongsTo(db.User, { foreignKey: 'user_id', as: 'User' });
db.Bookmark.belongsTo(db.User, { foreignKey: 'bookmarked_user_id', as: 'BookmarkedUser' });

// referral
db.ReferralCode = ReferralCode;

// Referral Code associations
db.User.hasMany(db.ReferralCode, { foreignKey: 'referrer_user_id', as: 'ReferralCodes' });
db.User.hasMany(db.ReferralCode, { foreignKey: 'referred_user_id', as: 'ReferredBy' });

db.ReferralCode.belongsTo(db.User, { foreignKey: 'referrer_user_id', as: 'Referrer' });
db.ReferralCode.belongsTo(db.User, { foreignKey: 'referred_user_id', as: 'Referred' });

// cupons 
// Coupon associations
db.User.hasMany(db.Coupon, { foreignKey: 'applied_by_user_id', as: 'UsedCoupons' });
db.Coupon.belongsTo(db.User, { foreignKey: 'applied_by_user_id', as: 'UsedBy' });


// Sync
sequelize.sync().then(() => console.log('Models Synced'));

export default db;
