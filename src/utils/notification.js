import { sendEmail } from './email.js';
import { sendSMS } from './sms.js';
import { sendWhatsApp } from './whatsapp.js';
import { notificationTemplates } from '../templates/notificationTemplates.js';

export const sendNotification = async ({ type, recipient, subject, template_name, params }) => {
  const template = notificationTemplates[template_name]?.[type];
  if (!template) throw new Error(`Template ${template_name} for type ${type} not found`);

  // 🛡️ Defensive fix to prevent `.map is not a function`
  if (params?.values && !Array.isArray(params.values)) {
    params.values = [params.values];
  }

  const message = template(params);

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
