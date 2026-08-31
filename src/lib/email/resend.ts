import { Resend } from 'resend';

const DEFAULT_EMAIL_FROM = 'AIDEALSUK Insider <insider@aidealsuk.com>';
const DEFAULT_EMAIL_REPLY_TO = 'support@aidealsuk.com';

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text: string;
  headers?: Record<string, string>;
  idempotencyKey?: string;
}

export type BatchEmailInput = Omit<SendEmailInput, 'idempotencyKey'>;

export const RESEND_BATCH_SIZE = 100;

export class EmailConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EmailConfigurationError';
  }
}

function getEmailConfig() {
  const apiKey = process.env.RESEND_API?.trim();
  const from = process.env.EMAIL_FROM?.trim() || DEFAULT_EMAIL_FROM;
  const replyTo = process.env.EMAIL_REPLY_TO?.trim() || DEFAULT_EMAIL_REPLY_TO;

  if (!apiKey) throw new EmailConfigurationError('RESEND_API is not configured');

  return { apiKey, from, replyTo };
}

export function isResendConfigured() {
  const apiKey = process.env.RESEND_API?.trim();
  return Boolean(apiKey);
}

export async function sendEmailWithResend(input: SendEmailInput) {
  const { apiKey, from, replyTo } = getEmailConfig();
  const resend = new Resend(apiKey);
  const { data, error } = await resend.emails.send(
    {
      from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
      replyTo,
      headers: input.headers,
    },
    input.idempotencyKey ? { idempotencyKey: input.idempotencyKey } : undefined,
  );

  console.log('Resend email response:', {
    id: data?.id,
    error,
  });

  if (error || !data?.id) {
    throw new Error(error?.message || error?.name || 'Resend rejected the email');
  }

  return { id: data.id };
}

export async function sendEmailBatchWithResend(inputs: BatchEmailInput[], idempotencyKey: string) {
  if (inputs.length === 0 || inputs.length > RESEND_BATCH_SIZE) {
    throw new Error(`Resend batch must contain between 1 and ${RESEND_BATCH_SIZE} emails`);
  }

  const { apiKey, from, replyTo } = getEmailConfig();
  const resend = new Resend(apiKey);
  const { data, error } = await resend.batch.send(
    inputs.map((input) => ({
      from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
      replyTo,
      headers: input.headers,
    })),
    { idempotencyKey, batchValidation: 'strict' },
  );

  if (error || !data?.data) {
    throw new Error(error?.message || error?.name || 'Resend rejected the email batch');
  }

  return { ids: data.data.map((item) => item.id) };
}
