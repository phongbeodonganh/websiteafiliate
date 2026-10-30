export interface InsiderDigestProduct {
  name: string;
  slug: string;
  shortDescription: string;
  imageUrl?: string;
  imageAlt?: string;
  price: number;
  originalPrice?: number;
  discountPercent: number;
}

export interface InsiderDigestCoupon {
  storeName: string;
  storeSlug: string;
  title: string;
  description: string;
  saving: string;
  code: string;
  imageUrl?: string;
  imageAlt?: string;
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

function productUrl(siteUrl: string, slug: string) {
  return `${siteUrl}/products/${encodeURIComponent(slug)}`;
}

function storeUrl(siteUrl: string, slug: string) {
  return `${siteUrl}/store/${encodeURIComponent(slug)}`;
}

function formatPrice(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

function renderProduct(product: InsiderDigestProduct, siteUrl: string, rank: number, badge?: string) {
  const url = escapeHtml(productUrl(siteUrl, product.slug));
  const safeName = escapeHtml(product.name);
  const safeDescription = escapeHtml(product.shortDescription);
  const safeImageUrl = product.imageUrl ? escapeHtml(product.imageUrl) : '';
  const safeImageAlt = escapeHtml(product.imageAlt || product.name);
  const badgeMarkup = badge
    ? `<span style="display:inline-block;margin:0 0 9px;padding:6px 9px;background:#eaf1e6;border:1px solid #dce7d7;border-radius:100px;color:#0d766e;font-size:9px;font-weight:800;letter-spacing:.08em;text-transform:uppercase">${escapeHtml(badge)}</span>`
    : '';
  const priceMarkup = product.price > 0
    ? `<p style="margin:13px 0 0;font-size:12px;line-height:1.4;color:#64716c"><span style="font-size:9px;font-weight:800;letter-spacing:.08em;text-transform:uppercase">From&nbsp;&nbsp;</span><strong style="color:#17211f;font-size:18px;letter-spacing:-.02em">${escapeHtml(formatPrice(product.price))}</strong>${product.originalPrice && product.originalPrice > product.price ? ` <span style="margin-left:7px;color:#8a948f;text-decoration:line-through">${escapeHtml(formatPrice(product.originalPrice))}</span>` : ''}</p>`
    : '';
  const imageMarkup = safeImageUrl
    ? `<img src="${safeImageUrl}" alt="${safeImageAlt}" width="112" height="112" style="display:block;width:112px;height:112px;border:0;border-radius:13px;object-fit:cover">`
    : `<div style="width:112px;height:112px;border-radius:13px;background:#edf3e8;color:#53745d;font-size:24px;font-weight:850;line-height:112px;text-align:center">TH</div>`;

  return `
    <tr><td style="padding:0 0 12px">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#ffffff;border:1px solid #dfe6da;border-radius:18px">
        <tr>
          <td width="46" valign="top" style="padding:20px 0 20px 18px;color:#8a978f;font-size:10px;font-weight:850;letter-spacing:.08em">${String(rank).padStart(2, '0')}</td>
          <td class="product-media" width="112" valign="top" style="padding:18px 18px 18px 4px">${imageMarkup}</td>
          <td class="product-copy" valign="top" style="padding:18px 22px 18px 0">
            ${badgeMarkup}
            <h3 style="margin:0 0 7px;font-family:Manrope,Arial,sans-serif;font-size:18px;font-weight:800;letter-spacing:-.025em;line-height:1.4;color:#17211f"><a href="${url}" style="color:#17211f;text-decoration:none">${safeName}</a></h3>
            ${safeDescription ? `<p style="margin:0;color:#64716c;font-size:12px;line-height:1.65">${safeDescription}</p>` : ''}
            ${priceMarkup}
            <p style="margin:13px 0 0"><a href="${url}" style="color:#0d766e;font-size:11px;font-weight:800;text-decoration:none">View product&nbsp; →</a></p>
          </td>
        </tr>
      </table>
    </td></tr>
  `;
}

function renderProductSection(
  title: string,
  eyebrow: string,
  description: string,
  products: InsiderDigestProduct[],
  siteUrl: string,
  badge?: (product: InsiderDigestProduct, index: number) => string | undefined,
) {
  if (products.length === 0) return '';
  return `
    <tr><td class="section-pad" style="padding:42px 34px 0">
      <p style="margin:0 0 9px;color:#0d766e;font-size:9px;font-weight:850;letter-spacing:.13em;text-transform:uppercase">${escapeHtml(eyebrow)}</p>
      <h2 style="margin:0;font-family:Manrope,Arial,sans-serif;color:#17211f;font-size:28px;font-weight:850;letter-spacing:-.045em;line-height:1.2">${escapeHtml(title)}</h2>
      <p style="margin:10px 0 22px;color:#64716c;font-size:12px;line-height:1.7">${escapeHtml(description)}</p>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
        ${products.map((product, index) => renderProduct(product, siteUrl, index + 1, badge?.(product, index))).join('')}
      </table>
    </td></tr>
  `;
}

function renderCoupon(coupon: InsiderDigestCoupon, siteUrl: string, index: number) {
  const url = escapeHtml(storeUrl(siteUrl, coupon.storeSlug));
  const label = coupon.saving || (coupon.code ? 'Coupon code' : 'Active deal');
  return `
    <tr><td style="padding:0 0 12px">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#fffdf8;border:1px solid #e4ddcf;border-radius:18px">
        <tr>
          <td class="coupon-saving" width="132" valign="middle" style="padding:22px 16px;background:#f7f0de;border-right:1px dashed #d8caaa;text-align:center">
            <p style="margin:0 0 7px;color:#8c703b;font-size:9px;font-weight:850;letter-spacing:.1em;text-transform:uppercase">Deal ${String(index + 1).padStart(2, '0')}</p>
            <p style="margin:0;font-family:Manrope,Arial,sans-serif;color:#17211f;font-size:24px;font-weight:850;letter-spacing:-.04em;line-height:1.15">${escapeHtml(label)}</p>
          </td>
          <td class="coupon-copy" valign="top" style="padding:21px 22px">
            <p style="margin:0 0 7px;color:#0d766e;font-size:10px;font-weight:800;letter-spacing:.08em;text-transform:uppercase">${escapeHtml(coupon.storeName)}</p>
            <h3 style="margin:0 0 8px;font-family:Manrope,Arial,sans-serif;color:#17211f;font-size:18px;font-weight:800;letter-spacing:-.025em;line-height:1.4"><a href="${url}" style="color:#17211f;text-decoration:none">${escapeHtml(coupon.title)}</a></h3>
            ${coupon.description ? `<p style="margin:0;color:#64716c;font-size:12px;line-height:1.65">${escapeHtml(coupon.description)}</p>` : ''}
            ${coupon.code ? `<table role="presentation" cellspacing="0" cellpadding="0" style="margin-top:14px"><tr><td style="padding:9px 12px;background:#f5f9f3;border:1px dashed #a9c3ac;border-radius:8px;color:#17211f;font-family:Consolas,monospace;font-size:13px;font-weight:850;letter-spacing:.04em">${escapeHtml(coupon.code)}</td><td style="padding-left:12px"><a href="${url}" style="color:#0d766e;font-size:11px;font-weight:800;text-decoration:none">Use code&nbsp; →</a></td></tr></table>` : `<p style="margin:13px 0 0"><a href="${url}" style="color:#0d766e;font-size:11px;font-weight:800;text-decoration:none">Get this deal&nbsp; →</a></p>`}
          </td>
        </tr>
      </table>
    </td></tr>
  `;
}

function renderCouponSection(coupons: InsiderDigestCoupon[], siteUrl: string) {
  if (coupons.length === 0) return '';
  return `
    <tr><td class="section-pad" style="padding:42px 34px 0">
      <p style="margin:0 0 9px;color:#8c703b;font-size:9px;font-weight:850;letter-spacing:.13em;text-transform:uppercase">03 · Codes worth trying</p>
      <h2 style="margin:0;font-family:Manrope,Arial,sans-serif;color:#17211f;font-size:28px;font-weight:850;letter-spacing:-.045em;line-height:1.2">Top 10 coupon deals</h2>
      <p style="margin:10px 0 22px;color:#64716c;font-size:12px;line-height:1.7">Active store offers, ordered by stated saving, code availability and how recently they were checked.</p>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
        ${coupons.map((coupon, index) => renderCoupon(coupon, siteUrl, index)).join('')}
      </table>
    </td></tr>
  `;
}

export function buildInsiderDigestEmail(input: {
  siteName: string;
  siteUrl: string;
  dayKey: string;
  deals: InsiderDigestProduct[];
  newest: InsiderDigestProduct[];
  coupons: InsiderDigestCoupon[];
  unsubscribeUrl: string;
}) {
  const safeSiteName = escapeHtml(input.siteName);
  const safeSiteUrl = escapeHtml(input.siteUrl);
  const safeUnsubscribeUrl = escapeHtml(input.unsubscribeUrl);
  const safeBrandIconUrl = escapeHtml(`${input.siteUrl}/brand/apple-touch-icon.png`);
  const topSaving = input.deals[0]?.discountPercent || 0;
  const totalPicks = input.deals.length + input.newest.length + input.coupons.length;
  const productText = (product: InsiderDigestProduct) => {
    const price = product.price > 0 ? ` — ${formatPrice(product.price)}` : '';
    const saving = product.discountPercent > 0 ? ` (save ${product.discountPercent}%)` : '';
    return `${product.name}${price}${saving}\n   ${product.shortDescription}\n   ${productUrl(input.siteUrl, product.slug)}`;
  };
  const dealsText = input.deals.map((product, index) => (
    `${index + 1}. ${productText(product)}`
  )).join('\n\n');
  const newestText = input.newest.map((product, index) => (
    `${index + 1}. ${productText(product)}`
  )).join('\n\n');
  const couponsText = input.coupons.map((coupon, index) => (
    `${index + 1}. ${coupon.title} — ${coupon.storeName}${coupon.saving ? ` (${coupon.saving})` : ''}${coupon.code ? `\n   Code: ${coupon.code}` : ''}\n   ${coupon.description}\n   ${storeUrl(input.siteUrl, coupon.storeSlug)}`
  )).join('\n\n');

  return {
    subject: `${input.siteName} Daily Edit — ${input.dayKey}`,
    text: [
      `${input.siteName} Daily Edit — ${input.dayKey}`,
      '',
      ...(dealsText ? ['Product price drops', dealsText, ''] : []),
      ...(newestText ? ['New in the catalogue', newestText, ''] : []),
      ...(couponsText ? ['Current store offers', couponsText, ''] : []),
      `Visit ${input.siteName}: ${input.siteUrl}`,
      '',
      `Unsubscribe: ${input.unsubscribeUrl}`,
    ].join('\n'),
    html: `
      <!doctype html>
      <html lang="en">
        <head>
          <meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
          <style>
            @media screen and (max-width:620px) {
              .outer-pad { padding:0 !important; }
              .email-shell { border-radius:0 !important; }
              .header-pad, .hero-pad, .section-pad, .footer-pad { padding-left:20px !important; padding-right:20px !important; }
              .hero-copy, .hero-stamp { display:block !important; width:auto !important; }
              .hero-stamp { padding:24px 0 0 !important; }
              .product-media, .product-copy, .coupon-saving, .coupon-copy { display:block !important; width:auto !important; }
              .product-media { padding:0 18px 14px !important; }
              .product-copy { padding:0 18px 20px !important; }
              .coupon-saving { border-right:0 !important; border-bottom:1px dashed #d8caaa !important; text-align:left !important; }
              .stat-label { font-size:8px !important; }
            }
          </style>
        </head>
        <body style="margin:0;background:#f3f5ef;color:#17211f;font-family:Arial,sans-serif">
          <table class="outer-pad" role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f5ef;padding:30px 14px">
            <tr><td align="center">
              <table class="email-shell" role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:680px;background:#fafbf7;border:1px solid #dfe6d9;border-radius:24px;overflow:hidden">
                <tr><td class="header-pad" style="padding:10px 34px;background:#17211f;color:#e8f1ed">
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr>
                    <td style="font-size:9px;font-weight:800;letter-spacing:.08em;text-transform:uppercase">Independent picks · Clear offer conditions</td>
                    <td align="right" style="font-size:9px;color:#b9cec5">Affiliate links disclosed</td>
                  </tr></table>
                </td></tr>
                <tr><td class="header-pad" style="padding:20px 34px;background:#fffdf8;border-bottom:1px solid #dfe6d9">
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr>
                    <td width="44"><img src="${safeBrandIconUrl}" alt="" width="38" height="38" style="display:block;width:38px;height:38px;border:0;border-radius:10px"></td>
                    <td style="font-family:Manrope,Arial,sans-serif;color:#17211f;font-size:20px;font-weight:850;letter-spacing:-.045em">${safeSiteName}</td>
                    <td align="right" style="color:#64716c;font-size:9px;font-weight:800;letter-spacing:.1em;text-transform:uppercase">Daily deals edit</td>
                  </tr></table>
                </td></tr>
                <tr><td class="hero-pad" style="padding:42px 34px 26px;background:#1b4937;color:#ffffff">
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr>
                    <td class="hero-copy" valign="middle">
                      <p style="margin:0 0 16px;color:#c5e6d7;font-size:9px;font-weight:850;letter-spacing:.13em;text-transform:uppercase">The daily edit · ${escapeHtml(input.dayKey)}</p>
                      <h1 style="margin:0;font-family:Manrope,Arial,sans-serif;color:#ffffff;font-size:38px;font-weight:850;letter-spacing:-.055em;line-height:1.08">Good deals.<br><span style="color:#d7f5ad">Less searching.</span></h1>
                      <p style="margin:18px 0 0;max-width:390px;color:#c1d6cd;font-size:13px;line-height:1.7">A thoughtful shortlist of price drops, fresh product picks and active store offers.</p>
                    </td>
                    <td class="hero-stamp" width="150" valign="middle" align="right" style="padding-left:24px">
                      <table role="presentation" cellspacing="0" cellpadding="0" style="width:142px;background:#d7f5ad;border:1px solid #e3f7c5;border-radius:18px"><tr><td align="center" style="padding:22px 12px;color:#153e33">
                        <p style="margin:0 0 7px;font-size:8px;font-weight:850;letter-spacing:.12em;text-transform:uppercase">Largest price change</p>
                        <p style="margin:0;font-family:Manrope,Arial,sans-serif;font-size:34px;font-weight:900;letter-spacing:-.05em;line-height:1">${topSaving > 0 ? `${topSaving}%` : totalPicks}</p>
                        <p style="margin:7px 0 0;font-size:9px;font-weight:800;text-transform:uppercase">${topSaving > 0 ? 'off' : 'fresh picks'}</p>
                      </td></tr></table>
                    </td>
                  </tr></table>
                </td></tr>
                <tr><td class="hero-pad" style="padding:0 34px 30px;background:#1b4937">
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#255443;border:1px solid #366554;border-radius:13px"><tr>
                    <td align="center" style="padding:15px 6px;border-right:1px solid #416c5d"><strong style="display:block;color:#ffffff;font-size:20px">${input.deals.length}</strong><span class="stat-label" style="color:#bcd1c8;font-size:9px;font-weight:750;text-transform:uppercase">Product deals</span></td>
                    <td align="center" style="padding:15px 6px;border-right:1px solid #416c5d"><strong style="display:block;color:#ffffff;font-size:20px">${input.newest.length}</strong><span class="stat-label" style="color:#bcd1c8;font-size:9px;font-weight:750;text-transform:uppercase">New arrivals</span></td>
                    <td align="center" style="padding:15px 6px"><strong style="display:block;color:#ffffff;font-size:20px">${input.coupons.length}</strong><span class="stat-label" style="color:#bcd1c8;font-size:9px;font-weight:750;text-transform:uppercase">Coupon deals</span></td>
                  </tr></table>
                </td></tr>
                ${renderProductSection('Product price drops', '01 · Current price changes', 'Published products ordered by their current percentage reduction.', input.deals, input.siteUrl, (product) => `${product.discountPercent}% lower`)}
                ${renderProductSection('Fresh on the shelf', '02 · Newest products', 'The latest products published to our independent catalogue.', input.newest, input.siteUrl, () => 'New arrival')}
                ${renderCouponSection(input.coupons, input.siteUrl)}
                <tr><td class="section-pad" style="padding:34px">
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#edf3e8;border:1px solid #dfe7d8;border-radius:16px"><tr><td align="center" style="padding:24px 20px">
                    <p style="margin:0 0 15px;color:#284c38;font-family:Manrope,Arial,sans-serif;font-size:19px;font-weight:800;letter-spacing:-.025em">Find the right offer for your everyday.</p>
                    <a href="${safeSiteUrl}" style="display:inline-block;background:#1b4937;border-radius:9px;color:#ffffff;text-decoration:none;font-size:12px;font-weight:800;padding:13px 20px">Browse all deals&nbsp; →</a>
                  </td></tr></table>
                </td></tr>
                <tr><td class="footer-pad" style="padding:25px 34px 30px;background:#fffdf8;border-top:1px solid #dfe6d9">
                  <p style="margin:0 0 9px;color:#53645a;font-size:10px;line-height:1.7">Offers can change. Check exclusions, delivery costs and the final total before paying. We may earn a commission from retailer links, at no extra cost to you.</p>
                  <p style="margin:0;color:#7b8781;font-size:10px;line-height:1.7">You received this daily edit because you confirmed your ${safeSiteName} email subscription. <a href="${safeUnsubscribeUrl}" style="color:#0d766e;text-underline-offset:2px">Unsubscribe</a>.</p>
                </td></tr>
              </table>
            </td></tr>
          </table>
        </body>
      </html>
    `,
  };
}
