require('dotenv').config();
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp-relay.brevo.com',
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.BREVO_SENDER_EMAIL, // Login email for Brevo
    pass: process.env.BREVO_API_KEY, // SMTP key / API key
  },
});

async function test() {
  console.log("Testing Brevo connection with:");
  console.log("BREVO_SENDER_EMAIL:", process.env.BREVO_SENDER_EMAIL);
  console.log("BREVO_API_KEY:", process.env.BREVO_API_KEY ? "Loaded" : "Missing");
  
  try {
    const info = await transporter.sendMail({
      from: `"${process.env.BREVO_SENDER_NAME || 'Test'}" <${process.env.BREVO_SENDER_EMAIL}>`,
      to: process.env.BREVO_SENDER_EMAIL || 'test@example.com', // send to self
      subject: "Test Email",
      text: "This is a test email.",
    });
    console.log('Message sent successfully: %s', info.messageId);
  } catch (error) {
    console.error('Error sending email:', error);
  }
}

test();
