// src/utils/sendSMS.js
import twilio from "twilio";

const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER } = process.env;

// Debug log (mask sensitive values)
console.log("🔎 Loaded Twilio Config:");
console.log("   SID:", TWILIO_ACCOUNT_SID ? TWILIO_ACCOUNT_SID.slice(0, 6) + "..." : "❌ MISSING");
console.log("   Auth Token:", TWILIO_AUTH_TOKEN ? TWILIO_AUTH_TOKEN.slice(0, 4) + "...(hidden)" : "❌ MISSING");
console.log("   Phone:", TWILIO_PHONE_NUMBER || "❌ MISSING");

const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

export const sendSMS = async (to, message) => {
  try {
    let formattedNumber = to.startsWith("+") ? to : `+91${to}`;

    const response = await client.messages.create({
      body: message,
      from: TWILIO_PHONE_NUMBER,
      to: formattedNumber,
    });

    console.log(`📲 SMS sent to ${formattedNumber}. SID: ${response.sid}`);
    return response;
  } catch (error) {
    console.error("❌ Failed to send SMS:", error.code, error.message);
    throw error;
  }
};

