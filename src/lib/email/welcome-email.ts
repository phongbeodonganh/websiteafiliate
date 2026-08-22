import { sendEmail } from './mailer';

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export async function sendInsiderWelcomeEmail(email: string) {
  const siteName = process.env.EMAIL_SITE_NAME?.trim() || 'AIDEALSUK';
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL?.trim() || 'https://pstung.com').replace(/\/$/, '');
  const safeSiteName = escapeHtml(siteName);

  return sendEmail({
    to: email,
    subject: `Welcome to ${siteName} Insider`,
    text: [
      `Welcome to ${siteName} Insider.`,
      '',
      'You are now subscribed to our weekly AI tool reviews, automation case studies, and selected partner offers.',
      '',
      `Read the latest stories: ${siteUrl}`,
      '',
      'You received this email because you subscribed on our website.',
    ].join('\n'),
    html: `
      <!doctype html>
      <html lang="en">
        <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
        <body style="margin:0;background:#f4f4f5;color:#111827;font-family:Arial,sans-serif">
          <div style="display:none;max-height:0;overflow:hidden">Your first ${safeSiteName} Insider briefing is ready.</div>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f4f5;padding:32px 16px">
            <tr><td align="center">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border-top:4px solid #111111">
                <tr><td style="padding:36px 32px 16px">
                  <p style="margin:0 0 18px;font-size:12px;font-weight:700;letter-spacing:1.6px;text-transform:uppercase;color:#52525b">${safeSiteName} Insider</p>
                  <h1 style="margin:0 0 18px;font-size:32px;line-height:1.15;color:#111111">Welcome to the Insider list</h1>
                  <p style="margin:0 0 14px;font-size:16px;line-height:1.7;color:#3f3f46">You are now subscribed to our weekly AI tool reviews, automation case studies, prompt frameworks, and selected partner offers.</p>
                  <p style="margin:0 0 28px;font-size:16px;line-height:1.7;color:#3f3f46">We keep it practical and low-noise.</p>
                  <a href="${siteUrl}" style="display:inline-block;background:#111111;color:#ffffff;text-decoration:none;font-size:13px;font-weight:700;padding:14px 22px">Read the latest stories</a>
                </td></tr>
                <tr><td style="padding:24px 32px 32px">
                  <p style="margin:0;border-top:1px solid #e4e4e7;padding-top:18px;font-size:11px;line-height:1.6;color:#71717a">You received this email because you subscribed on the ${safeSiteName} website.</p>
                </td></tr>
              </table>
            </td></tr>
          </table>
        </body>
      </html>
    `,
  });
}
