# TheHavenDeals identity

The public brand is **TheHavenDeals**. The shared logo is recreated from the supplied reference as portable SVG paths, with no runtime font dependency.

- Green: `#124B3C`
- Gold: `#C5A052`
- Cream: `#F8F4E6`
- Wordmark: `public/brand/thehavendeals-logo.svg`
- Monogram: `public/brand/thehavendeals-icon.svg`
- Shared component: `src/components/BrandLogo.tsx`
- Brand constants: `src/lib/brand.ts`

Headers, footers, storefront, editorial and policy pages, newsletter result pages, admin and login share the same logo. Favicon, touch icon, metadata, structured publisher names, newsletter copy and UI text use the new identity. Existing retailer links, URL slugs, authentication and reading-preference storage keys are preserved.

## Persisted settings

`scripts/rebrand-thehavendeals.ts` previews branding changes by default. `--apply` updates only the listed display fields and stores a reversible backup in `/tmp/thehavendeals-brand-backup-<timestamp>.json` before writing. The local settings record has been updated with the brand, logo, favicon and reference colors. No article or retailer record required a branding change.

## Deployment configuration still pending

The owner is purchasing `thehavendeals.com` and will provide the final domain and contact email later. Existing configured canonical domains and mailboxes have not been changed. The fallback domain in source is the intended `https://thehavendeals.com`; it is not a DNS or hosting change.

At deployment, set and verify:

- `NEXT_PUBLIC_SITE_URL`: the final HTTPS origin; also update the CMS canonical URL.
- `NEXT_PUBLIC_CONTACT_EMAIL`: the approved public contact inbox. Until supplied, public policy pages link to the contact page and the contact page shows a clear pending state. Coupon reporting remains available.
- `EMAIL_SITE_NAME=TheHavenDeals`
- `EMAIL_FROM`, `EMAIL_REPLY_TO`: the actual verified mailboxes. Sending transport addresses have been preserved; sender display text uses TheHavenDeals. No emails were sent during this migration.

Public configuration values should be supplied at build time because Next.js embeds `NEXT_PUBLIC_*` values in client bundles.

## Validation

TypeScript and scoped ESLint checks pass; the existing root layout reports its pre-existing external-font warning. The targeted regression suite covers article metadata, newsletter flow/digests, block pages, settings colors and coupon/store discovery. Browser checks cover public route responses, loaded logo assets, absence of the former display name, console exceptions and layout at 320px, 390px and 1440px.
