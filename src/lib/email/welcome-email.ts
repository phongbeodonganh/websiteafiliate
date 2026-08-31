import { sendEmail } from './mailer';

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export async function sendInsiderConfirmationEmail(
  email: string,
  confirmationUrl: string,
  idempotencyKey: string,
) {
  const siteName = process.env.EMAIL_SITE_NAME?.trim() || 'AIDEALSUK';
  const safeSiteName = escapeHtml(siteName);
  const safeConfirmationUrl = escapeHtml(confirmationUrl);

  return sendEmail({
    to: email,
    subject: `Confirm your ${siteName} Insider subscription`,
    text: [
      `Confirm your ${siteName} Insider subscription.`,
      '',
      'We received a request to subscribe this email address to the daily Insider briefing.',
      '',
      `Confirm subscription: ${confirmationUrl}`,
      '',
      'If you did not request this, you can safely ignore this email.',
    ].join('\n'),
    html: `
      <!doctype html>
      <html lang="en">
        <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
        <body style="margin:0;background:#f4f4f5;color:#111827;font-family:Arial,sans-serif">
          <div style="display:none;max-height:0;overflow:hidden">Confirm your ${safeSiteName} Insider subscription.</div>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f4f5;padding:32px 16px">
            <tr><td align="center">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border-top:4px solid #111111">
                <tr><td style="padding:36px 32px 16px">
                  <p style="margin:0 0 18px;font-size:12px;font-weight:700;letter-spacing:1.6px;text-transform:uppercase;color:#52525b">${safeSiteName} Insider</p>
                  <h1 style="margin:0 0 18px;font-size:32px;line-height:1.15;color:#111111">Confirm your subscription</h1>
                  <p style="margin:0 0 14px;font-size:16px;line-height:1.7;color:#3f3f46">We received a request to add this email address to the daily ${safeSiteName} Insider briefing.</p>
                  <p style="margin:0 0 28px;font-size:16px;line-height:1.7;color:#3f3f46">Confirm below to receive the latest and hottest stories once a day.</p>
                  <a href="${safeConfirmationUrl}" style="display:inline-block;background:#111111;color:#ffffff;text-decoration:none;font-size:13px;font-weight:700;padding:14px 22px">Confirm Insider</a>
                </td></tr>
                <tr><td style="padding:24px 32px 32px">
                  <p style="margin:0;border-top:1px solid #e4e4e7;padding-top:18px;font-size:11px;line-height:1.6;color:#71717a">If you did not request this subscription, you can safely ignore this email. The confirmation link expires in 24 hours.</p>
                </td></tr>
              </table>
            </td></tr>
          </table>
        </body>
      </html>
    `,
    idempotencyKey,
  });
}
