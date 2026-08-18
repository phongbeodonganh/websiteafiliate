import nodemailer from 'nodemailer';
import type { SendEmailInput } from './resend';

export function isGmailConfigured() {
  return Boolean(process.env.GMAIL_USER?.trim() && process.env.GMAIL_APP_PASSWORD?.trim());
}

export async function sendEmailWithGmail(input: SendEmailInput) {
  const user = process.env.GMAIL_USER?.trim();
  const appPassword = process.env.GMAIL_APP_PASSWORD?.replace(/\s+/g, '');

  if (!user || !appPassword) {
    throw new Error('GMAIL_USER or GMAIL_APP_PASSWORD is not configured');
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass: appPassword },
  });

  const info = await transporter.sendMail({
    from: process.env.GMAIL_FROM?.trim() || `AIDEALSUK Insider <${user}>`,
    to: input.to,
    replyTo: process.env.EMAIL_REPLY_TO?.trim() || user,
    subject: input.subject,
    text: input.text,
    html: input.html,
    headers: input.idempotencyKey ? { 'X-Entity-Ref-ID': input.idempotencyKey } : undefined,
  });

  return { id: info.messageId };
}
