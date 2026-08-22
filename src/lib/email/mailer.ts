import { isResendConfigured, sendEmailWithResend, type SendEmailInput } from './resend';

export function isEmailConfigured() {
  return isResendConfigured();
}

export function sendEmail(input: SendEmailInput) {
  return sendEmailWithResend(input);
}
