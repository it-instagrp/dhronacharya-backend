import { format } from 'date-fns';

// Reusable formatting function
const formatDateTime = (date) => 
  format(new Date(date), "do MMM yyyy, h:mm a");

// Common email header/footer templates
const emailHeader = (name, role) => 
  `Dear ${name || role},\n\n`;

const emailFooter = `
Best regards,  
Team Dronacharya`;

// Shared template parts
const classInfoSection = (className, partyName) => 
  `Your class "${className}" with ${partyName.trim()}`;

const joinLinkSection = (joinLink, defaultMsg = 'You can find the join link on your dashboard.') =>
  joinLink ? `🔗 Join Link: ${joinLink}\n` : `${defaultMsg}\n`;

export const classTemplates = {
  scheduled: {
    email: ({ className, dateTime, studentName, tutorName, joinLink, recipientRole }) => {
      const greetingName = recipientRole === 'tutor' ? tutorName : studentName;
      const greetingRole = recipientRole === 'tutor' ? 'Tutor' : 'Student';
      const otherParty = recipientRole === 'tutor' ? 
        `student ${studentName || ''}` : 
        `tutor ${tutorName || ''}`;

      return `
${emailHeader(greetingName, greetingRole)}
${classInfoSection(className, otherParty)} has been successfully scheduled.

📅 Date & Time: ${formatDateTime(dateTime)}

${joinLinkSection(joinLink)}
${emailFooter}
      `.trim();
    },

    sms: ({ className, dateTime, joinLink }) =>
      `📚 Class "${className}" on ${formatDateTime(dateTime)}\n` +
      `${joinLink ? `Join: ${joinLink}` : 'Check dashboard for link.'}`,

    whatsapp: ({ className, dateTime, joinLink }) => `
📘 *Class Scheduled!*
"${className}" is scheduled for ${formatDateTime(dateTime)}

${joinLink ? `🔗 Join: ${joinLink}` : '📱 Link unavailable – check your dashboard.'}

Best of luck!  
Team Dronacharya
    `.trim(),
  },

  rescheduled: {
    email: ({ className, newDateTime, studentName, tutorName, joinLink, recipientRole }) => {
      const greetingName = recipientRole === 'tutor' ? tutorName : studentName;
      const otherParty = recipientRole === 'tutor' ? 
        `student ${studentName || ''}` : 
        `tutor ${tutorName || ''}`;

      return `
${emailHeader(greetingName, recipientRole === 'tutor' ? 'Tutor' : 'Student')}
${classInfoSection(className, otherParty)} has been rescheduled.

🔄 New Schedule: ${formatDateTime(newDateTime)}

${joinLinkSection(joinLink, 'Join link is unchanged or will be shared soon.')}
${emailFooter}
      `.trim();
    },

    sms: ({ className, newDateTime, joinLink }) =>
      `🔄 Class "${className}" rescheduled to ${formatDateTime(newDateTime)}\n` +
      `${joinLink ? `Join: ${joinLink}` : 'Check dashboard.'}`,

    whatsapp: ({ className, newDateTime, joinLink }) => `
🔄 *Class Rescheduled!*
"${className}" has been moved to ${formatDateTime(newDateTime)}

${joinLink ? `🔗 Updated Link: ${joinLink}` : '📱 Not available yet.'}
    `.trim(),
  },

  cancelled: {
    email: ({ className, studentName, tutorName, recipientRole, cancellationReason }) => {
      const greetingName = recipientRole === 'tutor' ? tutorName : studentName;
      const otherParty = recipientRole === 'tutor' ? 'the student' : 'your tutor';

      return `
${emailHeader(greetingName, recipientRole === 'tutor' ? 'Tutor' : 'Student')}
We regret to inform you that ${classInfoSection(className, otherParty)} has been cancelled.

${cancellationReason ? `Reason: ${cancellationReason}\n` : ''}
Please visit your dashboard for more options.
${emailFooter}
      `.trim();
    },

    sms: ({ className, cancellationReason }) =>
      `❌ Class "${className}" cancelled\n` +
      `${cancellationReason ? `Reason: ${cancellationReason}` : ''}`,

    whatsapp: ({ className, cancellationReason }) => `
❌ *Class Cancelled!*
"${className}" has been cancelled.

${cancellationReason ? `📝 Reason: ${cancellationReason}\n` : ''}
Please coordinate for rescheduling.
    `.trim(),
  },
};