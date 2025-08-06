import { sendEmail } from './email.js';
import { sendSMS } from './sms.js';
import { sendWhatsApp } from './whatsapp.js';
import { notificationTemplates } from '../templates/notificationTemplates.js';

export const sendNotification = async ({ type, recipient, subject, template_name, params }) => {
  let message;

  const template = notificationTemplates[template_name]?.[type];

  // ✅ Use template if exists
  if (template) {
    if (params?.values && !Array.isArray(params.values)) {
      params.values = [params.values];
    }

    // ✅ Fix undefined name fallback
    const filledParams = {
      ...params,
      name: params?.name || 'User',
    };

    message = template(filledParams);
  } else {
    // ✅ Fallback formatting logic
    if (!params?.message) {
      throw new Error(`No message content provided for template "${template_name}"`);
    }

    const rawMessage = params.message.trim();
    const name = params?.name || 'User';

    const alreadyHasGreeting = rawMessage.toLowerCase().startsWith('dear') || rawMessage.includes('Team Dronacharya');

    if (alreadyHasGreeting) {
      message = rawMessage;
    } else {
      message = `Dear ${name},\n\n${rawMessage}\n\nStay connected and keep learning!\n\nRegards,\nTeam Dronacharya`;
    }
  }

  // 📨 Dispatch via selected type
  switch (type) {
    case 'email':
      return sendEmail(recipient, subject, message);
    case 'sms':
      return sendSMS(recipient, message);
    case 'whatsapp':
      return sendWhatsApp(recipient, message);
    default:
      throw new Error('Unsupported notification type');
  }
};
