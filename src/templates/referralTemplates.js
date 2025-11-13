// src/templates/referralTemplates.js

export const referralTemplates = {
  codeGenerated: {
    email: ({ userName, code }) => `
Dear ${userName || 'User'},

🎉 Your referral code has been successfully generated on Dronacharya.

🔗 Referral Code: ${code}

Share this code with your friends. When they join using your code, you both enjoy exclusive rewards!

Start referring now and grow your learning community.

Thanks,  
Team Dronacharya
    `.trim(),

    sms: ({ code }) =>
      `🎉 Your Dronacharya referral code is ${code}. Share with friends & earn rewards!`,

    whatsapp: ({ code }) =>
      `🎉 Your *Dronacharya* referral code is *${code}*.\nInvite friends & unlock exciting rewards!`
  },

  codeApplied: {
    email: ({ referrerName, referredName }) => `
Hi ${referrerName || 'User'},

👏 Great news! ${referredName} has successfully signed up using your referral code.

You're one step closer to earning your referral reward. Keep referring to maximize your benefits.

Thanks,  
Team Dronacharya
    `.trim(),

    sms: ({ referredName }) =>
      `${referredName} used your referral code. Stay tuned for your reward!`,

    whatsapp: ({ referredName }) =>
      `🎉 ${referredName} just used your referral code!\nYou're one step closer to your reward.`
  },

  rewardGiven: {
    email: ({ userName, rewardType, rewardValue }) => `
Dear ${userName || 'User'},

🎁 Congratulations! You've earned a referral reward.

✅ Reward Type: ${rewardType}
🏷️ Reward Value: ${rewardValue}

We appreciate your effort in growing the Dronacharya community. Keep referring to earn more!

Warm regards,  
Team Dronacharya
    `.trim(),

    sms: ({ rewardType, rewardValue }) =>
      `🎁 Congrats! You've earned a ${rewardType}: ${rewardValue} for your referral on Dronacharya.`,

    whatsapp: ({ rewardType, rewardValue }) =>
      `🎁 You've earned a *${rewardType}* - *${rewardValue}* on Dronacharya!\nThank you for your referral.`
  }
};
