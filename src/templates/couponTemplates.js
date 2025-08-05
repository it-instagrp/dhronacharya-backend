// src/templates/couponTemplates.js

export const couponTemplates = {
  // -------------------------
  // 📧 Plain Text Email Templates
  // -------------------------

  newUserCouponEmail: ({ name, couponCode, discount, expiryDate }) => ({
    subject: `Welcome to Dronacharya! Get ${discount}${typeof discount === 'number' ? '%' : ''} off`,
    text: `
Hi ${name},

We’re excited to have you on board!

Use the coupon code "${couponCode}" to get ${discount}${typeof discount === 'number' ? '%' : ''} off on your first subscription.

This coupon is valid until: ${new Date(expiryDate).toLocaleDateString()}

Apply it at checkout and start learning!

– Team Dronacharya
    `.trim()
  }),

  promoCouponEmail: ({ name, couponCode, discount, expiryDate }) => ({
    subject: `Limited Time Offer - Use ${couponCode} for ${discount} Off`,
    text: `
Hi ${name},

Don't miss this limited-time offer!

Use the coupon code "${couponCode}" to get ${discount} off on your next subscription or course.

Offer valid until: ${new Date(expiryDate).toLocaleDateString()}

Apply it at checkout before it’s gone!

– Team Dronacharya
    `.trim()
  }),

  couponAppliedEmail: ({ name, couponCode, discount, finalAmount }) => ({
    subject: `Coupon Applied Successfully`,
    text: `
Hi ${name},

Your coupon "${couponCode}" was applied successfully.

You saved ${discount}, and your final payable amount is ₹${finalAmount}.

Thank you for choosing Dronacharya!

– Team Dronacharya
    `.trim()
  }),

  invalidCouponEmail: ({ name, couponCode }) => ({
    subject: `Invalid or Expired Coupon`,
    text: `
Hi ${name},

The coupon code "${couponCode}" you tried to use is either invalid or has expired.

Please check the code and try again, or contact support if you need help.

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
    `⚠️ Hi ${name}, the coupon code *${couponCode}* is invalid or expired.\n🙋‍♂️ Please try a different code or contact support.`,

  // -------------------------
  // 📩 SMS-Friendly Templates (under 160 chars)
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
