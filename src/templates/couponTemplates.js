// src/templates/couponTemplates.js

export const couponTemplates = {
  // -------------------------
  // 📧 Email Templates
  // -------------------------

  newUserCouponEmail: ({ name, couponCode, discount, expiryDate }) => ({
    subject: `Welcome to Dronacharya! Get ${discount}${typeof discount === 'number' ? '%' : ''} off`,
    text: `
Hi ${name},

Welcome to Dronacharya!

Use coupon code "${couponCode}" to get ${discount}${typeof discount === 'number' ? '%' : ''} off on your first subscription.

Valid until: ${new Date(expiryDate).toLocaleDateString()}

Start learning and enjoy exclusive benefits!

– Team Dronacharya
    `.trim()
  }),

  // ===== PROMOTIONAL COUPON TEMPLATES =====
  welcomeCouponEmail: ({ name, couponCode, discount, expiryHours }) => ({
    subject: `Welcome to Dronacharya! Here's ${discount} off for you`,
    text: `
Hi ${name},

Welcome to Dronacharya! As a special welcome gift, here's your exclusive coupon:

Coupon Code: ${couponCode}
Discount: ${discount}
Valid for: ${expiryHours} hours

Use this coupon on any subscription plan to start your learning journey.

Happy Learning!

– Team Dronacharya
    `.trim()
  }),

  promotionalCouponUsedEmail: ({ name, couponCode, discount }) => ({
    subject: `Promotional Coupon Applied - ${discount} Saved!`,
    text: `
Hi ${name},

Great news! Your promotional coupon "${couponCode}" has been successfully applied.

You've saved ${discount} on your purchase.

Thank you for choosing Dronacharya!

– Team Dronacharya
    `.trim()
  }),

  // ===== REFERRAL COUPON TEMPLATES =====
  referralCouponUsedEmail: ({ name, couponCode, discount }) => ({
    subject: `Referral Discount Applied - ${discount} Off!`,
    text: `
Hi ${name},

Your referral coupon "${couponCode}" has been successfully applied.

You've received ${discount} off your purchase. Thank you for referring friends to Dronacharya!

– Team Dronacharya
    `.trim()
  }),

  referralSuccessEmail: ({ referrerName, referredUserName, couponCode, discount, commission }) => ({
    subject: `🎉 You've Earned a Referral Commission!`,
    text: `
Hi ${referrerName},

Great news! ${referredUserName} has successfully used your referral code "${couponCode}".

• Their discount: ${discount}
• Your commission: ${commission}%

Your referral network is growing! Keep sharing your code to earn more rewards.

– Team Dronacharya
    `.trim()
  }),

  // ===== RETENTION COUPON TEMPLATES =====
  retentionCouponUsedEmail: ({ name, couponCode, discount }) => ({
    subject: `Welcome Back! ${discount} Retention Discount Applied`,
    text: `
Hi ${name},

We're glad you're staying with us! Your retention coupon "${couponCode}" has been applied.

You've received ${discount} off as a thank you for continuing your learning journey with Dronacharya.

– Team Dronacharya
    `.trim()
  }),

  // ===== GLOBAL COUPON TEMPLATES =====
  couponAppliedEmail: ({ name, couponCode, discount, finalAmount }) => ({
    subject: `Coupon Applied Successfully`,
    text: `
Hi ${name},

Your coupon "${couponCode}" has been applied successfully.

You saved ${discount}, and your final payable amount is ₹${finalAmount}.

Thank you for choosing Dronacharya!

– Team Dronacharya
    `.trim()
  }),

  invalidCouponEmail: ({ name, couponCode }) => ({
    subject: `Invalid or Expired Coupon`,
    text: `
Hi ${name},

The coupon code "${couponCode}" you entered is invalid or expired.

Please check the code or try a different one. Contact support if needed.

– Team Dronacharya
    `.trim()
  }),

  // -------------------------
  // 📱 WhatsApp Templates (with emojis)
  // -------------------------

  newUserCouponWhatsApp: ({ name, couponCode, discount, expiryDate }) =>
    `👋 Hi ${name}!\n🎁 Use coupon *${couponCode}* to get *${discount}${typeof discount === 'number' ? '%' : ''} off* on your first subscription.\n📅 Valid till: ${new Date(expiryDate).toLocaleDateString()}\n🚀 Apply now on Dronacharya!`,

  // ===== PROMOTIONAL COUPON WHATSAPP =====
  welcomeCouponWhatsApp: ({ name, couponCode, discount, expiryHours }) =>
    `👋 Welcome ${name}!\n🎁 Your exclusive coupon: *${couponCode}*\n💰 Get *${discount} off*\n⏰ Valid for: ${expiryHours} hours\n🚀 Start learning on Dronacharya!`,

  promotionalCouponUsedWhatsApp: ({ name, couponCode, discount }) =>
    `✅ Hi ${name}!\n🎫 Promo code *${couponCode}* applied!\n💰 You saved *${discount}*\n🎯 Enjoy your learning on Dronacharya!`,

  // ===== REFERRAL COUPON WHATSAPP =====
  referralCouponUsedWhatsApp: ({ name, couponCode, discount }) =>
    `✅ Hi ${name}!\n🤝 Referral code *${couponCode}* applied!\n💰 You got *${discount} off*\n🎯 Thanks for referring friends to Dronacharya!`,

  // ===== RETENTION COUPON WHATSAPP =====
  retentionCouponUsedWhatsApp: ({ name, couponCode, discount }) =>
    `🎉 Welcome back ${name}!\n💝 Retention code *${couponCode}* applied!\n💰 You saved *${discount}*\n🎯 We're glad you're staying with Dronacharya!`,

  // ===== GLOBAL COUPON WHATSAPP =====
  couponAppliedWhatsApp: ({ name, couponCode, discount, finalAmount }) =>
    `✅ Hi ${name}, your coupon *${couponCode}* was applied successfully!\n💰 You saved ${discount}.\n🧾 Final amount: ₹${finalAmount}\nThanks for using Dronacharya!`,

  invalidCouponWhatsApp: ({ name, couponCode }) =>
    `⚠️ Hi ${name}, the coupon code *${couponCode}* is invalid or expired.\n🙋‍♂️ Please try another or contact support.`,

  // -------------------------
  // 📩 SMS Templates (160 chars or less)
  // -------------------------

  newUserCouponSMS: ({ couponCode, discount, expiryDate }) =>
    `Use code ${couponCode} to get ${discount}${typeof discount === 'number' ? '%' : ''} off on Dronacharya. Valid till ${new Date(expiryDate).toLocaleDateString()}`,

  // ===== PROMOTIONAL COUPON SMS =====
  welcomeCouponSMS: ({ couponCode, expiryHours }) =>
    `Welcome! Use ${couponCode} for exclusive discount on Dronacharya. Valid ${expiryHours}hrs.`,

  promotionalCouponUsedSMS: ({ couponCode, discount }) =>
    `Promo ${couponCode} applied. You saved ${discount}. Thanks! - Dronacharya`,

  // ===== REFERRAL COUPON SMS =====
  referralCouponUsedSMS: ({ couponCode }) =>
    `Referral code ${couponCode} applied. Thanks for referring friends! - Dronacharya`,

  // ===== RETENTION COUPON SMS =====
  retentionCouponUsedSMS: ({ couponCode }) =>
    `Welcome back! Retention code ${couponCode} applied. Thanks for staying! - Dronacharya`,

  // ===== GLOBAL COUPON SMS =====
  couponAppliedSMS: ({ couponCode, finalAmount }) =>
    `Coupon ${couponCode} applied. Final amount: ₹${finalAmount}. Thanks for choosing Dronacharya!`,

  invalidCouponSMS: ({ couponCode }) =>
    `Coupon ${couponCode} is invalid or expired. Please try another or contact support.`
};