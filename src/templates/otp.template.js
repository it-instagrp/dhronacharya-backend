export const otpTemplates = {
  signup: {
    email: ({ otp, userName }) => `
Dear ${userName || 'User'},

Welcome to Dronacharya! Please use the OTP below to verify your email address:

${otp}

This OTP is valid for 10 minutes.

Thanks,
Team Dronacharya
    `.trim(),
    
    sms: ({ otp }) => `Your Dronacharya signup OTP is: ${otp}`,
    
    whatsapp: ({ otp }) => `
👋 Welcome to Dronacharya!
Your signup OTP is: ${otp}
Use it within 10 minutes.
    `.trim()
  },

  login: {
    email: ({ otp, userName }) => `
Dear ${userName || 'User'},

You requested to log in to Dronacharya. Use the OTP below to continue:

${otp}

This OTP will expire in 10 minutes.
If this wasn't you, please ignore this email.

- Team Dronacharya
    `.trim(),
    
    sms: ({ otp }) => `Login OTP (Dronacharya): ${otp}`,
    
    whatsapp: ({ otp }) => `
🛡️ Dronacharya Login OTP: ${otp}
This code expires in 10 minutes.
    `.trim()
  },

  forgotPassword: {
    email: ({ otp, userName }) => `
Dear ${userName || 'User'},

You requested to reset your password. Use the OTP below to proceed:

${otp}

This OTP is valid for 10 minutes. Do not share it with anyone.

- Team Dronacharya
    `.trim(),
    
    sms: ({ otp }) => `Reset OTP (Dronacharya): ${otp}`,
    
    whatsapp: ({ otp }) => `
🔐 Reset your password using this OTP: ${otp}
Valid for 10 minutes.
    `.trim()
  }
};