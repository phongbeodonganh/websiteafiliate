# Turn the Homepage Into an AI-Economy Editorial Front Door

Written against: 1d55f5f5f8f71d64d1cfc74428a33410552f5c86

## Evidence chain

- Surface: `/` from `EditorialHeader` through the primary article feed, category shelves, affiliate deals, newsletter, and `EditorialFooter`.
- Problem: the homepage currently opens directly on a full-bleed featured-story carousel and then separates hottest, latest, editorial, affiliate, and newsletter content into similarly weighted rectangular sections. That structure does not provide the requested brand-level hero, asymmetric bento hierarchy, or a unified conversion destination near the bottom.
- Design evidence: the Phase 2 brief requires a modern glow-backed hero with two high-contrast actions, a large multi-column top story surrounded by smaller glass cards, tactile card feedback, and a distinct newsletter/affiliate area. `src/app/globals.css` and `src/app/page.module.css` establish the current editorial canvas, 1440px rail, Plus Jakarta Sans/Inter pairing, square geometry, teal `#0D766E` signal color, mint `#85ddd5` hero accent, and reduced-motion behavior. The supplied UI audit identifies the homepage composition and confirms these owners.
- Owner: homepage composition in `src/app/news-client.tsx`; homepage tokens, layout, and interaction presentation in `src/app/page.module.css`; conversion content and behavior in `src/components/TopPicksWidget.tsx` and `src/components/LeadCapture.tsx`.
- Scope and affected surfaces: `/` only. The existing editorial variants of `TopPicksWidget` and `LeadCapture` are homepage-only at this commit.
- Uncertainty: affiliate results can be empty and `TopPicksWidget` then renders nothing; the conversion shell must remain intentional when only the newsletter is present.

## Design decision

Give the homepage one explicit editorial thesis before the news feed: “The edge where AI, money & better tools meet.” Render it on an ink-black signal field with restrained teal/mint light, direct routes to Latest and Affiliates, and a factual coverage index instead of decorative statistics. Follow it with a 12-column “Signal Desk” bento grid: an 8-column carousel lead, two stacked 4-column secondary cards, then three editorial cards with an intentionally uneven 6/3/3 rhythm. Move category shelves before a single dark conversion zone that holds exclusive deals and the newsletter as related reader benefits. Keep square corners and the existing typography so this reads as a sharper AIDEALSUK homepage, not a replacement brand.

## Reuse

- `--editorial-canvas`, `--editorial-surface`, `--editorial-ink`, `--editorial-copy`, `--editorial-muted`, `--editorial-divider`, `--ed-verdict`, and `--ed-accent-glow` from `src/app/globals.css`.
- `--home-rail`, `--home-gutter`, and `--home-section-gap` from `src/app/page.module.css`.
- Existing `EditorialHeader`, `EditorialBackdrop`, `PublicArticleImage`, `CategoryArticleSections`, `TopPicksWidget`, `LeadCapture`, and `EditorialFooter` owners.
- Existing featured carousel state, pause behavior, story controls, data fetching, stretched-link focus treatment, and `data-motion` motion system.
- Exemplar: the current featured story's dark image overlay and mint accent, refined into the lead bento card.

## Changes

1. `src/app/news-client.tsx`
   - Change: add a standalone homepage hero with explicit publication positioning, “Read Latest News” and “Explore AI Tools” actions, and a three-part coverage index; replace the hottest/latest/editorial stacks with one semantic bento story section containing the existing lead carousel, two secondary latest stories, and three editor-curated stories; move category shelves ahead of a combined conversion zone.
   - Preserve: article/search data flow, featured rotation and controls, loading/error behavior, all article/collection routes, and article-card links.
   - Verify: the first viewport communicates the publication purpose and offers both requested actions; the story grid has one unmistakable lead at desktop and a sensible single-column order on mobile.
2. `src/app/page.module.css`
   - Change: define the dark signal hero, teal/mint headline gradient, subtle ambient glows, 12-column bento geometry, translucent secondary cards, card lift/border/text/image hover feedback, conversion-zone shell, and responsive/reduced-motion behavior.
   - Preserve: 1440px rail, responsive gutters, square-corner identity, Plus Jakarta Sans/Inter hierarchy, editorial tokens, existing collection-page styles, and focus visibility.
   - Verify: no content overflow at 320px; card hover does not move surrounding layout; reduced-motion mode removes ambient and transform animations.
3. `src/components/TopPicksWidget.tsx`
   - Change: restyle only the homepage-owned `editorial` variant as a transparent dark conversion panel with mint signal accents and glass deal cards, retaining the default variant untouched.
   - Preserve: affiliate fetch, sponsored redirect semantics, empty/loading behavior, commission/cookie information, and view-all route.
   - Verify: deal cards remain legible and actionable inside the shared dark conversion zone.
4. `src/components/LeadCapture.tsx`
   - Change: refine only the homepage-owned `editorial` variant to sit beside the deal panel as a compact newsletter offer with matching dark/glass treatment and direct copy.
   - Preserve: subscription API, success/error feedback, email validation, loading state, and default variant spacing.
   - Verify: the form remains the single dominant action in its panel and stacks below deals at smaller viewports.

## Scope

- Inherit: `/` and homepage search states rendered by `TechFinanceNewsClient`.
- Verify: `TopPicksWidget` and `LeadCapture` default variants if they are reintroduced elsewhere; loading, error, no-results, one-story, and full-data homepage states.
- Exclude: article detail pages, collection-page structure, admin routes, API contracts, data models, and new image assets.

## Validation

- Product: scan `/` from header to footer; expected outcome is hero positioning, news discovery, topical browsing, then one visually distinct conversion destination.
- Interface: verify default and search states at 1440x1000, 1024x768, 768x1024, 390x844, and 320x568; test long titles, missing images, two or fewer secondary articles, empty affiliates, keyboard focus, hover, and reduced motion.
- System: confirm all new colors derive from existing editorial/teal values, no rounded-card system is introduced, and shared components change only behind `variant="editorial"`.
- Repository: `npx eslint src/app/news-client.tsx src/components/TopPicksWidget.tsx src/components/LeadCapture.tsx && npm run build` → no lint, type, or build errors.

## Stop conditions

- Stop if Phase 1 introduced a newer homepage owner outside `TechFinanceNewsClient`, or if the editorial component variants are used by a non-homepage route and cannot safely inherit the conversion treatment.

## Design documentation

- After acceptance and validation: record the “signal hero → bento desk → conversion zone” homepage hierarchy and the rule that teal glow is reserved for orientation and actionable emphasis in the governing public design document if one is established; otherwise none.
