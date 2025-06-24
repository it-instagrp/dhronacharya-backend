// src/utils/sendSMS.js
import axios from 'axios';

export const sendSMS = async (to, message) => {
  try {
    const response = await axios.post('https://api.textlocal.in/send/', null, {
      params: {
        apikey: process.env.TEXTLOCAL_API_KEY,
        sender: process.env.TEXTLOCAL_SENDER, // example: 'TXTLCL'
        numbers: to,
        message,
      },
    });

    if (response.data.status !== 'success') {
      throw new Error(response.data.errors?.[0]?.message || 'SMS sending failed');
    }

    console.log(`📱 SMS sent to ${to}`);
    return true;
  } catch (error) {
    console.error('❌ SMS sending failed:', error.message);
    throw error;
  }
};
