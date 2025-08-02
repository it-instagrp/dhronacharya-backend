export const notificationTemplates = {
  general: {
    email: ({ name, message }) => `
Dear ${name},

${message}

Regards,  
Team Dronacharya
    `.trim(),
    sms: ({ message }) => `${message}`,
    whatsapp: ({ message }) => `${message}`
  },

  subscriptionReminder: {
    email: ({ name, expiryDate }) => `
Hello ${name},

Your subscription will expire on ${expiryDate}. Please renew soon to avoid disruption.

Thanks,  
Team Dronacharya
    `.trim(),
    sms: ({ expiryDate }) => `Reminder: Your subscription expires on ${expiryDate}. Renew now.`,
    whatsapp: ({ expiryDate }) => `⏰ Reminder: Your subscription ends on ${expiryDate}. Renew now.`
  },

  enquiryReceived: {
    email: ({ tutorName, studentName, subject }) => `
Hello ${tutorName},

You’ve received a new enquiry from ${studentName} regarding the subject "${subject}".

Please respond at your earliest convenience.

Regards,  
Team Dronacharya
    `.trim(),
    sms: ({ studentName, subject }) => `New enquiry from ${studentName} for ${subject}. Check your account.`,
    whatsapp: ({ studentName, subject }) => `📥 Enquiry from ${studentName} on ${subject}. Reply soon.`
  },

  ImportantUpdate: {
    email: ({ message }) => `
Dear Student,

${message}

Stay connected and keep learning!

Regards,  
Team Dronacharya
    `.trim(),
    sms: ({ message }) => `${message}`,
    whatsapp: ({ message }) => `${message}`
  },

  // ✅ ADD THESE
  new_enquiry_email: {
    email: ({ name, studentClass, mode, subject }) => `
Hello,

You have a new enquiry from ${name}.
Class: ${studentClass}
Mode: ${mode}
Subject: ${subject}

Please login to your dashboard to respond.

Regards,  
Team Dronacharya
    `.trim()
  },

  new_enquiry_whatsapp: {
    whatsapp: ({ link }) => `📩 You have a new enquiry! Click to view: ${link}`
  },

  new_enquiry_sms: {
    sms: ({ name, subject }) => `New enquiry from ${name} on ${subject}. Login to check.`
  },

  enquiry_response: {
    email: ({ subject, status, response }) => `
Your enquiry regarding "${subject}" has been ${status}.
Message: ${response}

Thank you,  
Team Dronacharya
    `.trim()
  }
};
