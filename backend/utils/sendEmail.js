import nodemailer from "nodemailer";

const sendEmail = async (to, subject, text, html) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn("⚠️ EMAIL_USER or EMAIL_PASS not set in environment variables. Email will not be sent.");
    return;
  }

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  // Use alias email address for the From header
  const fromAddress = process.env.EMAIL_FROM || "BuddyBot <no-reply@ialksng.me>";
  const replyToAddress = process.env.EMAIL_REPLY_TO || "no-reply@ialksng.me";

  const mailOptions = {
    from: fromAddress,
    to,
    subject,
    text,
    replyTo: replyToAddress,
  };

  if (html) {
    mailOptions.html = html;
  }

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✉️ Email successfully sent from ${fromAddress} to ${to}: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error(`❌ Failed to send email to ${to}:`, error.message);
    throw error;
  }
};

export default sendEmail;
