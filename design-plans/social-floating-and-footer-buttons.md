# Add Floating Right Social Bar and Enhance Footer Social Links with Platform SVGs

Written against: e2c81c26-c8bc-4c50-b763-7a0a7d71950e (2026-08-26)

## Evidence chain

- Surface: Public layout (`src/app/layout.tsx`) & Editorial Footer (`src/components/EditorialFooter.tsx`)
- Problem: 
  1. No sticky right-side floating social bar currently exists to follow users as they scroll up and down pages.
  2. `EditorialFooter.tsx` contains static letter placeholders (`['X', 'L', 'F']`) without active links, without Telegram, and without official social SVG logos or brand-harmonized color states.
- Design evidence: 
  - Monochromatic editorial aesthetic (`#111111` background, `#222222` / `#333333` borders, clean crisp SVG graphics).
  - Floating action button baseline in `src/components/ScrollToTop.tsx` (`position: fixed`, high z-index, responsive behavior).
- Owner: `src/components/EditorialFooter.tsx`, `src/components/SocialFloatingBar.tsx` (new component), `src/app/layout.tsx`
- Scope and affected surfaces: All public-facing routes (`/`, `/latest`, `/hottest`, `/editorial-picks`, `/affiliates`, `/category/[slug]`, `/article/[slug]`).
- Uncertainty: None. Social platforms requested are Telegram, X, LinkedIn, and Facebook.

## Design decision

1. Create a dedicated `src/components/SocialFloatingBar.tsx` component that:
   - Renders a fixed vertical toolbar on the right viewport edge (`fixed right-4 top-1/2 -translate-y-1/2 z-[940]`).
   - Includes official SVG vector logos for Telegram, X, LinkedIn, and Facebook.
   - Provides smooth scroll-tracking visibility, subtle scale/hover micro-interactions with platform brand hover accents (Telegram `#229ED9`, X `#FFFFFF`/`#111`, LinkedIn `#0A66C2`, Facebook `#1877F2`) while maintaining dark monochrome defaults.
   - Automatically hides on small mobile viewports (`hidden md:flex`) to avoid overlapping article body content or mobile navigation drawers.

2. Upgrade `src/components/EditorialFooter.tsx` to:
   - Replace primitive letter boxes with interactive SVG icon links for Telegram, X, LinkedIn, and Facebook.
   - Apply matching dark-mode borders (`#333333`), background transition states, tooltips (`aria-label`), and `target="_blank" rel="noopener noreferrer"` attributes.
   - Support dynamic fallback/configurable social media URLs.

## Reuse

- Vector SVG paths for Telegram, X (Twitter), LinkedIn, and Facebook.
- Design tokens: Dark background `#111111`, border `#222222` / `#333333`, typography `Inter`, transition `all 200ms ease`.
- Exemplar: `src/components/ScrollToTop.tsx` fixed positioning & z-indexing conventions.

## Changes

1. `src/components/SocialFloatingBar.tsx` (New Component)
   - Change: Create a client component with fixed vertical alignment on the right edge of the screen containing Telegram, X, LinkedIn, and Facebook SVG buttons.
   - Preserve: High z-index hierarchy (`z-[940]`) right below modals/tooltips and beside `ScrollToTop`.
   - Verify: Right-aligned vertical bar stays fixed while scrolling up and down the page.

2. `src/components/EditorialFooter.tsx`
   - Change: Update Column 1 social link section to render official Telegram, X, LinkedIn, and Facebook SVG icon buttons with hover transitions and valid link destinations.
   - Preserve: 4-column responsive grid layout, affiliate disclosure, and copyright footer bar.
   - Verify: Footer social icons match site dark aesthetics, display tooltips, and respond to hover events.

3. `src/app/layout.tsx`
   - Change: Include `<SocialFloatingBar />` alongside `<PublicMotion />` so floating social links are accessible across all public pages.
   - Preserve: Next.js root layout structure, metadata generator, and HTML/body styling.
   - Verify: Floating social buttons appear consistently on all public routes.

## Scope

- Inherit: All client pages using `layout.tsx` and `EditorialFooter.tsx`.
- Verify: Desktop breakpoint (>768px) vertical stack on right edge; mobile breakpoint (<=768px) hidden floating bar to preserve content readability.
- Exclude: Internal CMS / Admin views (`/admin/*`).

## Validation

- Product: Users can access social media links (Telegram, X, LinkedIn, Facebook) both from the persistent right side bar while scrolling and from the website footer.
- Interface: Test on desktop and mobile viewports; verify smooth hover states and SVG icon rendering.
- System: Confirm no layout shifts or z-index collisions with `ScrollToTop` or mobile nav.
- Repository: `npm run build` or `npm run dev` → 0 errors.

## Stop conditions

- Stop if social link target URLs require dynamic database model schema changes not supported by `SettingModel`.

## Design documentation

- After acceptance and validation: Record floating bar component structure in frontend component inventory if required.
