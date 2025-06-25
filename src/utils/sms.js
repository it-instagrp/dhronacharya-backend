// src/utils/sendSMS.js
import twilio from 'twilio';

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

export const sendSMS = async (to, message) => {
  try {
    const response = await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: to.startsWith('+91') ? to : `+91${to}` // Adjust country code as needed
    });

    console.log(`📲 SMS sent to ${to}. SID: ${response.sid}`);
    return true;
  } catch (error) {
    console.error('❌ Failed to send SMS:', error.message);
    throw error;
  }
};
