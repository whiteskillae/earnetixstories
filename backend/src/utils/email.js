const sendEmail = async ({ to, subject, html }) => {
  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': process.env.BREVO_API_KEY,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        sender: { 
          email: process.env.BREVO_SENDER_EMAIL, 
          name: process.env.BREVO_SENDER_NAME || 'Earnetix Blogs' 
        },
        to: [{ email: to }],
        subject: subject,
        htmlContent: html
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('Brevo API Error:', data);
      return false;
    }

    console.log('Message sent: %s', data.messageId);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
};

const sendSignupOTPEmail = async (email, name, otp) => {
  const subject = 'Your Verification Code for Signup';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaec; border-radius: 10px;">
      <h2 style="color: #333;">Welcome ${name}!</h2>
      <p style="color: #555; font-size: 16px;">Thank you for registering. Please use the following One-Time Password (OTP) to verify your email address. This code is valid for 10 minutes.</p>
      <div style="background-color: #f4f4f4; padding: 15px; text-align: center; border-radius: 5px; margin: 20px 0;">
        <h1 style="margin: 0; color: #4F46E5; letter-spacing: 5px;">${otp}</h1>
      </div>
      <p style="color: #888; font-size: 14px;">If you didn't request this, please ignore this email.</p>
    </div>
  `;
  return await sendEmail({ to: email, subject, html });
};

const sendPasswordResetOTPEmail = async (email, otp) => {
  const subject = 'Password Reset Verification Code';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaec; border-radius: 10px;">
      <h2 style="color: #333;">Password Reset Request</h2>
      <p style="color: #555; font-size: 16px;">We received a request to reset your password. Please use the following One-Time Password (OTP) to proceed. This code is valid for 10 minutes.</p>
      <div style="background-color: #f4f4f4; padding: 15px; text-align: center; border-radius: 5px; margin: 20px 0;">
        <h1 style="margin: 0; color: #4F46E5; letter-spacing: 5px;">${otp}</h1>
      </div>
      <p style="color: #888; font-size: 14px;">If you didn't request this, please ignore this email and your password will remain unchanged.</p>
    </div>
  `;
  return await sendEmail({ to: email, subject, html });
};

module.exports = {
  sendSignupOTPEmail,
  sendPasswordResetOTPEmail,
};
