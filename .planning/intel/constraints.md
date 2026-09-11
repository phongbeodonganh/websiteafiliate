# Synthesized Constraints (SPEC intel)

SPEC currency: `specv2.md` (V5.2 BLACKLIST INTERCEPTOR EDITION) is the current revision of the website spec; `spec.md` (V4.0 EXTENDED) and `Spec_Website_Affiliate_V3.md` (V3) are earlier revisions. Later revision governs overlapping scope — see INFO section of `.planning/INGEST-CONFLICTS.md`. Status markers inside entries: GOVERNING (latest revision, in force) / STANDING (not restated or contradicted by later revisions) / SUPERSEDED (retained verbatim for provenance).

---

## MongoDB Datastore & Collection Model (V5.2)
- source: specv2.md
- type: schema
- content: Status: GOVERNING (V5.2, latest revision). Platform: MongoDB Atlas with Mongoose ODM, on Next.js (App Router, Turbopack, Server Components) + TypeScript + TailwindCSS. Atlas DNS optimized via `dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4'])`. Nine main collections: `users`, `categories`, `sub_categories`, `articles`, `affiliate_links`, `article_affiliate_relations`, `click_logs`, `settings`, `blacklists`. System brand: AI AFFILIATE HUB (`aiaffiliatehub.com`).

## V5.2 Collection — users
- source: specv2.md
- type: schema
- content: Status: GOVERNING. `_id` ObjectId (PK); `username` String (unique, required); `password_hash` String (Bcrypt); `role` String ('admin' | 'editor' | 'author'); `name` String (display name of author/editor); `status` String ('active' | 'inactive'); `avatar` String (character or avatar URL).

## V5.2 Collections — categories & sub_categories (AI-niche taxonomy)
- source: specv2.md
- type: schema
- content: Status: GOVERNING. Two-level category config: main Use-Case categories plus AI-tool sub-categories. Top level `AI Use Cases` (`ai-use-cases`) with sub-categories: AI for Creators & Media (`ai-for-creators-media` — YouTube automation, faceless video channels, Avatars & Presenters, AI Music); AI for Real Estate & Sales (`ai-for-real-estate-sales` — CRM automation, lead allocation, real-estate CS chatbots); AI for E-commerce & Business (`ai-for-e-commerce-online-business` — Shopee/Lazada optimization, auto product descriptions); AI for Marketers & Agencies (`ai-for-marketers-agencies` — ad script generation, automated SEO content); AI for Finance & Legal (`ai-for-finance-legal-consulting` — financial analysis, auto contract drafting). Additional top-level categories: AI Content & Copywriting (`ai-content-copywriting`); AI Video & Image Generation (`ai-video-image-generation`); AI Automation & Agents (`ai-automation-agents`); AI Marketing & Sales (`ai-marketing-sales`); AI Audio & Code (`ai-audio-code`).

## V5.2 Collection — articles (SEO/GEO-extended)
- source: specv2.md
- type: schema
- content: Status: GOVERNING. `_id` ObjectId (PK); `author_id` ObjectId (Ref: users); `category_id` ObjectId (Ref: categories); `sub_category_id` ObjectId (Ref: sub_categories); `title` String (SEO title); `slug` String (unique, e.g. `case-study-faceless-youtube-automation`); `excerpt` String (short sapo); `content` String (HTML / Rich Text); `status` String ('draft' | 'published'); `is_featured` Boolean (spotlight); `view_count` Number (default 0); `revenue` Number (estimated $); `thumbnail_url` String; `focus_keyword` String (target SEO keyword); `key_takeaways` Array[String] (summary points for generative AI engines — LLMs: ChatGPT, Claude, Perplexity); `entities` Array[String] (entity/brand identifiers, e.g. OpenAI, GPT-4, NVIDIA H100); `faq_schema` Array[{question, answer}] (auto-embedded FAQPage JSON-LD); `affiliate_placements` Array[{affiliate_link_id, position_label}] (multi-position affiliate links: `top_cta`, `middle`, `footer_cta`).

