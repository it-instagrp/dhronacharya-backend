// src/templates/enquiry.template.js
export const enquiryTemplates = {
  new_enquiry_email: {
    tutor: ({ name, studentClass, mode, subject }) => `
Dear Tutor,

You have a new enquiry from a student on Dronacharya!

📌 Student Details:
• Name: ${name}
• Class: ${studentClass}
• Mode: ${mode}
• Subject: ${subject}

Log in to respond.

Team Dronacharya
    `.trim(),

    student: ({ name, subject }) => `
Dear Student,

A tutor has responded to your enquiry on Dronacharya.

📌 Tutor: ${name}
📚 Subject: ${subject}

Login to view and reply.

Team Dronacharya
    `.trim(),
  },

  new_enquiry_sms: ({ name, subject }) => `
📩 Enquiry from: ${name}
📚 Subject: ${subject}
💡 Login to Dronacharya to view
  `.trim(),

  new_enquiry_whatsapp: ({ link }) => `
👋 New Enquiry Alert!

🚀 Quick link to respond:
${link}

Team Dronacharya
  `.trim(),

  enquiry_response_email: ({ subject, status, response_message }) => `
Your enquiry regarding "${subject}" has been ${status.toUpperCase()}.
Message: ${response_message || 'No message provided.'}
  `.trim()
};
