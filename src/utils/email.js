// src/utils/email.js
import axios from 'axios';

export const sendEmail = async (to, subject, body) => {
  try {
    const response = await axios.post('https://email-service.instagrp.in/api/email/send', {
      to,
      subject,
      body
    });

    if (response.status !== 200) {
      console.error('Email API responded with non-200:', response.status);
      throw new Error('Email API failed');
    }

    console.log(`📨 Email sent via API to ${to}`);
    return true;
  } catch (error) {
    console.error('❌ Email sending failed:', error.message);
    throw new Error('Email sending failed');
  }
};