## V5.2 Collections — affiliate_links, article_affiliate_relations, click_logs
- source: specv2.md
- type: schema
- content: Status: GOVERNING. `affiliate_links` (central store, Admin-managed): `name` (campaign name, e.g. HeyGen AI, Jasper AI, Canva Pro); `base_url` (affiliate URL, e.g. `https://heygen.com/?via=aiaffiliatehub`); `commission` (e.g. `30% Recurring`, `50$ / Signup`); `cookie` (30 or 90 days). `article_affiliate_relations`: multiple affiliate links attached to one article at positions (`top_cta`, `middle_comparison`, `footer_banner`) — note the spec also embeds `affiliate_placements` directly on articles (see articles entry); both mechanisms extracted as written. `click_logs`: records IP address, User-Agent, click time, and article context on affiliate button clicks.

## V5.2 Collection — settings (SEO, GEO & Branding)
- source: specv2.md
- type: schema
- content: Status: GOVERNING. `site_title`: "AI AFFILIATE HUB"; `canonicalUrl`: "https://aiaffiliatehub.com"; `geoTarget`: "US, VN, GLOBAL"; `primary_color`: "#0056B3" (Royal Blue); `accent_color`: "#FF6B6B" (Coral Orange); `footer_text`: standard English brand description.

## V5.2 Collection — blacklists (IBlacklist)
- source: specv2.md
- type: schema
- content: Status: GOVERNING. Stores scam / non-paying-commission / ads-violating domains, loaded from Google Sheet or declared by Admin. TypeScript interface `IBlacklist`: `id` string; `project_name` string (e.g. NordVPN, Scalenut); `website_url` string (e.g. https://nordvpn.com); `extracted_domain` string (auto-extracted root domain, e.g. nordvpn.com); `match_type`: 'domain' | 'exact_url' ('domain' = wildcard-blocks all subdomains, 'exact_url' = blocks exact URL); `reason` string (e.g. "Bắt Ads - Không trả tiền"); `blocked_countries?` string[] (e.g. ["Bồ Đào Nha", "Ba Lan"]); `status`: 'active' | 'inactive'; `created_by?` string (creating Admin ID); `created_at`/`updated_at` Date.

## V5.2 Blacklist bulk import — POST /api/v1/cms/blacklist/import-sheet-url
- source: specv2.md
- type: api-contract
- content: Status: GOVERNING. Admin submits any Google Sheet URL (e.g. `https://docs.google.com/spreadsheets/d/1HNAJ6F_EBzVs0bqBfC2mt2pFQHCtCNlIRGXDRnNvEuQ/...`). Mechanism: auto-convert Sheet URL to live CSV export path (`/export?format=csv&gid=...`); download CSV directly; read all 300+ rows; detect columns Project Name / Website URL / Block reason / Blocked countries; extract root domain; bulk-save into MongoDB. Retroactive Sweeper Integration: automatically triggers a background scan that deactivates and marks `blacklisted` every active affiliate campaign in the system matching the newly imported domains.

## V5.2 URL structure & legacy redirects
- source: specv2.md
- type: protocol
- content: Status: GOVERNING. Article detail path: `/article/[slug]` (e.g. `https://aiaffiliatehub.com/article/case-study-faceless-youtube-automation-ai-avatars`). Backward-compatible redirects: every legacy path of form `/bai-viet/[slug]` must issue an immediate **301/307 redirect** to `/article/[slug]` to preserve Google SEO rankings.

## V5.2 Structured data — NewsArticle JSON-LD & meta tags
- source: specv2.md
- type: protocol
- content: Status: GOVERNING. Every article page auto-embeds standard `NewsArticle` JSON-LD schema: `headline`, `image`, `datePublished`, `author`, `publisher` ("AI AFFILIATE HUB"). Canonical URL: exactly `https://aiaffiliatehub.com/article/[slug]`.

## V5.2 B2B SaaS Light Theme & Bento Grid UI (Bento Edition 7:5)
- source: specv2.md
- type: nfr
- content: Status: GOVERNING. Background: soft light gray `#F8F9FA`. Cards: pure white `#FFFFFF` with `shadow-sm hover:shadow-xl hover:shadow-slate-200/60 border border-slate-100`. Primary Royal Blue `#0056B3` (header, titles, icons — expert-trust B2B tone). Conversion CTA accent Coral Orange `#FF6B6B` (revenue buttons: "Claim Deal & Start", "Read Analysis"). Confirmation-label Mint Emerald `#20C997` (`✓ Verified Offers`, view statistics). Breaking News Ticker directly under the navigation bar: blinking `Tin Nóng` label (`bg-cyan-500 text-slate-950 font-black animate-pulse`) linking the featured article. Hero Bento Grid 7:5: main card (`lg:col-span-7`) full-width image, dark overlay, prominent category label, author, Coral Orange Read Story button; two secondary cards (`lg:col-span-5`) stacked vertically presenting niche AI use-cases with view counts and category labels.

## V5.2 Role-Based Access Control matrix
- source: specv2.md
- type: protocol
- content: Status: GOVERNING. Article management: Admin — full view/edit/publish/delete over all articles; Editor/Author — only articles they created (`WHERE author_id = user.id`). Affiliate link store: Admin — full add/edit/delete of root campaign links; Editor/Author — completely hidden (403 Forbidden), may only select from existing links to attach to their articles. Reporting: Admin — full KPI revenue, system-wide clicks, staff Leaderboard; Editor/Author — Views & Clicks metrics limited to their own articles.

## Public frontend tab grouping logic (V4.0)
- source: spec.md
- type: protocol
- content: Status: STANDING — defined in spec.md §2.2; not restated or contradicted by specv2.md. Data-field-driven homepage tabs: "Bài viết Hot Tuần" filters articles with `is_featured = TRUE` combined with high interaction over the last 7 days; "Bài viết Xem Nhiều" sorts by `view_count DESC`; "Bài viết Mới Nhất" sorts by `created_at DESC`. Multi-level category navigation: selecting a level-1 category (e.g. Tài chính) loads articles by `category_id` with a quick filter bar over sub-categories (`sub_category_id`).

## Settings — extended SEO/GEO field list (V4.0)
- source: spec.md
- type: schema
- content: Status: STANDING field list — specv2.md §1.7 provides the governing concrete values (see V5.2 settings entry); these extended fields are not contradicted by it. Single settings row (id, default 1): `site_title`, `meta_description`, `focus_keywords`, `canonical_url` (centralized on-page SEO); `hreflang`, `geo_target`, `business_name`, `business_address`, `business_phone` (GEO Local SEO & NAP business info); `og_image_url`, `schema_jsonld`, `head_scripts` (OpenGraph image & JSON-LD script injection).

## Public & CMS API contract (V3)
- source: Spec_Website_Affiliate_V3.md
- type: api-contract
- content: Status: STANDING — the only written contract for these endpoints; specv2.md adds `/api/v1/cms/blacklist/import-sheet-url` without altering them. (Authored against the superseded V3 relational model; the data-isolation rules are restated in the V5.2 RBAC matrix entry.) Public (no token): `GET /api/v1/public/articles/:slug` → 200 `{status: "success", data: {id, title, content, author, view_count}}`; `POST /api/v1/public/tracking/click` with body `{article_id, affiliate_link_id}`. CMS (Authorization header required): `GET /api/v1/cms/articles` — admin: `SELECT * FROM articles`; editor/author: `SELECT * FROM articles WHERE author_id = ?` (user_id from token) → 200 list; `PUT /api/v1/cms/articles/:id` — if token role != admin AND article.author_id != token user_id → `403 Forbidden`, else allow UPDATE. Source's AI-coder note: obey the DB structure and the §5.2 data-isolation logic; do not change endpoints.

## Auth & session protocol (V3)
- source: Spec_Website_Affiliate_V3.md
- type: protocol
- content: Status: STANDING session mechanics (not restated in V4/V5.2); the V3 role capability matrix is SUPERSEDED by the V5.2 RBAC matrix entry. Login with `username` + `password` returns a JWT Token (example TTL: 24h); FE auto-attaches `Authorization: Bearer <token>` to private requests. V3 role policy: Admin — full rights over all articles, users, and affiliate links; Editor/Author — may only view/edit/delete articles they created themselves (`author_id` = logged-in `user_id`), cannot see or edit other Editors'/Authors' articles, no permission to manage Users or Affiliate Links.

## Affiliate & tracking data flow (V3)
- source: Spec_Website_Affiliate_V3.md
- type: protocol
- content: Status: STANDING — not restated by later revisions (V3-era URL example `domain.com/bai-viet-a`; the current URL contract is `/article/[slug]` with legacy redirects per V5.2). Public flow: ad traffic → article URL → FE calls `GET /api/v1/public/articles/{slug}` → BE reads DB (checks cache first), returns JSON with article content and configured affiliate button list → FE renders HTML → visitor clicks affiliate CTA → FE fires background `POST /api/v1/public/tracking/click`, then opens a new tab redirecting to the affiliate partner → BE logs the click (DB, or webhook out to n8n/Google Sheets) and returns 200. CTA safety attributes: `rel="nofollow sponsored" target="_blank"`. Sub-ID tracking: on public render the system auto-appends `?sub_id={slug_bai_viet}` to affiliate links for conversion tracking. `click_logs.ip_address` VARCHAR 45 — V3 notes anonymization if GDPR applies. Private flow: editor JWT → `GET /api/v1/cms/articles` → BE verifies token, extracts `user_id`/`role`, and auto-appends `WHERE author_id = {user_id}` for role editor.

## Non-functional requirements (V3)
- source: Spec_Website_Affiliate_V3.md
- type: nfr
- content: Status: STANDING — not restated or contradicted by specv2.md (V3's SSR/SSG "e.g. Next.js" is consistent with the V5.2 Next.js stack; the SQL-injection defense was authored for the superseded relational model — under the V5.2 MongoDB stack the equivalent is ODM/Mongoose-level input handling). Performance: public APIs (homepage article feeds) must respond TTFB < 200ms for ad-traffic speed; backend caching required (Redis or File Cache) for public APIs. Security: passwords hashed with `Bcrypt` or `Argon2`; SQL-injection prevention via ORM/Query Builder; XSS prevention — FE must sanitize `content` before rendering HTML. Mobile-responsive: public FE must render flawlessly on phones (most ad traffic is mobile). SEO & social share: SSR or SSG (e.g. Next.js) so Google/Facebook bots can read meta tags.

## Relational schema — MVP tables (V3) [SUPERSEDED]
- source: Spec_Website_Affiliate_V3.md
- type: schema
- content: Status: SUPERSEDED by specv2.md (V5.2 MongoDB) — retained for provenance; see INFO section of `.planning/INGEST-CONFLICTS.md`. Relational tables: `users` (`id` INT PK auto-increment; `username` VARCHAR 50 unique; `password_hash` VARCHAR 255; `role` ENUM 'admin'|'editor'|'author'; `created_at` TIMESTAMP); `articles` (`id` INT PK auto-increment; `author_id` INT FK → users.id; `title` VARCHAR 255; `slug` VARCHAR 255 unique + index; `content` LONGTEXT; `status` ENUM 'draft'|'published'; `view_count` INT default 0; `created_at`/`updated_at` TIMESTAMP); `affiliate_links` (Admin-managed: `id` INT PK; `name` VARCHAR 150; `base_url` TEXT, e.g. `https://aff.com/?id=123`); `click_logs` (`id` INT PK; `article_id` INT FK; `affiliate_link_id` INT FK; `ip_address` VARCHAR 45 with GDPR-anonymization note; `clicked_at` TIMESTAMP).

## Relational schema — multi-level categories & multi-affiliate links (V4.0) [SUPERSEDED]
- source: spec.md
- type: schema
- content: Status: SUPERSEDED by specv2.md (V5.2 re-models the same scope on MongoDB) — retained for provenance. V4.0's relational contributions (INTEGER PKs, FK joins): `users` extended with `name`, `status` ('active'|'inactive'), `avatar` (Bcrypt hashing); two-level `categories` (`id`, `name`, `slug`) & `sub_categories` (`id`, `category_id`, `name`, `slug`); `articles` extended with `category_id`/`sub_category_id` FKs, `excerpt` (Sapo for homepage), `is_featured` BOOLEAN (weekly Hot/featured), `revenue` REAL (estimated $, default 0), `meta_title`/`meta_description`, `thumbnail_url`; `affiliate_links` extended with `commission` (e.g. 50,000 VND/Lead or 40% Fee) and `cookie` (30/90 days); new junction table `article_affiliate_relations` (`id`, `article_id` FK, `affiliate_link_id` FK, `position_label` e.g. 'top_cta', 'middle_comparison', 'footer_banner') solving one-article-many-affiliate-links (3-4 links at top/middle/footer); `click_logs` (`article_id`, `affiliate_link_id`, `ip_address`, `clicked_at`). V4.0's generic taxonomy instances (Tài chính / Quỹ mở / Crypto, Bất động sản, Công nghệ) are superseded by the V5.2 AI-niche taxonomy.
