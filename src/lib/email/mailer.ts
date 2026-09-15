import {
  isResendConfigured,
  sendEmailBatchWithResend,
  sendEmailWithResend,
  type BatchEmailInput,
  type SendEmailInput,
} from './resend';

export function isEmailConfigured() {
  return isResendConfigured();
}

export function sendEmail(input: SendEmailInput) {
  return sendEmailWithResend(input);
}

export function sendEmailBatch(inputs: BatchEmailInput[], idempotencyKey: string) {
  return sendEmailBatchWithResend(inputs, idempotencyKey);
}
