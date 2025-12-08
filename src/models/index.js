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
import Group from './group.js';
import GroupMember from './groupMember.js';
import Review from './review.js';
import ReviewComment from './reviewComment.js';
import Class from './class.js';
import Subject from './subject.js';
import ContactLog from './ContactLog.js';
import UserCoupon from './userCoupon.js';
import Otp from './Otp.js';
import Blog from './blog.js';
import SuperAdmin from './superAdmin.js';




const db = {};
db.sequelize = sequelize;

// Core models
db.User = User;
db.Admin = Admin;
db.Tutor = Tutor;
db.Student = Student;
db.Class = Class;
db.Subject = Subject;
db.ContactLog = ContactLog;
db.SuperAdmin = SuperAdmin; //super admin

// Role associations
db.User.hasOne(db.Admin, { foreignKey: 'user_id', onDelete: 'CASCADE' });
db.User.hasOne(db.Tutor, { foreignKey: 'user_id', onDelete: 'CASCADE' });
db.User.hasOne(db.Student, { foreignKey: 'user_id', onDelete: 'CASCADE' });

db.Admin.belongsTo(db.User, { foreignKey: 'user_id', onDelete: 'CASCADE' });
db.Tutor.belongsTo(db.User, { foreignKey: 'user_id', onDelete: 'CASCADE' });
db.Student.belongsTo(db.User, { foreignKey: 'user_id', onDelete: 'CASCADE' });
//super admin 
db.User.hasOne(db.SuperAdmin, { foreignKey: 'user_id', onDelete: 'CASCADE' });
db.SuperAdmin.belongsTo(db.User, { foreignKey: 'user_id', onDelete: 'CASCADE' });


// Other models
db.SubscriptionPlan = SubscriptionPlan;
db.Payment = Payment;
db.UserSubscription = UserSubscription;
db.Coupon = Coupon;
db.Notification = Notification;
db.Location = Location;
db.Enquiry = Enquiry;
db.ClassSchedule = ClassSchedule;
db.Group = Group;
db.GroupMember = GroupMember;//class schedule new groups
db.Message = Message;
db.Bookmark = Bookmark;
db.Conversation = Conversation;
db.Review = Review;
db.ReviewComment = ReviewComment;
db.UserCoupon = UserCoupon;


// ContactLog → UserSubscription relationship
db.UserSubscription.hasMany(db.ContactLog, { 
  foreignKey: 'subscription_id', 
  onDelete: 'CASCADE' 
});

db.ContactLog.belongsTo(db.UserSubscription, { 
  foreignKey: 'subscription_id' 
});

db.Blog = Blog;//blogs


db.Class.hasMany(db.Subject, { foreignKey: 'class_id', as: 'subjects',onDelete: 'CASCADE' });
db.Subject.belongsTo(db.Class, { foreignKey: 'class_id', as: 'class',onDelete: 'CASCADE' });

// Subscription & payment
db.User.hasMany(db.Payment, { foreignKey: 'user_id',onDelete: 'CASCADE' });
db.Payment.belongsTo(db.User, { foreignKey: 'user_id' ,onDelete: 'CASCADE'});

db.SubscriptionPlan.hasMany(db.Payment, { foreignKey: 'plan_id' ,onDelete: 'CASCADE'});
db.Payment.belongsTo(db.SubscriptionPlan, { foreignKey: 'plan_id',onDelete: 'CASCADE' });

db.User.hasMany(db.UserSubscription, { foreignKey: 'user_id',onDelete: 'CASCADE' });
db.UserSubscription.belongsTo(db.User, { foreignKey: 'user_id',onDelete: 'CASCADE' });

db.SubscriptionPlan.hasMany(db.UserSubscription, { foreignKey: 'plan_id',onDelete: 'CASCADE' });
db.UserSubscription.belongsTo(db.SubscriptionPlan, { foreignKey: 'plan_id',onDelete: 'CASCADE'});

db.Payment.hasOne(db.UserSubscription, { foreignKey: 'payment_id',onDelete: 'CASCADE' });
db.UserSubscription.belongsTo(db.Payment, { foreignKey: 'payment_id',onDelete: 'CASCADE' });

