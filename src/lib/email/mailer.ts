import { isGmailConfigured, sendEmailWithGmail } from './gmail';
import { isResendConfigured, sendEmailWithResend, type SendEmailInput } from './resend';

type EmailProvider = 'gmail' | 'resend';

function selectedProvider(): EmailProvider {
  const provider = process.env.EMAIL_PROVIDER?.trim().toLowerCase();
  if (provider === 'gmail' || provider === 'resend') return provider;
  return isGmailConfigured() ? 'gmail' : 'resend';
}

export function isEmailConfigured() {
  return selectedProvider() === 'gmail' ? isGmailConfigured() : isResendConfigured();
}

export function sendEmail(input: SendEmailInput) {
  return selectedProvider() === 'gmail' ? sendEmailWithGmail(input) : sendEmailWithResend(input);
}
