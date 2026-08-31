export interface InsiderDigestArticle {
  title: string;
  slug: string;
  summary: string;
  viewCount: number;
}

export interface InsiderDigestPeriod {
  dayKey: string;
  start: Date;
  end: Date;
}

const GMT_PLUS_12_OFFSET_MS = 12 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export function getPreviousGmtPlus12Period(now = new Date()): InsiderDigestPeriod {
  const shiftedNow = new Date(now.getTime() + GMT_PLUS_12_OFFSET_MS);
  const currentDayStartShifted = Date.UTC(
    shiftedNow.getUTCFullYear(),
    shiftedNow.getUTCMonth(),
    shiftedNow.getUTCDate(),
  );
  const previousDayStartShifted = currentDayStartShifted - DAY_MS;
  const start = new Date(previousDayStartShifted - GMT_PLUS_12_OFFSET_MS);
  const end = new Date(currentDayStartShifted - GMT_PLUS_12_OFFSET_MS);
  const dayKey = new Date(previousDayStartShifted).toISOString().slice(0, 10);

  return { dayKey, start, end };
}

export function getCurrentGmtPlus12Period(now = new Date()): InsiderDigestPeriod {
  const shiftedNow = new Date(now.getTime() + GMT_PLUS_12_OFFSET_MS);
  const currentDayStartShifted = Date.UTC(
    shiftedNow.getUTCFullYear(),
    shiftedNow.getUTCMonth(),
    shiftedNow.getUTCDate(),
  );
  const start = new Date(currentDayStartShifted - GMT_PLUS_12_OFFSET_MS);
  const dayKey = new Date(currentDayStartShifted).toISOString().slice(0, 10);

  return { dayKey, start, end: now };
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function articleUrl(siteUrl: string, slug: string) {
  return `${siteUrl}/article/${encodeURIComponent(slug)}`;
}

function renderArticle(article: InsiderDigestArticle, siteUrl: string, badge?: string) {
  const url = escapeHtml(articleUrl(siteUrl, article.slug));
  const safeTitle = escapeHtml(article.title);
  const safeSummary = escapeHtml(article.summary);
  const badgeMarkup = badge
    ? `<span style="display:inline-block;margin:0 0 9px;padding:4px 7px;background:#ecfdf5;color:#047857;font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase">${escapeHtml(badge)}</span>`
    : '';

  return `
    <tr>
      <td style="padding:20px 0;border-bottom:1px solid #e4e4e7">
        ${badgeMarkup}
        <h3 style="margin:0 0 8px;font-size:19px;line-height:1.35;color:#111827">
          <a href="${url}" style="color:#111827;text-decoration:none">${safeTitle}</a>
        </h3>
        <p style="margin:0 0 12px;font-size:14px;line-height:1.65;color:#52525b">${safeSummary}</p>
        <a href="${url}" style="font-size:12px;font-weight:700;color:#0d766e;text-decoration:none">Read article →</a>
      </td>
    </tr>
  `;
}

function renderSection(
  title: string,
  articles: InsiderDigestArticle[],
  siteUrl: string,
  badge?: (article: InsiderDigestArticle, index: number) => string | undefined,
) {
  if (articles.length === 0) return '';
  return `
    <tr><td style="padding:30px 32px 0">
      <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#0d766e">${escapeHtml(title)}</p>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
        ${articles.map((article, index) => renderArticle(article, siteUrl, badge?.(article, index))).join('')}
      </table>
    </td></tr>
  `;
}

export function buildInsiderDigestEmail(input: {
  siteName: string;
  siteUrl: string;
  dayKey: string;
  latest: InsiderDigestArticle[];
  hottest: InsiderDigestArticle[];
  unsubscribeUrl: string;
  periodDescription?: string;
}) {
  const safeSiteName = escapeHtml(input.siteName);
  const safeSiteUrl = escapeHtml(input.siteUrl);
  const safeUnsubscribeUrl = escapeHtml(input.unsubscribeUrl);
  const latestText = input.latest.map((article) => (
    `- ${article.title}\n  ${article.summary}\n  ${articleUrl(input.siteUrl, article.slug)}`
  )).join('\n\n');
  const hottestText = input.hottest.map((article, index) => (
    `${index + 1}. ${article.title}\n   ${article.summary}\n   ${articleUrl(input.siteUrl, article.slug)}`
  )).join('\n\n');

  return {
    subject: `${input.siteName} Daily Brief — ${input.dayKey}`,
    text: [
      `${input.siteName} Insider — ${input.dayKey}`,
      '',
      ...(latestText ? ['LATEST', latestText, ''] : []),
      ...(hottestText ? ['HOTTEST', hottestText, ''] : []),
      `Visit ${input.siteName}: ${input.siteUrl}`,
      '',
      `Unsubscribe: ${input.unsubscribeUrl}`,
    ].join('\n'),
    html: `
      <!doctype html>
      <html lang="en">
        <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
        <body style="margin:0;background:#f4f4f5;color:#111827;font-family:Arial,sans-serif">
          <div style="display:none;max-height:0;overflow:hidden">Your latest and hottest stories for ${escapeHtml(input.dayKey)}.</div>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f4f5;padding:32px 16px">
            <tr><td align="center">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border-top:4px solid #0d766e">
                <tr><td style="padding:36px 32px 8px">
                  <p style="margin:0 0 14px;font-size:11px;font-weight:700;letter-spacing:1.6px;text-transform:uppercase;color:#0d766e">${safeSiteName} Insider · ${escapeHtml(input.dayKey)}</p>
                  <h1 style="margin:0 0 14px;font-size:30px;line-height:1.15;color:#111827">Your daily AI briefing</h1>
                  <p style="margin:0;font-size:15px;line-height:1.7;color:#52525b">A concise summary of the latest stories from ${escapeHtml(input.periodDescription || 'the previous GMT+12 day')}, plus the hottest reads on ${safeSiteName}.</p>
                </td></tr>
                ${renderSection('Latest', input.latest, input.siteUrl)}
                ${renderSection('Hottest', input.hottest, input.siteUrl, (_article, index) => `#${index + 1} hottest`)}
                <tr><td align="center" style="padding:34px 32px">
                  <a href="${safeSiteUrl}" style="display:inline-block;background:#111111;color:#ffffff;text-decoration:none;font-size:13px;font-weight:700;padding:14px 22px">Visit ${safeSiteName}</a>
                </td></tr>
                <tr><td style="padding:22px 32px 30px;background:#fafafa;border-top:1px solid #e4e4e7">
                  <p style="margin:0;font-size:11px;line-height:1.6;color:#71717a">You received this daily briefing because you confirmed your ${safeSiteName} Insider subscription. <a href="${safeUnsubscribeUrl}" style="color:#52525b">Unsubscribe</a>.</p>
                </td></tr>
              </table>
            </td></tr>
          </table>
        </body>
      </html>
    `,
  };
}