// Notifications
db.User.hasMany(db.Notification, { foreignKey: 'user_id',onDelete: 'CASCADE' });
db.Notification.belongsTo(db.User, { foreignKey: 'user_id',onDelete: 'CASCADE' });
db.User.hasMany(db.Notification, { foreignKey: 'sent_by', as: 'SentNotifications' ,onDelete: 'CASCADE'});
db.Notification.belongsTo(db.User, { foreignKey: 'sent_by', as: 'Sender',onDelete: 'CASCADE' });


// Locations
db.Tutor.belongsTo(db.Location, { foreignKey: 'location_id',onDelete: 'CASCADE' });
db.Student.belongsTo(db.Location, { foreignKey: 'location_id',onDelete: 'CASCADE' });

// Enquiries
db.User.hasMany(db.Enquiry, { foreignKey: 'sender_id', as: 'SentEnquiries',onDelete: 'CASCADE' });
db.User.hasMany(db.Enquiry, { foreignKey: 'receiver_id', as: 'ReceivedEnquiries' ,onDelete: 'CASCADE'});

db.Enquiry.belongsTo(db.User, { foreignKey: 'sender_id', as: 'Sender',onDelete: 'CASCADE'});
db.Enquiry.belongsTo(db.User, { foreignKey: 'receiver_id', as: 'Receiver',onDelete: 'CASCADE' });

// Class schedules
db.User.hasMany(db.ClassSchedule, { foreignKey: 'tutor_id', as: 'TutorClasses',onDelete: 'CASCADE' });
db.User.hasMany(db.ClassSchedule, { foreignKey: 'student_id', as: 'StudentClasses',onDelete: 'CASCADE' });

db.ClassSchedule.belongsTo(db.User, { foreignKey: 'tutor_id', as: 'Tutor' ,onDelete: 'CASCADE'});
db.ClassSchedule.belongsTo(db.User, { foreignKey: 'student_id', as: 'Student',onDelete: 'CASCADE' });

//group class
// Group → Members
db.Group.hasMany(db.GroupMember, { foreignKey: 'group_id', as: 'Members' ,onDelete: 'CASCADE'});
db.GroupMember.belongsTo(db.Group, { foreignKey: 'group_id' ,onDelete: 'CASCADE'});

// Group → Classes
db.Group.hasMany(db.ClassSchedule, { foreignKey: 'group_id',onDelete: 'CASCADE' });
db.ClassSchedule.belongsTo(db.Group, { foreignKey: 'group_id',onDelete: 'CASCADE' });

// GroupMember → User
db.User.hasMany(db.GroupMember, { foreignKey: 'user_id', onDelete: 'CASCADE' });
db.GroupMember.belongsTo(db.User, { foreignKey: 'user_id', onDelete: 'CASCADE' });


// Messages (enquiry-threaded)
db.Enquiry.hasMany(db.Message, { foreignKey: 'enquiry_id', as: 'Messages' ,onDelete: 'CASCADE'});
db.Message.belongsTo(db.Enquiry, { foreignKey: 'enquiry_id', onDelete: 'CASCADE'});

db.User.hasMany(db.Message, { foreignKey: 'sender_id',onDelete: 'CASCADE' });
db.Message.belongsTo(db.User, { foreignKey: 'sender_id',onDelete: 'CASCADE' });

// Conversations (direct bookmark chat)
db.User.hasMany(db.Conversation, { foreignKey: 'student_id', as: 'StudentConversations',onDelete: 'CASCADE' });
db.User.hasMany(db.Conversation, { foreignKey: 'tutor_id', as: 'TutorConversations' ,onDelete: 'CASCADE'});

db.Conversation.belongsTo(db.User, { foreignKey: 'student_id', as: 'Student',onDelete: 'CASCADE' });
db.Conversation.belongsTo(db.User, { foreignKey: 'tutor_id', as: 'Tutor',onDelete: 'CASCADE' });

