import { enquiryTemplates } from './enquiry.template.js';
import { otpTemplates } from './otp.template.js';
import { classTemplates } from './class.template.js';
import { subscriptionTemplates } from './subscription.template.js';
import { contactLimitTemplates } from './contactLimit.template.js';
import { referralTemplates } from './referralTemplates.js'; // ✅ updated name
import { groupTemplates } from './groupTemplates.js';

export const templates = {
  enquiry: enquiryTemplates,
  otp: otpTemplates,
  class: classTemplates,
  subscription: subscriptionTemplates,
  contactLimit: contactLimitTemplates,
  referral: referralTemplates, // ✅ added
  group: groupTemplates,
};
