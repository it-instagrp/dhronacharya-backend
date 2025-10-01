import twilio from 'twilio';

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const FROM = process.env.TWILIO_WHATSAPP_NUMBER;

if (!FROM) {
  console.warn('⚠️ TWILIO_WHATSAPP_NUMBER is not set. WhatsApp messages will be skipped.');
}

export const sendWhatsApp = async (to, message) => {
  if (!FROM || !to) {
    console.log('ℹ️ WhatsApp not sent: missing FROM or TO number. Skipping...');
    return;
  }

  if (!/^\+?\d+$/.test(to)) {
    console.warn(`❌ Invalid WhatsApp recipient: ${to}`);
    return;
  }

  try {
    const msg = await client.messages.create({
      body: message,
      from: `whatsapp:${FROM}`,
      to: `whatsapp:${to.replace(/^whatsapp:/, '')}`, // normalize
    });

    console.log(`✅ WhatsApp sent to ${to}, SID: ${msg.sid}`);
    return msg;
  } catch (error) {
    console.error(`⚠️ WhatsApp send failed to ${to}:`, error.message);
    throw error;
  }
};