db.Conversation.hasMany(db.Message, { foreignKey: 'conversation_id', as: 'Messages',onDelete: 'CASCADE' });
db.Message.belongsTo(db.Conversation, { foreignKey: 'conversation_id',onDelete: 'CASCADE' });

// Bookmarks
db.User.hasMany(db.Bookmark, { foreignKey: 'user_id', as: 'Bookmarks',onDelete: 'CASCADE' });
db.User.hasMany(db.Bookmark, { foreignKey: 'bookmarked_user_id', as: 'BookmarkedBy',onDelete: 'CASCADE' });

db.Bookmark.belongsTo(db.User, { foreignKey: 'user_id', as: 'User' ,onDelete: 'CASCADE'});
db.Bookmark.belongsTo(db.User, { foreignKey: 'bookmarked_user_id', as: 'BookmarkedUser',onDelete: 'CASCADE' });

// referral
db.ReferralCode = ReferralCode;

// Referral Code associations
db.User.hasMany(db.ReferralCode, { foreignKey: 'referrer_user_id', as: 'ReferralCodes',onDelete: 'CASCADE' });
db.User.hasMany(db.ReferralCode, { foreignKey: 'referred_user_id', as: 'ReferredBy',onDelete: 'CASCADE' });

db.ReferralCode.belongsTo(db.User, { foreignKey: 'referrer_user_id', as: 'Referrer',onDelete: 'CASCADE' });
db.ReferralCode.belongsTo(db.User, { foreignKey: 'referred_user_id', as: 'Referred',onDelete: 'CASCADE' });

// cupons 
// Coupon associations
db.User.hasMany(db.Coupon, { foreignKey: 'applied_by_user_id', as: 'UsedCoupons',onDelete: 'CASCADE' });
db.Coupon.belongsTo(db.User, { foreignKey: 'applied_by_user_id', as: 'UsedBy' ,onDelete: 'CASCADE'});
// Coupons
db.Coupon = Coupon;

// Track who used which coupon
db.User.hasMany(db.UserCoupon, { foreignKey: 'user_id', as: 'CouponUsages', onDelete: 'CASCADE' });
db.UserCoupon.belongsTo(db.User, { foreignKey: 'user_id', as: 'User', onDelete: 'CASCADE' });

db.Coupon.hasMany(db.UserCoupon, { foreignKey: 'coupon_id', as: 'UsersUsed', onDelete: 'CASCADE' });
db.UserCoupon.belongsTo(db.Coupon, { foreignKey: 'coupon_id', as: 'Coupon', onDelete: 'CASCADE' });


// Reviews
db.Review.belongsTo(db.User, { foreignKey: 'reviewer_id', as: 'Reviewer',onDelete: 'CASCADE' });
db.Review.belongsTo(db.Student, { foreignKey: 'reviewer_id', targetKey: 'user_id', as: 'StudentReviewer',onDelete: 'CASCADE' });
db.Review.belongsTo(db.Tutor, { foreignKey: 'tutor_id', targetKey: 'user_id', as: 'Tutor',onDelete: 'CASCADE' });

// Comments
db.Review.hasMany(db.ReviewComment, { foreignKey: 'review_id', as: 'comments',onDelete: 'CASCADE' });
db.ReviewComment.belongsTo(db.User, { foreignKey: 'commenter_id', as: 'Commenter' ,onDelete: 'CASCADE'});
db.ReviewComment.belongsTo(db.Review, { foreignKey: 'review_id',onDelete: 'CASCADE' });



// OTP Verifications
db.Otp = Otp;
db.User.hasMany(db.Otp, { foreignKey: 'user_id', onDelete: 'CASCADE' });
db.Otp.belongsTo(db.User, { foreignKey: 'user_id', onDelete: 'CASCADE' });


// Associations: Blog <-> User (author)
db.Blog.belongsTo(db.User, { foreignKey: 'author_id', as: 'Author' });
db.User.hasMany(db.Blog, { foreignKey: 'author_id', as: 'Blogs' });

// Sync
sequelize.sync().then(() => console.log('Models Synced'));

export default db;
