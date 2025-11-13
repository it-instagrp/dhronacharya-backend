import { sendEmail } from '../utils/email.js';

export const sendContactMessage = async (req, res) => {
  try {
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Email content to send to admin
    const adminEmail = 'care@dronacharyatutorials.com'; // change if needed
    const subject = `New Contact Enquiry from ${name}`;
    const text = `
Dear Admin,

You have received a new message through the Dronacharya contact form.

Name: ${name}
Email: ${email}
Message:
${message}

Best regards,
Dronacharya Website Contact Form
    `;

    await sendEmail(adminEmail, subject, text);

    res.status(200).json({ message: 'Message sent successfully!' });
  } catch (error) {
    console.error('Error sending contact message:', error);
    res.status(500).json({ message: 'Failed to send message' });
  }
};
