# Keep Homepage News Structure Present in Every State

Written against: 1d55f5f5f8f71d64d1cfc74428a33410552f5c86

## Evidence chain

- Surface: `/` initial load, empty result, search result, and article-fetch failure.
- Problem: `src/app/news-client.tsx` conditionally removes the entire hero/news/editorial hierarchy when `featured` is absent, while affiliate, newsletter, category, and footer sections remain. Rendered production evidence showed a small “Unable to load articles” box followed directly by the newsletter and footer, making the page look incomplete and shifting the primary reading path away from news.
- Design evidence: The same runtime surface establishes the featured/news hierarchy as the homepage's primary task. `src/app/page.module.css` already owns `loadingScreen`, `statusMessage`, and the dimensions of `.featured`, `.hottest`, `.latest`, and `.editorial`; these owners can express stable states without inventing a second UI language.
- Owner: state composition in `src/app/news-client.tsx`; state styling in `src/app/page.module.css`.
- Scope and affected surfaces: `/` default load and `/?q=...` search states.
- Uncertainty: The underlying data failure is outside this visual plan; retry behavior should reuse the existing public articles request rather than introduce new API semantics.

## Design decision

Preserve the homepage's editorial silhouette during loading, empty, and failure states. Use rail-aligned skeleton blocks for initial loading, a compact inline retry panel inside the news shell for failures, and a search-specific empty state that retains navigation to Latest and Categories. Do not use a viewport-covering loader after the server-rendered header is visible.

## Reuse

- `.shell`, `.featured`, `.hottest`, `.latest`, `.editorial`, `.statusMessage`, and editorial tokens from `src/app/page.module.css`.
- Existing article fetch parameters and `clearSearch` behavior in `src/app/news-client.tsx`.
- Exemplar: the stable aspect ratios and grid tracks already defined for populated news sections.

## Changes

1. `src/app/news-client.tsx`
   - Change: render the news shell in all states; replace the full-screen loading overlay with structural skeleton content; place error and empty messaging in the shell; add a clear `Try again` command that re-runs the existing request and a `Clear search` command only for search-empty/error states.
   - Preserve: server-provided `initialData`, abort behavior, current API contracts, successful article composition, and all lower homepage sections.
   - Verify: loading, error, empty, and success states occupy a stable top-of-page region and never jump directly from header to conversion content.
2. `src/app/page.module.css`
   - Change: add skeleton and inline state styles derived from the existing hero/list geometry; use a subtle neutral pulse only when reduced motion is not requested; constrain error copy and commands to the shared rail.
   - Preserve: populated hero/list styles and current responsive stacking order.
   - Verify: skeletons do not cause layout shift when articles appear, and state text/buttons never overflow at 320px.
3. `src/components/CategoryArticleSections.tsx`
   - Change: align its loading/error presentation with the homepage inline-state treatment when rendered on `/`; avoid raw backend wording in the visible message while retaining diagnostic detail for logs.
   - Preserve: lazy loading, pagination, abort behavior, and populated category presentation.
   - Verify: a category failure remains subordinate to the primary news area and does not look like an unstyled system alert.

## Scope

- Inherit: homepage search through the same `TechFinanceNewsClient` owner.
- Verify: server preload success, client refetch success, API timeout, empty database, no search matches, and category endpoint failure.
- Exclude: fixing database credentials, API availability, caching policy, or non-homepage collection states.

## Validation

- Product: throttle the article request, force 500/empty/success responses, and search for a missing term; expected outcome is a stable, publication-like homepage with a clear next action in every state.
- Interface: capture each state at 1440x900, 768x1024, 390x844, and 320x568; compare top-of-page heights and confirm no large blank canvas or newsletter-first result.
- System: confirm state presentation reuses the homepage shell and editorial tokens, with no new standalone alert component unless another public owner already exists.
- Repository: `npx eslint src/app/news-client.tsx src/components/CategoryArticleSections.tsx && npm run build` -> no lint, type, or build errors.

## Stop conditions

- Stop if retry requires a new public API contract or changes cache semantics; keep the plan visual and request backend work separately.

## Design documentation

- After acceptance and validation: document that the homepage preserves its editorial hierarchy through loading, empty, and failure states if a current public design document is established; otherwise none.
