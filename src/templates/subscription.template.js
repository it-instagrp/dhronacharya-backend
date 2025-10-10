export const subscriptionTemplates = {
  confirmation: {
    email: ({ plan, price, duration, userName, couponCode, discountAmount }) => {
      const gst = (price * 0.18).toFixed(2);
      const totalBeforeDiscount = (price * 1.18).toFixed(2);
      const hasCoupon = couponCode && discountAmount > 0;
      const finalTotal = hasCoupon
        ? (price * 1.18 - discountAmount).toFixed(2)
        : totalBeforeDiscount;

      return `
Dear ${userName || 'User'},

🎉 Thank you for subscribing to the ${plan} on Dronacharya.

Plan: ${plan}
Base Price: ₹${price}
GST (18%): ₹${gst}
${hasCoupon ? `Coupon Applied: ${couponCode}\nDiscount: ₹${discountAmount.toFixed(2)}\n` : ''}
Total Amount Paid: ₹${finalTotal}
Duration: ${duration} days

Your subscription is now active. You can access all exclusive features immediately.

Happy Learning!
- Team Dronacharya
      `.trim();
    },

    sms: ({ plan, price, couponCode, discountAmount }) => {
      const totalBeforeDiscount = (price * 1.18).toFixed(2);
      const hasCoupon = couponCode && discountAmount > 0;
      const finalTotal = hasCoupon
        ? (price * 1.18 - discountAmount).toFixed(2)
        : totalBeforeDiscount;

      return hasCoupon
        ? `🎉 You're subscribed to ${plan} on Dronacharya. Total Paid: ₹${finalTotal} (after ₹${discountAmount.toFixed(2)} off with ${couponCode}). Enjoy premium access!`
        : `🎉 You're subscribed to ${plan} on Dronacharya. Total Paid: ₹${finalTotal} (incl. 18% GST). Enjoy premium access!`;
    },

    whatsapp: ({ plan, price, couponCode, discountAmount }) => {
      const totalBeforeDiscount = (price * 1.18).toFixed(2);
      const hasCoupon = couponCode && discountAmount > 0;
      const finalTotal = hasCoupon
        ? (price * 1.18 - discountAmount).toFixed(2)
        : totalBeforeDiscount;

      return hasCoupon
        ? `🎉 You're now subscribed to *${plan}* on Dronacharya!\n💰 Total Paid: ₹${finalTotal} (after ₹${discountAmount.toFixed(2)} off using ${couponCode})\nEnjoy full access to premium features.`
        : `🎉 You're now subscribed to *${plan}* on Dronacharya!\n💰 Total Paid: ₹${finalTotal} (includes 18% GST)\nEnjoy full access to premium features.`;
    },
  },

  renewalReminder: {
    email: ({ plan, daysLeft, userName }) => `
Dear ${userName || 'User'},

This is a friendly reminder that your ${plan} subscription on Dronacharya will expire in ${daysLeft} days.

To avoid interruption, please renew your subscription before it ends.

Thanks,  
Team Dronacharya
    `.trim(),

    sms: ({ plan, daysLeft }) =>
      `Reminder: Your ${plan} subscription ends in ${daysLeft} days. Renew on Dronacharya.`,

    whatsapp: ({ plan, daysLeft }) =>
      `⏳ Your *${plan}* subscription on Dronacharya expires in ${daysLeft} days.\nRenew now to stay connected.`.trim(),
  },

  expiryNotice: {
    email: ({ plan, userName }) => `
Dear ${userName || 'User'},

Your ${plan} subscription has expired.

To continue accessing premium features, please renew your subscription.

We hope to see you back soon!  
Team Dronacharya
    `.trim(),

    sms: ({ plan }) =>
      `Your ${plan} subscription on Dronacharya has expired. Renew now to continue access.`,

    whatsapp: ({ plan }) =>
      `Your *${plan}* subscription has expired.\nRenew now on Dronacharya to restore access.`.trim(),
  },
};
