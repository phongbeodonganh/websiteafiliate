/**
 * Single source of truth for the AIDEALSUK brand name.
 *
 * Every place that needs to display or reference the site brand should import
 * from here so renaming the brand later is a one-line change.
 */
export const BRAND_NAME = 'AIDEALSUK';

/** Tagline displayed in the footer / about section */
export const BRAND_TAGLINE = 'Your Trusted Source for AI Tool Reviews, Tech News & Exclusive Affiliate Deals.';

/** Copyright line */
export const BRAND_COPYRIGHT = (year = new Date().getFullYear()) =>
  `© ${year} ${BRAND_NAME}. All Rights Reserved.`;

/** Canonical domain (used when DB settings are not yet loaded) */
export const BRAND_DOMAIN = 'https://aidealsuk.com';
