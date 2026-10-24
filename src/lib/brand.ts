/** Single source of truth for the public TheHavenDeals brand. */
export const BRAND_NAME = 'TheHavenDeals';

/** Tagline displayed in trust, legal, and editorial surfaces. */
export const BRAND_TAGLINE =
  'Independent everyday product picks, practical trade-offs, and retailer comparisons.';

export const BRAND_COPYRIGHT = (year = new Date().getFullYear()) =>
  `© ${year} ${BRAND_NAME}. All rights reserved.`;

/** Canonical domain used when database settings are unavailable. */
export const BRAND_DOMAIN = process.env.NEXT_PUBLIC_SITE_URL?.trim() || 'https://thehavendeals.com';

/** Public inbox used by trust, legal, and editorial pages. */
export const BRAND_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim() || '';

/** Shared logo and reference palette, used across public pages and the CMS. */
export const BRAND_LOGO = '/brand/thehavendeals-logo.svg';
export const BRAND_ICON = '/brand/thehavendeals-icon.svg';
export const BRAND_COLORS = { green: '#124B3C', gold: '#C5A052', cream: '#F8F4E6' } as const;
