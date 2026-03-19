const nodemailer = require('nodemailer');
require('dotenv').config();

function getTransporter() {
  // Mailtrap/SMTP öncelikli
  if (process.env.EMAIL_HOST) {
    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT || 587),
      secure: String(process.env.EMAIL_SECURE || 'false') === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }

  // Gmail app password fallback
  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });
  }

  throw new Error(
    'Email ayarları eksik. EMAIL_HOST/EMAIL_USER/EMAIL_PASS veya GMAIL_USER/GMAIL_APP_PASSWORD tanımla.'
  );
}

async function sendEmail({ to, subject, html, text }) {
  const transporter = getTransporter();
  const from = process.env.EMAIL_FROM || process.env.GMAIL_USER || 'no-reply@birivar.app';

  return transporter.sendMail({
    from,
    to,
    subject,
    text,
    html,
  });
}

module.exports = sendEmail;
