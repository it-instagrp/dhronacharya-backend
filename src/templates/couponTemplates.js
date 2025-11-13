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

  promoCouponEmail: ({ name, couponCode, discount, expiryDate }) => ({
    subject: `Limited Time Offer - Use ${couponCode} for ${discount} Off`,
    text: `
Hi ${name},

Don't miss this offer!

Use coupon code "${couponCode}" to get ${discount} off on your next subscription or course.

Expires: ${new Date(expiryDate).toLocaleDateString()}

Apply it at checkout today!

– Team Dronacharya
    `.trim()
  }),

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

  promoCouponWhatsApp: ({ name, couponCode, discount, expiryDate }) =>
    `🔥 Hey ${name}!\nGrab *${discount} off* with coupon *${couponCode}*.\n⏰ Expires: ${new Date(expiryDate).toLocaleDateString()}\n🎯 Use it now at checkout on Dronacharya.`,

  couponAppliedWhatsApp: ({ name, couponCode, discount, finalAmount }) =>
    `✅ Hi ${name}, your coupon *${couponCode}* was applied successfully!\n💰 You saved ${discount}.\n🧾 Final amount: ₹${finalAmount}\nThanks for using Dronacharya!`,

  invalidCouponWhatsApp: ({ name, couponCode }) =>
    `⚠️ Hi ${name}, the coupon code *${couponCode}* is invalid or expired.\n🙋‍♂️ Please try another or contact support.`,

  // -------------------------
  // 📩 SMS Templates (160 chars or less)
  // -------------------------

  newUserCouponSMS: ({ couponCode, discount, expiryDate }) =>
    `Use code ${couponCode} to get ${discount}${typeof discount === 'number' ? '%' : ''} off on Dronacharya. Valid till ${new Date(expiryDate).toLocaleDateString()}`,

  promoCouponSMS: ({ couponCode, discount, expiryDate }) =>
    `Limited offer! Apply ${couponCode} to save ${discount} on Dronacharya. Expires ${new Date(expiryDate).toLocaleDateString()}`,

  couponAppliedSMS: ({ couponCode, finalAmount }) =>
    `Coupon ${couponCode} applied. Final amount: ₹${finalAmount}. Thanks for choosing Dronacharya!`,

  invalidCouponSMS: ({ couponCode }) =>
    `Coupon ${couponCode} is invalid or expired. Please try another or contact support.`
};
