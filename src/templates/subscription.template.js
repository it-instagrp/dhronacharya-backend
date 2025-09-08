export const subscriptionTemplates = {
  confirmation: {
    email: ({ plan, price, duration, userName }) => `
Dear ${userName || 'User'},

🎉 Thank you for subscribing to the ${plan} plan on Dronacharya.

Plan: ${plan}
Price: ₹${price}
Duration: ${duration} days

Your subscription is now active. You can access premium features immediately.

Happy Learning!
- Team Dronacharya
    `.trim(),

    sms: ({ plan }) =>
      `🎉 You're subscribed to the ${plan} plan on Dronacharya. Enjoy premium access!`,

    whatsapp: ({ plan }) =>
      `🎉 You're now subscribed to the *${plan}* plan on Dronacharya!\nEnjoy full access to premium features.`.trim()
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
      `⏳ Your *${plan}* subscription on Dronacharya expires in ${daysLeft} days.\nRenew now to stay connected.`.trim()
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
      `❌ Your *${plan}* subscription has expired.\nRenew now on Dronacharya to restore access.`.trim()
  }
};