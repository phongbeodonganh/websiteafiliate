# External Integrations

**Analysis Date:** 2026-09-10

## APIs & External Services

**AI — Google Gemini (article generation):**
- Purpose: SEO/GEO article generation for the CMS (`/api/v1/cms/ai/generate-article`, `/api/v1/cms/ai/generate-takeaways`)
- Client: **raw REST** — `fetch` POST to `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent` (no SDK; the installed `@google/genai` package is unused)
- Implementation: `src/lib/gemini.ts` — temperature 0.2, `response_mime_type: application/json` with a JSON schema enforcing `seo_meta` / `geo_data` / `content_html`; prompts inject affiliate tracking URL + campaign name so generated CTAs point at the internal redirect tracker
- Auth: `GEMINI_API_KEY` env var; per-request user-supplied key also accepted from CMS settings. ⚠️ A hardcoded fallback key exists in `src/lib/gemini.ts` (and duplicated in `src/app/api/v1/cms/ai/generate-article/route.ts`) — do not rely on or copy this pattern; treat the env var as the only legitimate source.

**Scraping — Jina AI Reader (landing page context):**
- Purpose: fetch clean markdown of a product landing page to feed Gemini prompts
- Client: plain `fetch` GET to `https://r.jina.ai/{encoded-url}` with spoofed browser UA (`src/lib/scraper.ts`)
- Auth: none (public reader endpoint); output truncated to 4,000 words; non-throwing — returns fallback strings on error

**Google Workspace (SEO insights):**
- GA4 Data API (`google.analyticsdata` v1beta, `properties.runReport`) — pageviews/sessions/activeUsers per page: `src/lib/google/ga4.ts`
- Search Console API (`google.searchconsole` v1, `searchanalytics.query`) — organic overview, quick-win queries, page performance, content decay: `src/lib/google/gsc.ts`
- SDK: `googleapis` (see also Data Storage/Sheets below)
- Auth: service-account JWT from `GOOGLE_SERVICE_ACCOUNT_JSON` (accepts raw JSON or base64), scopes `analytics.readonly` + `webmasters.readonly`; client cached module-level in `src/lib/google/auth.ts`
- Requires env: `GOOGLE_SERVICE_ACCOUNT_JSON`, `GA4_PROPERTY_ID`, `GSC_SITE_URL` (feature detects via `isGoogleInsightsConfigured()`); results cached in MongoDB `InsightsCache` collection

**Google Sheets (blacklist import):**
- Purpose: import affiliate blacklist from a published Google Sheet
- Mechanism: plain `fetch` of the public CSV export URL `https://docs.google.com/spreadsheets/d/{docId}/export?format=csv&gid={gid}` — no API/SDK, no auth
- Implementation: `src/app/api/v1/cms/blacklist/import-sheet-url/route.ts`

**Email — Resend (insider newsletter + transactional):**
- SDK: `resend` — `src/lib/email/resend.ts` (single `emails.send` + `batch.send`, batch size 100, idempotency keys), wrapped by `src/lib/email/mailer.ts`; welcome email at `src/lib/email/welcome-email.ts`; digest builder at `src/lib/insider/digest.ts`
- Auth: `RESEND_API` env var
- From/reply-to: `EMAIL_FROM` (default `insider@aidealsuk.com`), `EMAIL_REPLY_TO` (default `support@aidealsuk.com`), `EMAIL_SITE_NAME`

**Analytics — Google Analytics 4 (browser):**
- gtag.js snippet injected in `src/app/layout.tsx`, ID stored in MongoDB settings (`SettingModel.googleAnalyticsId`), rendered with the CSP nonce from `src/proxy.ts`
- CSP `connect-src` allowlist for `google-analytics.com` / `analytics.google.com` in `src/proxy.ts`

**Fonts — Google Fonts:**
- Inter + Plus Jakarta Sans via `<link>` preconnect/stylesheet in `src/app/layout.tsx` (self-hosted alternative would require CSP/font-src changes)

## Data Storage

