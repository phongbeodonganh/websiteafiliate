const RESEND_API_URL = 'https://api.resend.com/emails';

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text: string;
  idempotencyKey?: string;
}

interface ResendErrorResponse {
  message?: string;
  name?: string;
}

export class EmailConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EmailConfigurationError';
  }
}

function getEmailConfig() {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim();
  const replyTo = process.env.EMAIL_REPLY_TO?.trim();

  if (!apiKey) throw new EmailConfigurationError('RESEND_API_KEY is not configured');
  if (!from) throw new EmailConfigurationError('EMAIL_FROM is not configured');

  return { apiKey, from, replyTo };
}

export function isResendConfigured() {
  return Boolean(process.env.RESEND_API_KEY?.trim() && process.env.EMAIL_FROM?.trim());
}

export async function sendEmailWithResend(input: SendEmailInput) {
  const { apiKey, from, replyTo } = getEmailConfig();
  const response = await fetch(RESEND_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      ...(input.idempotencyKey ? { 'Idempotency-Key': input.idempotencyKey } : {}),
    },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject: input.subject,
      html: input.html,
      text: input.text,
      ...(replyTo ? { reply_to: replyTo } : {}),
    }),
    cache: 'no-store',
  });

  const payload = (await response.json().catch(() => ({}))) as ResendErrorResponse & { id?: string };
  if (!response.ok || !payload.id) {
    throw new Error(payload.message || payload.name || `Resend rejected the email (${response.status})`);
  }

  return { id: payload.id };
}
