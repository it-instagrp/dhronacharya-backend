export const subscriptionTemplates = {
  confirmation: {
    email: ({ plan, price, duration, userName, couponCode, couponType, discountAmount }) => {
      const priceNum = Number(price) || 0;
      const discountNum = Number(discountAmount) || 0;
      const gst = (priceNum * 0.18).toFixed(2);
      const totalBeforeDiscount = (priceNum * 1.18).toFixed(2);
      const hasCoupon = couponCode && discountNum > 0;
      const finalTotal = hasCoupon ? (priceNum * 1.18 - discountNum).toFixed(2) : totalBeforeDiscount;

      const couponTypeText = couponType ? {
        'promotional': 'Promotional Offer',
        'referral': 'Referral Discount',
        'global': 'Special Discount',
        'retention': 'Loyalty Discount'
      }[couponType] || 'Special Discount' : 'Special Discount';

      return `
Dear ${userName || 'User'},

Thank you for subscribing to Dronacharya's ${plan}. Your subscription is now active and you can access all premium features immediately.

**SUBSCRIPTION SUMMARY**
────────────────────
Plan: ${plan}
Duration: ${duration} days
Base Price: ₹${priceNum.toFixed(2)}
GST (18%): ₹${gst}
${hasCoupon ? `Discount (${couponTypeText}): -₹${discountNum.toFixed(2)}` : ''}
────────────────────
**Amount Paid: ₹${finalTotal}**
${hasCoupon ? `Coupon Code: ${couponCode}` : ''}

Best regards,
Team Dronacharya
      `.trim();
    },

    sms: ({ plan, price, couponCode, couponType, discountAmount }) => {
      const priceNum = Number(price) || 0;
      const discountNum = Number(discountAmount) || 0;
      const totalBeforeDiscount = (priceNum * 1.18).toFixed(2);
      const hasCoupon = couponCode && discountNum > 0;
      const finalTotal = hasCoupon ? (priceNum * 1.18 - discountNum).toFixed(2) : totalBeforeDiscount;

      if (hasCoupon) {
        const couponTypeText = couponType ? {
          'promotional': 'promo',
          'referral': 'referral',
          'global': 'discount',
          'retention': 'loyalty'
        }[couponType] || 'discount' : 'discount';
        
        return `Subscribed to ${plan} on Dronacharya. Paid: ₹${finalTotal}. Coupon: ${couponCode} saved ₹${discountNum.toFixed(2)}.`;
      } else {
        return `Subscribed to ${plan} on Dronacharya. Paid: ₹${finalTotal} incl. GST.`;
      }
    },

    whatsapp: ({ plan, price, couponCode, couponType, discountAmount }) => {
      const priceNum = Number(price) || 0;
      const discountNum = Number(discountAmount) || 0;
      const totalBeforeDiscount = (priceNum * 1.18).toFixed(2);
      const hasCoupon = couponCode && discountNum > 0;
      const finalTotal = hasCoupon ? (priceNum * 1.18 - discountNum).toFixed(2) : totalBeforeDiscount;

      if (hasCoupon) {
        const couponTypeText = couponType ? {
          'promotional': 'Promotional Offer',
          'referral': 'Referral Discount',
          'global': 'Special Discount',
          'retention': 'Loyalty Discount'
        }[couponType] || 'Discount' : 'Discount';
        
        return ` *Subscription Confirmed*

*Plan:* ${plan}
*Amount Paid:* ₹${finalTotal}
*Coupon Code:* ${couponCode} (${couponTypeText})
*Discount:* ₹${discountNum.toFixed(2)} saved

Your premium access is now active.

Happy Learning,
Team Dronacharya`.trim();
      } else {
        return ` *Subscription Confirmed*

*Plan:* ${plan}
*Amount Paid:* ₹${finalTotal}

Your premium access is now active.

Team Dronacharya`.trim();
      }
    },
  },

  renewalReminder: {
    email: ({ plan, daysLeft, userName, couponCode, couponType }) => {
      let couponSection = '';
      
      if (couponCode && couponType) {
        const couponTypeText = {
          'promotional': 'exclusive promotional',
          'referral': 'special referral',
          'global': 'limited-time',
          'retention': 'loyalty'
        }[couponType] || 'special';
        
        couponSection = `

**Renewal Offer Available**
Use coupon code: ${couponCode}
This is a ${couponTypeText} offer for our valued customers.`;
      }

      return `
Dear ${userName || 'User'},

This is a friendly reminder that your ${plan} subscription on Dronacharya will expire in ${daysLeft} days.${couponSection}

To avoid interruption in your premium access, please renew your subscription before it ends.

Thanks,
Team Dronacharya
      `.trim();
    },

    sms: ({ plan, daysLeft, couponCode, couponType }) => {
      if (couponCode) {
        return `Reminder: Your ${plan} subscription ends in ${daysLeft} days. Use ${couponCode} for special offer.`;
      }
      return `Reminder: Your ${plan} subscription ends in ${daysLeft} days. Renew on Dronacharya.`;
    },

    whatsapp: ({ plan, daysLeft, couponCode, couponType }) => {
      if (couponCode && couponType) {
        const couponEmoji = {
          'promotional': '🎁',
          'referral': '🤝',
          'global': '✨',
          'retention': '💝'
        }[couponType] || '✨';
        
        return `⏳ *Subscription Renewal Reminder*

Your *${plan}* subscription expires in *${daysLeft} days*.

${couponEmoji} *Renewal Offer:* ${couponCode}

Renew now to continue uninterrupted access.

Team Dronacharya`.trim();
      }
      
      return `⏳ *Subscription Renewal Reminder*

Your *${plan}* subscription expires in *${daysLeft} days*.

Renew now on Dronacharya to stay connected.

Team Dronacharya`.trim();
    },
  },

  expiryNotice: {
    email: ({ plan, userName, couponCode, couponType }) => {
      let couponSection = '';
      
      if (couponCode && couponType) {
        const couponTypeText = {
          'promotional': 'special promotional',
          'referral': 'exclusive referral',
          'global': 'limited-time',
          'retention': 'comeback'
        }[couponType] || 'special';
        
        couponSection = `

**We Miss You! Special Offer**
Use coupon code: ${couponCode} for a ${couponTypeText} discount on your renewal.`;
      }

      return `
Dear ${userName || 'User'},

Your ${plan} subscription has now expired.${couponSection}

To restore your premium access immediately, please renew your subscription now.

We hope to see you back soon!
Team Dronacharya
      `.trim();
    },

    sms: ({ plan, couponCode }) => {
      if (couponCode) {
        return `Your ${plan} subscription has expired. Use ${couponCode} for special renewal offer on Dronacharya.`;
      }
      return `Your ${plan} subscription has expired. Renew now on Dronacharya to continue access.`;
    },

    whatsapp: ({ plan, couponCode, couponType }) => {
      if (couponCode && couponType) {
        const couponEmoji = {
          'promotional': '🎁',
          'referral': '🤝',
          'global': '✨',
          'retention': '💝'
        }[couponType] || '✨';
        
        return `❌ *Subscription Expired*

Your *${plan}* subscription has now expired.

${couponEmoji} *Renewal Offer:* ${couponCode}

Renew now to restore access immediately.

Team Dronacharya`.trim();
      }
      
      return `❌ *Subscription Expired*

Your *${plan}* subscription has now expired.

Renew now on Dronacharya to restore access.

Team Dronacharya`.trim();
    },
  },

  couponApplied: {
    email: ({ userName, couponCode, couponType, discountValue, discountType, applicablePlan, validUntil }) => {
      const discountDisplay = discountType === 'percentage' 
        ? `${discountValue}%` 
        : `₹${discountValue}`;
      
      const couponTypeText = {
        'promotional': 'Promotional Offer',
        'referral': 'Referral Bonus',
        'global': 'Special Discount',
        'retention': 'Loyalty Reward'
      }[couponType] || 'Discount';
      
      const validUntilDate = new Date(validUntil).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      return `
Dear ${userName || 'User'},

**${couponTypeText} Activated**

**Coupon Details**
────────────────────
Code: ${couponCode}
Discount: ${discountDisplay} off
Applicable Plans: ${applicablePlan}
Valid Until: ${validUntilDate}
────────────────────

Use this coupon during checkout to enjoy your discount.

**Note:** This coupon can only be used once per account.

Thank you for being a valued member of Dronacharya!

Best regards,
Team Dronacharya
      `.trim();
    },

    sms: ({ couponCode, couponType, discountValue, discountType, validUntil }) => {
      const discountDisplay = discountType === 'percentage' 
        ? `${discountValue}%` 
        : `₹${discountValue}`;
      
      const couponTypeText = {
        'promotional': 'Promo',
        'referral': 'Referral',
        'global': 'Discount',
        'retention': 'Loyalty'
      }[couponType] || 'Discount';
      
      const validDate = new Date(validUntil).toLocaleDateString('en-IN');
      
      return `${couponTypeText} coupon ${couponCode} (${discountDisplay} off) is now active! Use by ${validDate}.`;
    },

    whatsapp: ({ couponCode, couponType, discountValue, discountType, applicablePlan, validUntil }) => {
      const discountDisplay = discountType === 'percentage' 
        ? `${discountValue}%` 
        : `₹${discountValue}`;
      
      const couponTypeText = {
        'promotional': '🎁 *Promotional Offer*',
        'referral': '🤝 *Referral Bonus*',
        'global': '✨ *Special Discount*',
        'retention': '💝 *Loyalty Reward*'
      }[couponType] || '✨ *Discount*';
      
      const validUntilDate = new Date(validUntil).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      return `${couponTypeText}

*Coupon Code:* ${couponCode}
*Discount:* ${discountDisplay} off
*Valid for:* ${applicablePlan}
*Expires:* ${validUntilDate}

Use this coupon during checkout to enjoy your discount.

*Note:* One-time use per account.

Happy Learning!
Team Dronacharya`.trim();
    },
  },
};