**Databases:**
- MongoDB (Atlas in production — see `DEPLOY.md`; MongoMemoryServer in tests)
  - Connection: `MONGODB_URI` (fallback: parsed from `.env.local` or `mongodb.env` at `src/lib/db/mongodb.ts`)
  - Client: Mongoose 9 (`src/lib/db/mongodb.ts`) with global connection cache + DNS override (`8.8.8.8`/`1.1.1.1`) + retry on SRV lookup failures
  - Models (`src/lib/db/models.ts`): User, Category, SubCategory, Article, AffiliateLink, ArticleAffiliateRelation, Blacklist, ClickLog, Subscriber, Setting, InsightsCache
  - Canonical model/schema definitions: `src/lib/db/models.ts` and `src/lib/db/schema.ts` (both register the same mongoose model names; import from `@/lib/db` / `models.ts`)

**File Storage:**
- Cloudflare R2 (S3-compatible) via `@aws-sdk/client-s3` — `src/lib/storage.ts`
  - Env: `R2_ENDPOINT`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL`
  - Public base URL: `https://media.aidealsuk.com` (allowlisted in `next.config.ts` images.remotePatterns; legacy `*.r2.dev` + `images.unsplash.com` also allowed)
  - Used by CMS upload route `src/app/api/v1/cms/upload/route.ts`; UUID filenames, immutable cache-control

**Caching:**
- None external (no Redis). In-process caching only: mongoose connection singleton, cached Google JWT client, `InsightsCache` collection for SEO insight results, Next.js fetch/revalidate via `src/lib/cache-revalidation.ts`

## Authentication & Identity

**Auth Provider:** Custom (no third-party IdP)
- Credentials + JWT: `src/lib/auth.ts` — bcryptjs hashing (cost 10), `jsonwebtoken` bearer tokens, 24h expiry, payload `{ userId, username, role: admin|editor|author }`
- Secret: `JWT_SECRET` env var, read lazily; verified on every `/api/v1/cms/*` route via `getAuthUser(req)` (Bearer header). ⚠️ Several CMS routes under `src/app/api/v1/cms/` (blacklist routes, `ai/generate-article`) define their own hardcoded fallback JWT secret strings — these must not be replicated in new routes.
- Token blacklist (logout invalidation): `src/lib/tokenBlacklist.ts`
- Login rate limiting: in-memory sliding window (5 failures/1min → 15min lockout) in `src/lib/rateLimit.ts`
- Insider (newsletter) tokens: stateless HMAC-SHA256 signed tokens (`confirm`/`unsubscribe` purposes) in `src/lib/insider/tokens.ts`; secret `INSIDER_TOKEN_SECRET` (falls back to `RESEND_API`); confirm TTL via `INSIDER_CONFIRM_TOKEN_TTL_HOURS` (default 24h)
- Cron auth: `Bearer INSIDER_CRON_SECRET` compared with `timingSafeEqual` in `src/app/api/v1/cron/insider-digest/route.ts` and `src/app/api/v1/cms/insider/send-now/route.ts`

## Affiliate Network Integrations

- **No direct affiliate-network API / SDK / postback integration exists.** Affiliate networks are integrated purely via stored tracking URLs.
- **Internal click tracking pipeline:**
  1. CMS stores `AffiliateLink` documents with `base_url` (e.g. `https://heygen.com/?sid=...` — see seed data `src/lib/db/seed-mongodb.ts`)
  2. Articles embed links to `/api/v1/public/tracking/redirect?affiliate_link_id=...&article_id=...`
  3. Redirect route (`src/app/api/v1/public/tracking/redirect/route.ts`): logs `ClickLogModel` (article_id, affiliate_link_id, IP), `$inc`s `click_count`, checks the link against the **Blacklist interceptor** (local Mongo `BlacklistModel` via `src/lib/blacklist.ts`) and renders a Vietnamese warning page instead of redirecting if blacklisted, then 302s to the destination
  4. Sub-ID attribution: `appendSubId()` in `src/lib/utils.ts` appends `sub_id={article-slug|homepage}`, `utm_source=affiliate_news`, `utm_medium=content_cta` to the network URL
  5. Secondary pixel-style route: `src/app/api/v1/public/tracking/click/route.ts`
