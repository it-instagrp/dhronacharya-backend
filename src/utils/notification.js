// src/utils/notification.js
import { sendEmail } from './email.js';
import axios from 'axios';

export const sendNotification = async ({ type, recipient, subject, content }) => {
  switch (type) {
    case 'email':
      return await sendEmail(recipient, subject, content);

    case 'sms':
      return await sendSMS(recipient, content);

    case 'whatsapp':
      return await sendWhatsApp(recipient, content);

    default:
      throw new Error('Unsupported notification type');
  }
};

const sendSMS = async (phoneNumber, message) => {
  try {
    const response = await axios.post('https://api.textlocal.in/send/', {
      apikey: process.env.TEXTLOCAL_API_KEY,
      numbers: phoneNumber,
      sender: 'TXTLCL',
      message
    });
    console.log('📲 SMS sent:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ SMS failed:', error.message);
    throw new Error('SMS sending failed');
  }
};

const sendWhatsApp = async (phoneNumber, message) => {
  try {
    const response = await axios.post('https://api.interakt.ai/v1/public/message/', {
      phoneNumber,
      callbackData: 'test-callback',
      type: 'text',
      message: { text: message }
    }, {
      headers: {
        Authorization: `Bearer ${process.env.INTERAKT_API_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    console.log('🟢 WhatsApp message sent:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ WhatsApp failed:', error.message);
    throw new Error('WhatsApp sending failed');
  }
};

