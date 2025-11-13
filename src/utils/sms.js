import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

/**
 * Sends an OTP SMS using Kutility API (DLT-compliant)
 * Supports both direct and DLT {#var#} placeholder formats
 * 
 * @param {string} mobile - Recipient mobile number
 * @param {string} otp - One Time Password
 */
export const sendSMS = async (mobile, otp) => {
  try {
    // Message format matching your approved DLT template
    const messageTemplate = `{#var#} is the One Time Password to verify your phone number on https://dronacharyatutorials.com/ DRONACHARYA LEARNING SOLUTION LLP`;
    const message = messageTemplate.replace("{#var#}", otp);

    // URL encode message
    const encodedMsg = encodeURIComponent(message);

    //  Build API URL
    const url = `${process.env.SMS_API_URL}?key=${process.env.SMS_API_KEY}&campaign=${process.env.SMS_CAMPAIGN_ID}&routeid=${process.env.SMS_ROUTE_ID}&type=text&contacts=${mobile}&senderid=${process.env.SMS_SENDER_ID}&msg=${encodedMsg}&template_id=${process.env.SMS_TEMPLATE_ID}&pe_id=${process.env.SMS_PE_ID}`;

    // Send request
    const response = await axios.get(url);

    console.log("SMS sent successfully!");
    console.log("Response:", response.data);

    return response.data;
  } catch (error) {
    console.error("Error sending SMS:", error.message);
    if (error.response?.data) {
      console.error("Response:", error.response.data);
    }
    throw error;
  }
};




// import axios from "axios";
// import dotenv from "dotenv";
// dotenv.config();

// /**
//  * Sends an OTP SMS using Kutility API (DLT-compliant)
//  * Supports both direct and DLT {#var#} placeholder formats
//  * 
//  * @param {string} mobile - Recipient mobile number
//  * @param {string} otp - One Time Password
//  */
// export const sendSMS = async (mobile, otp) => {
//   try {
//     // Message format matching your approved DLT template
//     const messageTemplate = `{#var#} is the One Time Password to verify your phone number on https://dronacharyatutorials.com/ DRONACHARYA LEARNING SOLUTION LLP`;
//     const message = messageTemplate.replace("{#var#}", otp);

//     // URL encode message
//     const encodedMsg = encodeURIComponent(message);

//     //  Build API URL
//     const url = `${process.env.SMS_API_URL}?key=${process.env.SMS_API_KEY}&campaign=${process.env.SMS_CAMPAIGN_ID}&routeid=${process.env.SMS_ROUTE_ID}&type=text&contacts=${mobile}&senderid=${process.env.SMS_SENDER_ID}&msg=${encodedMsg}&template_id=${process.env.SMS_TEMPLATE_ID}&pe_id=${process.env.SMS_PE_ID}`;

//     // Send request
//     const response = await axios.get(url);

//     console.log("SMS sent successfully!");
//     console.log("Response:", response);

//     if(response.status == 200){
//       return response.data;
//     } else {
//       return ;
//     }
//   } catch (error) {
//     console.error("Error sending SMS:", error.message);
//     if (error.response?.data) {
//       console.error("Response:", error.response.data);
//     }
//     throw error;
//   }
// };


