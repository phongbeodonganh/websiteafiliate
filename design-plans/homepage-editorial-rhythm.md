# Unify Homepage Editorial Rhythm

Written against: 1d55f5f5f8f71d64d1cfc74428a33410552f5c86

## Evidence chain

- Surface: `/` from fixed header through featured/news grids, editorial picks, affiliate deals, newsletter, category sections, and footer.
- Problem: Adjacent sections use different container widths, vertical intervals, heading scales, border treatments, and component emphasis. The news shell is capped at 1536px, the footer at 1440px, homepage wrappers use 40px bottom spacing, and `LeadCapture` independently adds `my-16`. The result reads as assembled widgets instead of one publication front page.
- Design evidence: `src/app/globals.css` defines the binding editorial palette (`--editorial-canvas`, `--editorial-surface`, `--editorial-ink`, `--editorial-copy`, `--editorial-muted`, `--editorial-divider`, `--ed-verdict`) and typography contract (Plus Jakarta Sans headings, Inter body). `src/app/page.module.css` establishes flat white surfaces, square corners, 1px dividers, 2px section rules, and a full-width photographic cover story.
- Owner: `src/app/page.module.css` for homepage composition; editorial variants in `TopPicksWidget`, `LeadCapture`, and `CategoryArticleSections`; `EditorialFooter` for the terminal band.
- Scope and affected surfaces: `/` only, while preserving reusable default variants on other routes.
- Uncertainty: Live article data was unavailable during rendered inspection, so long-title and long-excerpt validation requires fixtures or a working data connection.

## Design decision

Treat AIDEALSUK as a modern AI/technology newsroom for readers scanning for credible, current analysis. Keep the existing palette and typography. Standardize on one 1440px editorial rail, 24px desktop gutters/16px mobile gutters, a 48px desktop and 32px mobile section rhythm, square 1px surfaces, and one heading hierarchy. The photographic featured carousel remains the single expressive signature; everything below it becomes quieter and denser.

## Reuse

- Palette: Canvas `#f5f5f2`, Paper `#ffffff`, Ink `#111111`, Copy `#374151`, Muted `#6B7280`, Signal `#0D766E`.
- Type: Plus Jakarta Sans for display/editorial headings; Inter for copy and controls; existing mono treatment only for data-like labels.
- Exemplar: `.editorial`, `.editorialGrid`, `.sectionRule`, `.eyebrow`, and `.meta` in `src/app/page.module.css`.

## Changes

1. `src/app/page.module.css`
   - Change: introduce homepage-local rail, gutter, and section-gap custom properties; set all homepage wrappers to the same 1440px rail; normalize desktop/mobile spacing and section heading sizes; keep `Hottest` and `Latest` aligned beneath the full-width hero.
   - Preserve: current content order, carousel composition, responsive single-column order, editorial color tokens, and square-corner identity.
   - Verify: every major section starts on the same left/right guides and vertical gaps remain consistent from hero to footer.
2. `src/components/TopPicksWidget.tsx` and `src/components/CategoryArticleSections.tsx`
   - Change: refine only the `editorial`/homepage presentation to reuse the page's section header pattern, border/divider colors, metadata type, card padding, image ratio, and view-all command style. Reduce badges and icon blocks to supporting emphasis.
   - Preserve: data fetching, affiliate tracking, category pagination, default variants, links, and loading/empty states.
   - Verify: these sections read as continuations of Editorial Picks rather than separate dashboard widgets.
3. `src/components/LeadCapture.tsx`
   - Change: add/clarify a homepage editorial variant with no external `my-16`, align its content to the same rail, reduce nested-card emphasis, and keep the black band as the sole conversion interruption between editorial groups.
   - Preserve: value proposition, email submission, response messages, and mobile stacking.
   - Verify: the newsletter has one clear form action and does not introduce a second independent spacing system.
4. `src/components/EditorialFooter.tsx`
   - Change: align the footer inner grid to the 1440px homepage rail and replace inline one-off spacing/color values with existing editorial tokens or locally named constants where CSS tokens cannot be consumed.
   - Preserve: link groups, disclosure, social links, category fallback, copyright, and responsive columns.
   - Verify: the footer begins on the same guide as the preceding section at 1440px, 1024px, and 390px.

## Scope

- Inherit: homepage instances of reusable components where `variant="editorial"` is passed.
- Verify: default `TopPicksWidget` and `LeadCapture` variants remain visually unchanged outside `/`.
- Exclude: article detail layout, admin routes, content copy changes, and a new brand palette or font family.

## Validation

- Product: scan the homepage top to bottom; expected outcome is a clear sequence of cover story, current/most-read news, curated analysis, deals, newsletter, topic shelves, and footer.
- Interface: screenshots at 1440x1100, 1280x800, 1024x768, 768x1024, 390x844, and 360x800 with short/long titles, missing images, full featured excerpt, empty affiliate data, and four category shelves.
- System: inspect computed styles to confirm one rail width, one gutter value per breakpoint, and editorial tokens rather than new arbitrary colors.
- Repository: `npx eslint src/app/news-client.tsx src/components/TopPicksWidget.tsx src/components/LeadCapture.tsx src/components/CategoryArticleSections.tsx src/components/EditorialFooter.tsx && npm run build` -> no lint, type, or build errors.

## Stop conditions

- Stop if the 1440px rail conflicts with a documented publication-width decision not present at this commit, or if a reusable component cannot isolate homepage changes behind its existing variant.

## Design documentation

- After acceptance and validation: document the 1440px rail, responsive gutters, section rhythm, and “one expressive hero” rule in the governing public design document if one exists; otherwise none.
