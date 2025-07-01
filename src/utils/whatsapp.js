import twilio from 'twilio';

const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH);
const FROM = process.env.TWILIO_WHATSAPP_NUMBER;

export const sendWhatsApp = async (to, message) => {
  if (!FROM || !to) {
    console.log('ℹ️ WhatsApp not sent: missing FROM or TO number. Skipping...');
    return;
  }

  try {
    await client.messages.create({
      body: message,
      from: `whatsapp:${FROM}`,
      to: `whatsapp:${to}`
    });
    console.log(`✅ WhatsApp sent to ${to}`);
  } catch (error) {
    console.warn(`⚠️ WhatsApp send failed to ${to}: ${error.message}`);
    // You can skip throwing to avoid crashing the app
  }
};
