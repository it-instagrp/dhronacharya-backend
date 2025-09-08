import twilio from 'twilio';

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const FROM = process.env.TWILIO_WHATSAPP_NUMBER || process.env.TWILIO_PHONE_NUMBER;

export const sendWhatsApp = async (to, message) => {
  if (!FROM || !to) {
    console.log('ℹ️ WhatsApp not sent: missing FROM or TO number. Skipping...');
    return;
  }

  // force only phone numbers
  if (!/^\+?\d+$/.test(to)) {
    console.warn(`❌ Invalid WhatsApp recipient: ${to}`);
    return;
  }

  try {
    const msg = await client.messages.create({
      body: message,
      from: `whatsapp:${FROM}`,  // e.g. whatsapp:+14155238886
      to: to.startsWith('whatsapp:') ? to : `whatsapp:${to}`,
    });

    console.log(`✅ WhatsApp sent to ${to}, SID: ${msg.sid}`);
    return msg;
  } catch (error) {
    console.error(`⚠️ WhatsApp send failed to ${to}:`, error);
    throw error;
  }
};
