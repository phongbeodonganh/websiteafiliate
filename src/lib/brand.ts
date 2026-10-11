/** Single source of truth for the public GoodPick brand. */
export const BRAND_NAME = 'GoodPick';

/** Tagline displayed in trust, legal, and editorial surfaces. */
export const BRAND_TAGLINE =
  'Independent everyday product picks, practical trade-offs, and retailer comparisons.';

export const BRAND_COPYRIGHT = (year = new Date().getFullYear()) =>
  `© ${year} ${BRAND_NAME}. All rights reserved.`;

/** Canonical domain used when database settings are unavailable. */
export const BRAND_DOMAIN = process.env.NEXT_PUBLIC_SITE_URL?.trim() || 'https://goodpick.eu';

/** Public inbox used by trust, legal, and editorial pages. */
export const BRAND_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim() || 'hello@goodpick.eu';
