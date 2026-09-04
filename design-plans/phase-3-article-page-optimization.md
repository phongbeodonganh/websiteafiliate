# Build a Dark Reading Chamber for Individual Articles

Written against: 0c971bf2f7e1cd799c196b98f2f98cdf2b0207ae

## Evidence chain

- Surface: `/article/[slug]` from `EditorialHeader` and breadcrumb through article masthead, sanitized long-form content, affiliate recommendations, share controls, sidebar, related stories, and `EditorialFooter`.
- Problem: the current article card is a light, nearly full-width content surface with no table of contents. Rich content has only minimal styles, metadata omits reading time, the sidebar prioritizes deals/latest links over reading orientation, and related stories remain constrained inside the reading card. This directly conflicts with the selected Phase 3 requirements for a dark high-end reading surface, 65–75-character measure, rich blockquote/link/code treatments, sticky contents and sponsor rail, explicit author/read metadata, top-aligned sharing, and a bottom continuation grid.
- Design evidence: the Phase 3 brief is the binding surface contract. Existing owners establish Plus Jakarta Sans for display text, Inter for reading/UI text, square geometry, a 1440px public rail, `#0D766E` verdict teal, and `#85DDD5` signal mint. Phase 2 reserves glow for orientation and actionable emphasis; the article page should inherit that rule rather than create a separate neon system.
- Owner: route composition and data selection in `src/app/article/[slug]/page.tsx`; article layout and rich-content presentation in `src/app/article/[slug]/article.module.css`; sanitized content rendering in `src/components/ArticleContent.tsx`; share behavior in `src/components/SocialShare.tsx`; affiliate rail presentation in `src/components/VerticalAffiliateSidebar.tsx`.
- Scope and affected surfaces: individual public articles at `/article/[slug]`. Shared `VerticalAffiliateSidebar` changes must be isolated behind a new article variant because collection routes also consume its default presentation.
- Uncertainty: the user model has an avatar but no biography field, so the author panel must use factual publication-level copy and avoid inventing personal credentials.

## Design decision

Use a near-black reading canvas with one centered glass article chamber. Keep the title and lead image broad for editorial impact, then narrow the prose to `72ch` and pair it with a 320px sticky rail. The rail begins with a client-derived table of contents whose active mint marker acts as the page’s signature “reading signal,” followed by the existing affiliate owner in an article-only dark variant. Put sharing in the masthead, add a publication-safe author panel after the prose, and move related stories into a full-width bottom grid. Terminal styling uses true code semantics and subdued green/mint details rather than decorative cyberpunk effects.

## Reuse

- `--editorial-ink`, `--editorial-copy`, `--editorial-muted`, `--editorial-divider`, `--ed-verdict`, and the Phase 2 mint `#85DDD5`.
- Existing `EditorialHeader`, `EditorialFooter`, `EditorialBackdrop`, `PublicArticleImage`, `ArticleContent`, `SocialShare`, `VerticalAffiliateSidebar`, `EditorVerdict`, `AffiliateCtaBlock`, and `StickyMobileBar` behaviors.
- Existing sanitized `h2`, `h3`, `blockquote`, `a`, `pre`, and `code` elements from `sanitizeArticleContent`.
- Exemplar: the Phase 2 signal panel’s restrained glass, mono utility labels, and action-only glow.

## Changes

1. `src/app/article/[slug]/page.tsx`
   - Change: compute reading time; expose the populated author avatar; compose a masthead with category, title, author/date/read/view metadata, and compact share controls; identify the content root for table-of-contents discovery; add a publication-safe author bio; build a sticky rail with contents, sponsor space, and latest links; move related stories into a full-width image-backed “Read Next” section.
   - Preserve: metadata/JSON-LD, view counting, Mongo queries, related ranking, sanitized content, affiliate tracking, sticky mobile CTA, breadcrumbs, and not-found behavior.
   - Verify: the route presents one coherent reading sequence and all existing destinations/actions remain available.
2. `src/app/article/[slug]/article.module.css`
   - Change: implement the dark/glass article shell, 72ch reading measure, hierarchical heading scale, 1.82 body leading, rich blockquote/link/code/table/media styles, two-column desktop grid, sticky rail, author panel, and responsive bottom grid.
   - Preserve: 1440px outer rail, square geometry, Plus Jakarta Sans/Inter pairing, mobile breakpoints, focus visibility, and reduced-motion behavior.
   - Verify: prose stays within 65–75 characters at desktop, never overflows at 320px, and terminal/table content scrolls horizontally when needed.
3. `src/components/ArticleTableOfContents.tsx` and `src/components/ArticleTableOfContents.module.css`
   - Change: add a client component that discovers sanitized H2/H3 headings, assigns stable unique IDs, tracks the active section with `IntersectionObserver`, and renders a compact anchored outline.
   - Preserve: article HTML and CMS content; do not mutate heading text or persist generated IDs.
   - Verify: clicking a contents item scrolls to the correct heading and the active item updates while reading; render nothing when no eligible headings exist.
4. `src/components/ArticleContent.tsx`
   - Change: accept an optional DOM ID so the contents component can scope its heading discovery.
   - Preserve: sanitized HTML rendering and adaptive table-column sizing.
   - Verify: existing callers compile unchanged and article tables retain calculated widths.
5. `src/components/SocialShare.tsx` and `src/components/SocialShare.module.css`
   - Change: add a compact masthead variant with icon-forward dark buttons while retaining the current full variant as the default.
   - Preserve: Facebook/X/LinkedIn targets, native share fallback, copy fallback, and status feedback.
   - Verify: compact controls wrap without overflow and remain keyboard accessible.
6. `src/components/VerticalAffiliateSidebar.tsx`
   - Change: add an `article` variant with dark glass cards and mint actions for the article rail; leave the default collection variant unchanged.
   - Preserve: API loading, hide-when-empty behavior, sponsored redirects, item limits, and optional sticky behavior.
   - Verify: collection routes do not inherit Phase 3 styling.

## Scope

- Inherit: all published `/article/[slug]` pages and the article-only variants explicitly passed by that route.
- Verify: articles with no headings, no author avatar, no key takeaways, no affiliate placements, no related articles, long headings, wide tables, code blocks, and missing images; collection sidebar default variant.
- Exclude: homepage, collection layouts, CMS editing behavior, author-profile schema, article API contracts, and database migrations.

## Validation

- Product: read a long article from masthead to Read Next; expected outcome is clear orientation, comfortable sustained reading, visible sponsor disclosure, and obvious continuation choices.
- Interface: capture at 1440x1100, 1180x900, 820x1180, 390x844, and 320x568; exercise ToC anchors/active state, share/copy controls, code overflow, long words, wide tables, empty rail data, and reduced motion.
- System: confirm the article uses existing display/body fonts, the 1440px rail, article-only sidebar/share variants, and one mint signal accent rather than parallel global tokens.
- Repository: `npx eslint src/app/article/[slug]/page.tsx src/components/ArticleContent.tsx src/components/ArticleTableOfContents.tsx src/components/SocialShare.tsx src/components/VerticalAffiliateSidebar.tsx && npm test && npm run build` → no lint, test, type, or build errors.

## Stop conditions

- Stop if headings are not present in the sanitized runtime HTML, the article sidebar variant leaks to collection routes, or adding a real personal bio would require inventing or migrating author data.

## Design documentation

- After acceptance and validation: record the 72ch reading measure, sticky reading-signal rail, and article-only dark rich-content treatments in the governing public design document if one is established; otherwise none.
