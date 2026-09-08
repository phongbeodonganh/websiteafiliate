# Make Homepage Motion Feel Like a Live Technology Desk

Written against: 1d55f5f5f8f71d64d1cfc74428a33410552f5c86

## Evidence chain

- Surface: `/`, including the header, featured carousel, article cards, affiliate deals, newsletter, category sections, and floating controls.
- Problem: Motion is layered from multiple owners. `src/app/globals.css` applies an `!important` translate-and-scale transform to every button and role button, `PublicMotion` animates every `[data-motion]` element, and homepage components add separate scale, rotate, glow, zoom, and image transforms. The same interaction can therefore move at two or three different rates.
- Design evidence: `src/app/globals.css` already defines the canonical `PublicMotion` reveal and `clickable-card` image treatment, including a complete `prefers-reduced-motion` branch. The flat editorial homepage cards in `src/app/page.module.css` use restrained 160-480ms transitions and a single cubic-bezier family.
- Owner: `src/app/globals.css` for shared motion; `src/components/PublicMotion.tsx` for reveal orchestration; homepage consumers listed below.
- Scope and affected surfaces: `/` through `EditorialHeader`, `TechFinanceNewsClient`, `TopPicksWidget`, `LeadCapture`, `CategoryArticleSections`, `SocialFloatingBar`, and `ScrollToTop`. Shared global changes must also be regression-checked on article and collection routes.
- Uncertainty: None for the conflict. Exact visual timing must be validated with screenshots and reduced-motion emulation.

## Design decision

Use one motion grammar: content reveals once with `PublicMotion`; cards use image scale only; command buttons use a small lift; icon-only controls move their icon, not their container. The signature is a live signal scan in the technology-news hero: the scan crosses one orchestrated sequence of eyebrow, headline, coverage desk, copy, and actions. The featured carousel complements it with a seven-second progress rail and the existing restrained image settle. Ambient hero movement stays behind content, uses only transform/opacity/background-position, and is fully disabled by `prefers-reduced-motion`.

## Reuse

- `PublicMotion` and `[data-motion]` states in `src/components/PublicMotion.tsx` and `src/app/globals.css`.
- `--motion-delay` staggering already supplied by homepage lists.
- Exemplar: restrained `.featuredRead span` translation and `.editorialCardMedia img` scale in `src/app/page.module.css`.

## Changes

1. `src/app/globals.css`
   - Change: replace the universal `button`/`[role="button"]` `!important` transform rules with opt-in command-button styling; keep one 180-240ms easing token and a 1px lift; preserve the existing reduced-motion reset.
   - Preserve: visible focus states, `clickable-card` hit areas, and `PublicMotion` intersection behavior.
   - Verify: buttons no longer override component transforms and cards never scale their entire layout box.
2. `src/components/EditorialHeader.tsx`, `src/components/TopPicksWidget.tsx`, `src/components/LeadCapture.tsx`, and `src/components/CategoryArticleSections.tsx`
   - Change: remove hover scale, rotate, shimmer, glow, `animate-in`, and zoom utilities that duplicate the global owner. Keep color/border feedback and icon translation where it clarifies direction.
   - Preserve: search focus visibility, menu open/close, loading spinners, and form success/error feedback.
   - Verify: header search does not resize, cards do not shift the grid, and newsletter feedback appears without zoom.
3. `src/app/news-client.tsx` and `src/app/page.module.css`
   - Change: add the hero signal scanner and staged technology-desk entrance; make carousel slide changes use one keyed crossfade/settle sequence with a visible seven-second progress rail. Keep the interval, pause-on-hover/focus, controls, and reduced-motion stop.
   - Preserve: manual navigation, active dots, full excerpt, and keyboard interaction.
   - Verify: the hero sequence runs once, automatic and manual carousel changes feel identical, progress pauses with the carousel, and no copy/image flash occurs.

## Scope

- Inherit: all public surfaces using the corrected global motion selectors.
- Verify: `/article/[slug]`, `/latest`, `/hottest`, `/editorial-picks`, `/affiliates`, and `/category/[slug]` for hover regressions.
- Exclude: admin editor motion and affiliate sheet entrance behavior.

## Validation

- Product: browse the full homepage with mouse, keyboard, and touch; expected outcome is stable layout with one clear response per interaction.
- Interface: capture `/` at 1440x1100, 1024x768, 390x844, and 360x800; test carousel change, header search focus, newsletter submit states, card hover, and `prefers-reduced-motion: reduce`.
- System: confirm all homepage entrance reveals are owned by `PublicMotion` and no homepage utility reintroduces independent entrance animations.
- Repository: `npx eslint src/app/globals.css src/components/PublicMotion.tsx src/components/EditorialHeader.tsx src/components/TopPicksWidget.tsx src/components/LeadCapture.tsx src/components/CategoryArticleSections.tsx src/app/news-client.tsx && npm run build` -> no lint, type, or build errors.

## Stop conditions

- Stop if a shared global selector is proven to be required by an admin-only surface; scope the replacement to public layouts instead of changing that behavior.

## Design documentation

- After acceptance and validation: record the public motion ownership and reduced-motion contract in the current public design documentation if one is established; otherwise none.
