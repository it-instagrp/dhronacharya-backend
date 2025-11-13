const emailHeader = (name, role) => `Dear ${name || role},\n\n`;
const emailFooter = `\nBest regards,  \nTeam Dronacharya`;

export const groupTemplates = {
  created: {
    email: ({ groupName, creatorName }) => `
${emailHeader(creatorName, 'User')}
🎉 Your group "${groupName}" has been created successfully.

You can now add members and schedule classes for the group.
${emailFooter}`.trim(),

    whatsapp: ({ groupName }) => `
👥 *New Group Created!*
"${groupName}" has been successfully created.

Add members to start scheduling classes.
Team Dronacharya`.trim(),

    sms: ({ groupName }) =>
      `📢 Group "${groupName}" created. You can now add members and schedule classes.`,
  },

  addedToGroup: {
    email: ({ groupName, memberName }) => `
${emailHeader(memberName, 'Member')}
You have been added to the group "${groupName}".

Please check your dashboard for upcoming classes and announcements.
${emailFooter}`.trim(),

    whatsapp: ({ groupName }) => `
👤 *You've been added to a group!*
Group: "${groupName}"

Check your dashboard for more details.
Team Dronacharya`.trim(),

    sms: ({ groupName }) =>
      `✅ You’ve been added to the group "${groupName}". Check dashboard for details.`,
  },

  removedFromGroup: {
    email: ({ groupName, memberName }) => `
${emailHeader(memberName, 'Member')}
You have been removed from the group "${groupName}".

If you believe this was a mistake, please contact support.
${emailFooter}`.trim(),

    whatsapp: ({ groupName }) => `
🚫 *Group Removal Notice*
You have been removed from "${groupName}".

Contact admin if you have questions.
Team Dronacharya`.trim(),

    sms: ({ groupName }) =>
      `⚠️ You have been removed from group "${groupName}". Contact admin if needed.`,
  },
};