- Commission/cookie data on links is parsed heuristically (`parseCommissionRate`, `parseCookieDays` in `src/lib/utils.ts`) — no server-to-server conversion postbacks.

## Monitoring & Observability

**Error Tracking:**
- None (no Sentry/Datadog). Console logging only.

**Logs:**
- `console.log` / `console.warn` / `console.error` throughout (e.g. Resend responses logged in `src/lib/email/resend.ts`); surfaced via `pm2 logs` on the VPS

## CI/CD & Deployment

**Hosting:**
- Self-managed Ubuntu VPS: Next.js standalone server under PM2 (`ecosystem.config.js`, 600MB restart cap) behind Nginx + Certbot TLS — full runbook in `DEPLOY.md`
- `render.txt` is a leftover from a previous Render deployment (no longer the target)

**CI Pipeline:**
- GitHub Actions: `.github/workflows/deploy.yml`
  - Trigger: push to `feature/namdt25-develop` (plus manual `workflow_dispatch`)
  - `npm ci` → `npm test` (Vitest + in-memory Mongo) → `next build` (Turbopack) → package `.next/standalone` tarball → scp to VPS (appleboy/scp-action) → extract + `pm2 restart` (appleboy/ssh-action)
  - VPS never installs deps or builds; `.env.local`/`mongodb.env` live outside the swapped `app/` dir
  - GitHub secrets used: `SSH_HOST`, `SSH_USER`, `SSH_PRIVATE_KEY`

## Environment Configuration

**Required env vars:**
- `MONGODB_URI` — Atlas connection string (required for any DB-backed route)
- `JWT_SECRET` — admin/CMS auth (required at first sign/verify)
- `NEXT_PUBLIC_SITE_URL` — public site base URL for email links (fallback `https://aidealsuk.com`)
- `RESEND_API` — email sending (required for insider/subscribe flows)
- `RESEND_WEBHOOK_SECRET` — inbound Resend webhook signature verification
- `INSIDER_CRON_SECRET` — cron + send-now bearer token
- `INSIDER_TOKEN_SECRET` — insider confirm/unsubscribe HMAC (falls back to `RESEND_API`)
- `INSIDER_CONFIRM_TOKEN_TTL_HOURS` — optional (default 24)
- `EMAIL_FROM`, `EMAIL_REPLY_TO`, `EMAIL_SITE_NAME` — optional email overrides
- `GEMINI_API_KEY` — AI article generation
- `GOOGLE_SERVICE_ACCOUNT_JSON` (raw or base64 JSON), `GA4_PROPERTY_ID`, `GSC_SITE_URL` — Google insights trio
- `R2_ENDPOINT`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL` — Cloudflare R2 uploads
- `NODE_ENV`, `PORT` — runtime

**Secrets location:**
- Local/dev: `.env.local` + `mongodb.env` at repo root (both gitignored in `.gitignore`; never read by mapping, existence only)
- Production: `.env.local` on the VPS next to `ecosystem.config.js`, outside the swapped `app/` dir (per `DEPLOY.md` and `deploy.yml`)
- CI/CD: GitHub Actions secrets (`SSH_*`)

## Webhooks & Callbacks

**Incoming:**
- `POST /api/v1/webhooks/resend` — Resend email events, signature-verified with `svix` (`Webhook.verify`, headers `svix-id`/`svix-timestamp`/`svix-signature`, secret `RESEND_WEBHOOK_SECRET`): `src/app/api/v1/webhooks/resend/route.ts`
- No other incoming webhooks

**Outgoing:**
- None. The app never POSTs webhooks to third parties; all outbound calls are request/response fetches (Gemini, Jina, Google Sheets CSV, Google APIs via SDK, Resend SDK).

---

*Integration audit: 2026-09-10*
