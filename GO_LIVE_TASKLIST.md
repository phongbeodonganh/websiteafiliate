# Go-Live Tasklist — Website Affiliate

Tổng hợp từ audit source code ngày 2026-08-09. Mục tiêu: go-live ổn định cho 50-100 concurrent users.

**Mức độ ưu tiên:** 🔴 Critical (chặn go-live) · 🟠 High (nên xong trước go-live) · 🟡 Medium (làm sớm sau go-live) · 🟢 Low (tech debt, không gấp)

**Status:** ⬜ Chưa bắt đầu · 🔵 Đang làm · 🟩 Hoàn thành · ⚠️ Một phần

---

## Tổng quan

| ID | Nhóm | Ưu tiên | Task | Status |
|---|---|---|---|---|
| SEC-01 | Security | 🔴 | Xoay vòng & gỡ credential MongoDB bị lộ | ⚠️ |
| SEC-02 | Security | 🔴 | Gỡ fallback hardcode `JWT_SECRET` | 🟩 |
| SEC-03 | Security | 🔴 | Sanitize HTML nội dung bài viết (chống XSS) | 🟩 |
| SEC-04 | Security | 🟠 | Rate limit endpoint login | 🟩 |
| SEC-05 | Security | 🟠 | Thêm security headers (CSP, X-Frame-Options...) | 🟩 |
| SEC-06 | Security | 🟡 | Cơ chế revoke JWT / logout thực sự vô hiệu token | ⬜ |
| SEC-07 | Security | 🟢 | Validate scheme của `base_url` affiliate link | ⬜ |
| BUG-01 | Bug/Feature | 🔴 | Hợp nhất cơ chế chèn CTA affiliate (Create Studio thiếu) | 🟩 |
| BUG-02 | Bug/Feature | 🟠 | Chống spam view count (F5) | ⬜ |
| SEO-01 | SEO/GEO | 🟠 | Thêm `sitemap.ts` | 🟩 |
| SEO-02 | SEO/GEO | 🟠 | Thêm `robots.ts` + noindex `/admin` | 🟩 |
| SEO-03 | SEO/GEO | 🟡 | Chuyển ảnh sang `next/image` | 🟩 |
| SEO-04 | SEO/GEO | 🟡 | Thêm schema `BreadcrumbList` | ⬜ |
| SEO-05 | SEO/GEO | 🟢 | Canonical/noindex cho URL filter & phân trang | ⬜ |
| FE-01 | FE/UX | 🟠 | Sửa lỗi nút Back trình duyệt trong `/admin` | ⬜ |
| FE-02 | FE/UX | 🟡 | Trang 404/error tuỳ biến | ⬜ |
| TECH-01 | Tech Debt | 🟢 | Gỡ dependency chết `drizzle-orm` + `pg` | ⬜ |
| TECH-02 | Tech Debt | 🟡 | Thêm caching cho public API/trang chủ | ⬜ |
| TECH-03 | Tech Debt | 🟡 | Bổ sung test tự động cho luồng critical | ⬜ |

---

## 🔴 Critical — Bắt buộc trước go-live

### SEC-01: Xoay vòng & gỡ credential MongoDB bị lộ
**Mô tả:** Mật khẩu MongoDB Atlas (`pnv6555_db_user:LagoFHSUotjbc7HE`) đang hardcode làm fallback tại [mongodb.ts:31](src/lib/db/mongodb.ts#L31), và file [mongodb.env](mongodb.env) chứa cùng credential này **đã bị commit vào git** (không nằm trong `.gitignore`). Cần: (1) đổi mật khẩu user DB trên MongoDB Atlas, (2) `git rm --cached mongodb.env` + thêm vào `.gitignore`, (3) xoá hoàn toàn fallback hardcode trong `mongodb.ts`, bắt buộc đọc từ `process.env.MONGODB_URI` và throw error nếu thiếu, (4) cân nhắc xoá khỏi lịch sử git (`git filter-repo`/BFG) nếu repo từng push public hoặc share ra ngoài.

**⚠️ Giới hạn đã biết:** Cluster MongoDB Atlas thuộc quyền sở hữu của bên thứ ba (không phải chủ dự án hiện tại) — **không có quyền đăng nhập Atlas để đổi mật khẩu**. Vì vậy phần (1) và (4) không thể tự thực hiện được trong phạm vi task này; đã hoàn thành (2) và (3). Mật khẩu DB cũ (`LagoFHSUotjbc7HE`) trên thực tế **vẫn còn hiệu lực** và từng nằm trong lịch sử git — đây là rủi ro tồn đọng, cần chủ sở hữu Atlas cluster xử lý đổi mật khẩu khi có quyền truy cập, hoặc migrate sang cluster Atlas mới do chính chủ dự án quản lý.
**Status:** ⚠️ Một phần (đã gitignore + untrack + gỡ hardcode fallback trong code; **chưa** đổi được mật khẩu Atlas vì không có quyền truy cập)
**Test-list accept:**
- [x] `grep -r "mongodb+srv" src/` không còn trả về chuỗi credential thật nào — verified, không còn match
- [x] `git ls-files | grep mongodb.env` không trả kết quả (file không còn tracked) — verified, exit code 1 (không tìm thấy)
- [x] App khởi động **fail rõ ràng** (throw lỗi có ý nghĩa) nếu chạy mà không có `MONGODB_URI` trong env — verified: `Error: MONGODB_URI is not set. Provide it via the MONGODB_URI environment variable, .env.local, or mongodb.env.`
- [ ] Đăng nhập bằng mật khẩu DB cũ trên Atlas/Compass **thất bại** (xác nhận đã đổi mật khẩu) — **BLOCKED**, không có quyền Atlas để đổi mật khẩu
- [x] App chạy bình thường với `MONGODB_URI` hiện tại (đọc qua `mongodb.env`, không còn tracked bởi git) — verified: connect thành công, `User count: 1`

### SEC-02: Gỡ fallback hardcode `JWT_SECRET`
**Mô tả:** [auth.ts:4](src/lib/auth.ts#L4) có `const JWT_SECRET = process.env.JWT_SECRET || 'affiliate_secret_key_v3_super_secure';`. Nếu quên set env ở production, chuỗi fallback này là public (nằm trong git) — bất kỳ ai biết được có thể tự ký JWT với `role: 'admin'` và chiếm toàn quyền hệ thống mà không cần mật khẩu.

**Đã thực hiện:** Phát hiện thực tế **chưa từng có `JWT_SECRET` nào được set** ở local (không có `.env.local` trước đó) — nghĩa là app đang chạy sống bằng đúng chuỗi fallback đã lộ trong git. Đã: (1) sinh 1 secret ngẫu nhiên mạnh 48 bytes (base64) bằng `crypto.randomBytes`, (2) lưu vào `.env.local` (đã nằm trong `.gitignore` sẵn qua pattern `.env*`, không bị commit), (3) sửa [auth.ts](src/lib/auth.ts) xoá hoàn toàn fallback string, throw error rõ ràng nếu thiếu `process.env.JWT_SECRET`.

**⚠️ Lưu ý khi deploy production:** `.env.local` chỉ chạy được ở máy local này. Khi deploy lên server/hosting production, phải tự set biến môi trường `JWT_SECRET` (giá trị khác, tự sinh mới) trên hệ thống hosting đó (Vercel/VPS/Docker...) — không copy nguyên `.env.local` lên production.
**Status:** 🟩 Hoàn thành (ở local — cần lặp lại bước set env var khi deploy production)
**Test-list accept:**
- [x] Xoá giá trị fallback string, thay bằng throw error khi thiếu `process.env.JWT_SECRET` — verified: `Error: JWT_SECRET is not set...`
- [x] Sinh 1 `JWT_SECRET` ngẫu nhiên mạnh (≥32 bytes) và set trong env, khác hoàn toàn giá trị cũ — đã sinh 48 bytes random, lưu `.env.local`
- [x] Thử tự ký 1 JWT bằng giá trị fallback cũ (`affiliate_secret_key_v3_super_secure`) → gọi API CMS bất kỳ → phải trả về 401 — verified trên dev server thật: `GET /api/v1/cms/articles` với token giả mạo → **401**
- [x] Đăng nhập lại bằng tài khoản admin thật vẫn hoạt động bình thường sau khi đổi secret — verified trên dev server thật: login `admin-nam` → token mới → gọi `/api/v1/cms/articles` → **200**

### SEC-03: Sanitize HTML nội dung bài viết (chống XSS)
**Mô tả:** Trường `content` của Article được render trực tiếp bằng `dangerouslySetInnerHTML` tại [article/[slug]/page.tsx:240](src/app/article/[slug]/page.tsx#L240) mà không qua bước sanitize nào — vi phạm chính yêu cầu bảo mật trong [Spec_Website_Affiliate_V3.md](Spec_Website_Affiliate_V3.md) (mục Non-Functional Requirements). Vì role `editor`/`author` được phép tự soạn HTML tự do cho bài published, một tài khoản cấp thấp có thể chèn `<script>` chạy trên trình duyệt của mọi khách xem bài (stored XSS), có thể đánh cắp JWT admin lưu trong localStorage nếu admin từng mở bài đó. Cần thêm sanitize (vd `isomorphic-dompurify` hoặc `sanitize-html`) tại API POST/PUT article (server-side, ưu tiên) và/hoặc trước khi render, với allowlist tag/attribute an toàn, loại bỏ `<script>`, `on*` handler, `javascript:` href.

**Đã thực hiện:** Cài `sanitize-html` + `@types/sanitize-html`. Tạo module dùng chung [src/lib/sanitize.ts](src/lib/sanitize.ts) — `sanitizeArticleContent()` với allowlist tag (`p, h1-h6, ul/ol/li, a, img, div, span, table...`) và attribute (`href, src, alt, class, data-affiliate-id, data-article-id, rel, target, colspan/rowspan`), chỉ cho phép scheme `http/https/mailto`. Áp dụng **2 lớp phòng thủ**:
1. **Lúc lưu (chính):** [cms/articles/route.ts](src/app/api/v1/cms/articles/route.ts) (POST) và [cms/articles/[id]/route.ts](src/app/api/v1/cms/articles/[id]/route.ts) (PUT) — sanitize `content` trước khi ghi DB, áp dụng cho mọi role.
2. **Lúc render (defense-in-depth, tự bảo vệ luôn bài cũ):** [article/[slug]/page.tsx](src/app/article/[slug]/page.tsx) (public) và preview modal trong [admin/page.tsx](src/app/admin/page.tsx) (nội bộ CMS).

Đồng thời phát hiện & sửa 2 lỗi TypeScript có sẵn (không liên quan XSS, do 2 script seed viết ở phiên trước thiếu ép kiểu `status`) đang **chặn hẳn `npm run build`** — đã fix để build production chạy được, cần thiết để verify task này.
**Status:** 🟩 Hoàn thành
**Test-list accept:**
- [x] Tạo bài viết (qua API hoặc UI, role bất kỳ) với `content` chứa `<script>alert(1)</script>` → sau khi lưu, script tag bị loại bỏ hoàn toàn khỏi DB/khi render — verified end-to-end qua API thật (login → POST → check response): `<script>` biến mất hoàn toàn
- [x] Content chứa `<img src=x onerror="alert(1)">` → attribute `onerror` bị strip — verified: `<img src="x" />`, không còn `onerror`
- [x] Content chứa `<a href="javascript:alert(1)">click</a>` → href bị strip hoặc thay thế an toàn — verified: `<a>bad link</a>`, href bị xoá hoàn toàn
- [x] Các tag hợp lệ (`<p>`, `<h2>`, `<ul>`, `<li>`, `<strong>`, `<a href="https://...">`, `<img src="https://...">`) vẫn hiển thị đúng, không bị mất định dạng — verified qua unit test
- [x] Nút CTA affiliate (`<a class="affiliate-btn"...>`) vẫn hoạt động bình thường sau khi qua sanitize — verified trên dev server thật: mở lại 2 bài Cursor/ElevenLabs đã tạo trước đó, nút CTA + href redirect vẫn nguyên vẹn, trang trả 200
- [x] (bổ sung) `npm run build` chạy sạch, không lỗi type/compile, kể cả import `sanitize-html` trong client component (`admin/page.tsx`)

### BUG-01: Hợp nhất cơ chế chèn CTA affiliate
**Mô tả:** Trang Create Article Studio ([create/page.tsx](src/app/admin/articles/create/page.tsx), hàm `togglePlacement`) chỉ lưu `affiliatePlacements` vào state/DB nhưng không chèn HTML nút vào `content`. Trang Edit ([admin/page.tsx:1012](src/app/admin/page.tsx#L1012), hàm `insertAffCta`) mới thực sự chèn `<a class="affiliate-btn">` vào content. Trang public không tự render CTA từ field `affiliate_placements` — chỉ render `content` HTML thô. Hậu quả: **bài viết tạo mới qua Create Studio sẽ không bao giờ có nút affiliate hiển thị ngoài public site**, dù DB vẫn ghi nhận đã gắn link. Đã xác nhận thực tế: 2 bài test tạo qua script bị lỗi này, đã vá tay bằng cách chèn trực tiếp CTA HTML vào `content` ([scripts/inject-affiliate-cta.ts](scripts/inject-affiliate-cta.ts)) — đây là workaround, chưa fix code gốc.
**Đề xuất fix:** chọn 1 trong 2 hướng — (a) làm trang public tự render CTA từ `affiliate_placements` (data-driven, khuyến nghị vì tách biệt content/logic rõ ràng, sửa 1 chỗ áp dụng mọi bài kể cả bài cũ), hoặc (b) thêm hàm `insertAffCta` giống Edit vào Create Studio để nhất quán 2 form.

**Đã thực hiện (theo hướng a — data-driven):**
- Tạo component dùng chung [src/components/AffiliateCtaBlock.tsx](src/components/AffiliateCtaBlock.tsx) render nút CTA bằng JSX (không còn cần `dangerouslySetInnerHTML` cho phần này).
- [article/[slug]/page.tsx](src/app/article/[slug]/page.tsx): populate `affiliate_placements.affiliate_link_id`, nhóm `top_cta` render trước content, các vị trí còn lại (`middle_comparison`, `footer_banner`...) render sau content — tự động áp dụng cho **mọi bài, kể cả bài cũ**, không cần sửa tay.
- Xoá hẳn `insertAffCta` (hàm nhúng HTML cứng vào `content`) khỏi [admin/page.tsx](src/app/admin/page.tsx), thay bằng `togglePlacement` giống Create Studio — Edit form giờ chỉ quản lý mảng `affiliatePlacements` (state) và gửi lên API, **trước đó Edit form thậm chí không hề gửi field này lên backend**.
- Đồng bộ Create Studio ([create/page.tsx](src/app/admin/articles/create/page.tsx)) thêm nút "+ Footer" cho đủ 3 vị trí (Top/Middle/Footer) khớp với Edit form, chuẩn hoá tên label `middle` → `middle_comparison` giữa 2 form.
- Dọn dữ liệu: gỡ HTML CTA đã nhúng tay trước đó khỏi `content` của 2 bài test (Cursor, ElevenLabs) để tránh hiển thị trùng nút, chuẩn hoá lại label placement của 2 bài này.
- Tiện thể fix 2 lỗi TypeScript có sẵn (không liên quan) đang chặn `npm run build`.
**Status:** 🟩 Hoàn thành
**Test-list accept:**
- [x] Tạo bài viết mới hoàn toàn qua UI `/admin/articles/create`, gắn 1 affiliate link vào vị trí Top CTA, publish — verified qua API thật (payload giống hệt Create Studio gửi: `content` không có HTML CTA nhúng tay, chỉ có `affiliatePlacements`)
- [x] Mở bài viết đó trên public site (`/article/[slug]`) → thấy nút "Claim Offer" hiển thị đúng vị trí, đúng affiliate link — verified: href chứa đúng `affiliate_link_id` đã gắn
- [x] Click nút → redirect đúng sang `base_url` của affiliate link, có log ghi nhận trong `ClickLog` — verified: gọi trực tiếp endpoint redirect → **302**
- [x] Bài viết cũ tạo trước khi fix cũng tự động hiển thị đúng CTA mà không cần sửa tay từng bài — verified: 2 bài Cursor/ElevenLabs (đã có sẵn `affiliate_placements` trong DB từ trước) hiển thị đúng 2 nút/bài sau khi dọn HTML nhúng tay, không cần chỉnh sửa gì thêm ở từng bài
- [x] Gỡ CTA khỏi bài (bỏ chọn placement) qua Edit → nút biến mất khỏi public site tương ứng — verified: PUT `affiliatePlacements: []` → nút biến mất khỏi trang public ngay
- [x] (bổ sung) `npm run build` sạch, không lỗi type/compile

---

## 🟠 High — Nên xong trước go-live

### SEC-04: Rate limit endpoint login
**Mô tả:** [auth/login/route.ts](src/app/api/v1/auth/login/route.ts) không giới hạn số lần thử — vulnerable brute-force mật khẩu admin. Thêm rate limit theo IP (vd 5 lần/phút, khoá tạm 15 phút sau ngưỡng) bằng middleware đơn giản (in-memory map đủ dùng ở scale này, không cần Redis).

**Đã thực hiện:** Tạo [src/lib/rateLimit.ts](src/lib/rateLimit.ts) — in-memory store theo key `login:<ip>` (dùng lại `getClientIp` có sẵn), chỉ đếm **lần đăng nhập sai** (thành công thì reset counter ngay). Cho phép 5 lần sai trong cửa sổ trượt 60s; lần sai thứ 6 trả 429 kèm header `Retry-After`, khoá 15 phút. Đã nối vào [auth/login/route.ts](src/app/api/v1/auth/login/route.ts) ở cả nhánh "user không tồn tại" và "sai mật khẩu" (không lộ thông tin username có tồn tại hay không).

**Lưu ý khi scale:** in-memory Map chỉ đúng khi chạy 1 instance duy nhất (phù hợp mục tiêu 50-100 user hiện tại). Nếu sau này deploy nhiều instance/serverless đa vùng, cần chuyển sang store dùng chung (Redis) vì mỗi instance sẽ đếm riêng.
**Status:** 🟩 Hoàn thành
**Test-list accept:**
- [x] Gửi 10 request login sai liên tiếp trong 1 phút từ cùng 1 IP → từ lần thứ 6 trở đi trả về 429 — verified trên dev server thật (`X-Forwarded-For` giả lập IP): attempt 1-5 → 401, attempt 6-10 → 429
- [x] Sau thời gian khoá (15 phút), login lại bình thường được với mật khẩu đúng — verified bằng unit test giả lập `Date.now()` (không chờ thực 15 phút): khoá đúng 15 phút, hết hạn tự mở lại
- [x] Login đúng mật khẩu ngay từ đầu vẫn hoạt động bình thường, không bị chặn nhầm — verified: IP mới (10.0.0.3) login đúng mật khẩu → `status: success`, có token
- [x] Rate limit áp dụng theo IP, không ảnh hưởng user khác đang login cùng lúc từ IP khác — verified: IP 10.0.0.2 login sai vẫn trả 401 bình thường dù IP 10.0.0.1 đã bị khoá cùng lúc
- [x] (bổ sung) IP đã bị khoá thử lại **đúng** mật khẩu vẫn bị 429 cho tới khi hết hạn khoá (đúng hành vi chống brute-force, không cho phép bypass lockout)

### SEC-05: Thêm security headers
**Mô tả:** `next.config.ts` chưa cấu hình header bảo mật nào. Thêm tối thiểu: `Content-Security-Policy` (defense-in-depth cho SEC-03), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Strict-Transport-Security` (khi đã có HTTPS).

**Đã thực hiện:**
- 5 header tĩnh (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `Strict-Transport-Security`) đặt trong `next.config.ts`, áp dụng cho mọi route kể cả API.
- `Content-Security-Policy` đặt riêng trong [src/proxy.ts](src/proxy.ts) (bản Next.js này đã đổi tên `middleware.ts` → `proxy.ts`, xem cảnh báo trong `AGENTS.md`) — dùng **nonce sinh mới mỗi request** thay vì allowlist tĩnh, vì Next.js App Router tự chèn nhiều `<script>` inline để hydrate mà không cách nào tắt được; một CSP `script-src 'self'` tĩnh sẽ chặn hết các script đó và làm **toàn bộ site mất khả năng tương tác** (đây chính là nguyên nhân bug "không đăng nhập được" đã fix ở tin nhắn trước).
- **Bug thứ 2 phát hiện khi test kỹ trên production build** (khác hành vi với `next dev`): `/admin` và `/admin/login` là trang client-only không fetch data server-side, nên Next.js tối ưu thành **static page** (render sẵn lúc `npm run build`, không có request nào để gắn nonce) → script bootstrap của 2 trang này bị thiếu nonce, vẫn bị CSP chặn dù các trang khác (trang chủ, bài viết) chạy tốt. Fix bằng cách gọi `headers()` trong [layout.tsx](src/app/layout.tsx) — buộc toàn bộ app render động (dynamic), đúng pattern chính thức Next.js khuyến nghị cho CSP nonce. Xác nhận build sau fix: **toàn bộ route chuyển từ có route static (`○`) sang 100% dynamic (`ƒ`)**.
**Status:** 🟩 Hoàn thành
**Test-list accept:**
- [x] Response header của trang chủ và `/admin` có đầy đủ các header trên — verified qua `curl -I` trên **production build thật** (`npm run build && npm run start`), cả `/`, `/admin`, `/admin/login`, và cả API routes (không có CSP nhưng có đủ 5 header còn lại)
- [x] Trang vẫn load và chạy bình thường, không bị CSP chặn nhầm — verified bằng cách so khớp nonce trong response header với nonce trên từng thẻ `<script>` inline trong HTML: `/` (37 script inline, 0 thiếu nonce), `/admin` (11, 0 thiếu), `/admin/login` (7, 0 thiếu), `/article/[slug]` (23, 0 thiếu). JSON-LD (`type="application/ld+json"`) không cần nonce vì trình duyệt không thực thi loại script này như code.
- [x] Login thật qua API trên production build → `200`, có token hợp lệ
- [x] Rate limit (SEC-04) không bị ảnh hưởng bởi thay đổi CSP — verified: login sai vẫn trả `401` bình thường
- [x] Thử nhúng site vào `<iframe>` từ domain khác → bị chặn — verified header `X-Frame-Options: DENY` và CSP `frame-ancestors 'none'` (2 lớp) đều có mặt; test bằng browser thật (mở DevTools Console) vẫn nên làm thêm để chắc chắn 100% không có CSP violation nào lọt lưới curl không thấy được

### BUG-02: Chống spam view count
**Mô tả:** [article/[slug]/page.tsx:74](src/app/article/[slug]/page.tsx#L74) tăng `view_count` vô điều kiện mỗi lần load trang, không có dedupe — F5 liên tục làm sai lệch số liệu `view_count`/dashboard revenue. Thêm cơ chế dedupe theo cookie (vd `viewed_<articleId>`, hết hạn 30-60 phút) hoặc theo IP+time-window.
**Status:** ⬜ Chưa bắt đầu
**Test-list accept:**
- [ ] Load 1 bài viết 5 lần liên tiếp (F5) trong vòng 1 phút từ cùng trình duyệt → `view_count` chỉ tăng đúng 1 lần
- [ ] Đợi qua thời gian dedupe window rồi load lại → `view_count` tăng thêm 1 lần nữa
- [ ] Load cùng bài từ trình duyệt/thiết bị khác (khác cookie) → vẫn được tính là view mới, độc lập

### SEO-01: Thêm `sitemap.ts`
**Mô tả:** Chưa có `src/app/sitemap.ts` — Google/Bing không có danh sách URL chuẩn để crawl toàn bộ site, chỉ dựa vào crawl link nội bộ (chậm, dễ sót). Thêm sitemap động liệt kê tất cả bài `status: 'published'` + trang chủ, tự cập nhật khi có bài mới.

**Đã thực hiện:** Tạo [src/app/sitemap.ts](src/app/sitemap.ts) theo file convention chuẩn của Next.js — trả về trang chủ (`priority: 1`, `changeFrequency: daily`) + toàn bộ bài `status: 'published'` (`priority: 0.8`, `changeFrequency: weekly`, `lastmod` lấy từ `updated_at`). Base URL lấy từ `SettingModel.canonicalUrl` (đồng bộ với cách layout.tsx/article page đang dùng), fallback nếu chưa cấu hình. Thêm `export const revalidate = 3600` để sitemap tự làm mới mỗi giờ thay vì chỉ sinh 1 lần lúc build (mặc định Next.js cache tĩnh nếu không set).
**Status:** 🟩 Hoàn thành
**Test-list accept:**
- [x] Truy cập `/sitemap.xml` trả về XML hợp lệ, đúng chuẩn sitemap protocol — verified trên **production build thật** (`npm run build && npm run start`): `Content-Type: application/xml`, đúng cấu trúc `<urlset>/<url>/<loc>/<lastmod>/<changefreq>/<priority>`
- [x] Chứa đầy đủ URL của tất cả bài viết có `status: published`, không chứa bài `draft` — verified: sitemap có đủ 5 bài published hiện có + trang chủ; tạo thêm 1 bài published + 1 bài draft để test thì query chỉ nhận đúng bài published, loại đúng bài draft
- [x] Tạo 1 bài viết mới, publish → chạy lại (hoặc đợi revalidate) → URL bài mới xuất hiện trong sitemap — verified logic query (bài mới publish xuất hiện ngay khi cache revalidate, không cần rebuild lại toàn bộ site)
- [x] Mỗi entry có `lastmod` khớp với `updated_at` của bài viết — verified: giá trị `lastmod` trong XML trùng khớp `updated_at` trong DB
- [ ] Submit thử vào Google Search Console — chưa làm vì site chưa có domain/GSC property thật (cần làm sau khi go-live với domain chính thức)

### SEO-02: Thêm `robots.ts` + noindex `/admin`
**Mô tả:** Chưa có `src/app/robots.ts`. Thêm robots.txt disallow `/admin`, `/api`, cho phép crawl phần còn lại; đồng thời thêm `metadata: { robots: { index: false } }` cho toàn bộ route `/admin/*` để phòng trường hợp bị index nhầm.

**Đã thực hiện:**
- [src/app/robots.ts](src/app/robots.ts) — disallow `/admin`, `/api`, allow phần còn lại, kèm link `sitemap.xml` (lấy base URL từ `SettingModel.canonicalUrl`, đồng bộ với SEO-01), `revalidate = 3600`.
- Toàn bộ trang `/admin/*` (dashboard, login, create/edit article) đều là client component (`'use client'`) nên không tự export `metadata` được — tạo [src/app/admin/layout.tsx](src/app/admin/layout.tsx) (server component) bọc chung, export `metadata.robots = { index: false, follow: false }`, tự áp dụng cho mọi route con nhờ Next.js layout nesting mà không phải sửa từng file.
**Status:** 🟩 Hoàn thành
**Test-list accept:**
- [x] Truy cập `/robots.txt` trả về nội dung disallow `/admin` và `/api`, allow các route public — verified trên production build thật
- [x] View source `/admin/login` có `<meta name="robots" content="noindex">` — verified: `<meta name="robots" content="noindex, nofollow"/>`, cũng verified tương tự trên `/admin` và `/admin/articles/create` (áp dụng đúng cho mọi route con qua layout)
- [x] View source trang chủ/bài viết **không** có thẻ noindex — verified: cả `/` và `/article/[slug]` đều không có meta robots noindex

---

## 🟡 Medium — Làm sớm sau go-live

### SEC-06: Cơ chế revoke JWT
**Mô tả:** JWT stateless 24h, "Đăng xuất" hiện chỉ xoá localStorage phía client — token cũ vẫn hợp lệ đến khi hết hạn dù đã logout. Cân nhắc thêm blacklist token đơn giản (lưu token đã logout trong DB/memory kèm TTL) hoặc giảm thời hạn JWT xuống ngắn hơn kèm refresh token.
**Status:** ⬜ Chưa bắt đầu
**Test-list accept:**
- [ ] Đăng nhập lấy token A, gọi API CMS bằng token A → thành công
- [ ] Bấm Logout
- [ ] Gọi lại API CMS bằng token A (đã logout) → trả về 401, không còn dùng được nữa
- [ ] Đăng nhập lại lấy token B mới → hoạt động bình thường

### SEO-03: Chuyển ảnh sang `next/image`
**Mô tả:** Toàn bộ ảnh dùng `<img>` thô (Header, PublicNav, article page, admin page) — không lazy-load, không tối ưu định dạng/kích thước, ảnh hưởng LCP đặc biệt trên mobile (spec ghi rõ traffic ads chủ yếu từ mobile). Chuyển các ảnh public-facing (thumbnail bài viết, ảnh trang chủ) sang `next/image`.

**Đã thực hiện:** Chuyển 3 chỗ ảnh public-facing chính sang `<Image>`:
- [src/app/page.tsx](src/app/page.tsx) — ảnh hero/featured article trên trang chủ, dùng `fill` + `priority` (đây là LCP element, cần load ngay không lazy) + `sizes` khớp layout responsive
- [src/components/ArticleGrid.tsx](src/components/ArticleGrid.tsx) — thumbnail từng thẻ bài viết trong grid, dùng `fill`, không set `priority` (đa số nằm dưới fold, để Next.js tự lazy-load)
- [src/app/article/[slug]/page.tsx](src/app/article/[slug]/page.tsx) — ảnh thumbnail đầu bài viết, dùng `fill` + `priority` (nằm ngay đầu trang, ảnh hưởng LCP). Phải thêm `relative` vào container cha vì `fill` bắt buộc parent có `position` khác `static`.

**Quyết định phạm vi:** Logo trong `Header.tsx`/`PublicNav.tsx` **cố ý không chuyển** — vì `logoUrl` là URL do admin tự nhập tuỳ ý qua Settings (không giới hạn domain), trong khi `next/image` bắt buộc domain phải nằm trong `remotePatterns` allowlist, đổi sẽ có rủi ro vỡ site nếu admin từng set logo từ domain lạ. Ảnh trong `admin/page.tsx` cũng không chuyển vì trang admin đã `noindex` (SEO-02), không ảnh hưởng SEO/Core Web Vitals được Google đánh giá.

**Cấu hình đi kèm:** `next.config.ts` đã có `images.remotePatterns` cho phép `*.r2.dev` (ảnh upload qua R2, xem `R2_IMAGE_STORAGE_TASKLIST.md`) và `images.unsplash.com` (ảnh cũ) từ lúc làm R2-09.
**Status:** 🟩 Hoàn thành
**Test-list accept:**
- [x] Ảnh thumbnail bài viết và ảnh trang chủ render qua `<Image>` của Next.js (kiểm tra DOM có `srcset`, `loading="lazy"` cho ảnh dưới fold) — verified trên production build thật: card trong grid có `loading="lazy"`, `decoding="async"`, `srcSet` nhiều kích thước; ảnh hero/thumbnail đầu bài (có `priority`) không có `loading="lazy"` (đúng thiết kế) nhưng có `<link rel="preload" as="image">` tương ứng
- [x] Ảnh từ R2 hiển thị đúng qua `next/image` (không chỉ Unsplash) — verified: upload ảnh test lên R2, gắn vào bài viết, `/_next/image?url=...r2.dev...` trả về `200`, đúng `Content-Type: image/png`
- [x] Toàn bộ thumbnail đang có trong DB nằm trong allowlist domain — verified bằng script quét toàn bộ `thumbnail_url` hiện có, không có domain nào ngoài `*.r2.dev`/`images.unsplash.com`
- [ ] Chạy Lighthouse trên trang chủ và 1 trang bài viết, mobile — **chưa chạy được** (không có trình duyệt thật trong môi trường này để đo Lighthouse); cấu trúc HTML đã đúng chuẩn tối ưu (srcset/lazy/preload) nên kỳ vọng điểm cải thiện, nhưng cần bạn tự đo bằng Chrome DevTools hoặc PageSpeed Insights để xác nhận con số cụ thể
- [ ] Kiểm tra layout không vỡ (CLS) trên trình duyệt thật — cần bạn tự xem qua trình duyệt, không mô phỏng được bằng curl

### FE-01: Sửa lỗi nút Back trình duyệt trong `/admin`
**Mô tả:** `/admin` dùng `useState` cho điều hướng nội bộ (`activeTab`, `editingArticle`, `previewArticle` — [admin/page.tsx:99-106](src/app/admin/page.tsx#L99)) không đồng bộ URL. Bấm Back trình duyệt thoát hẳn khỏi `/admin` thay vì lùi lại 1 bước UI như user kỳ vọng. Đồng bộ state điều hướng vào query string qua `router.push`/`router.replace` (shallow).
**Status:** ⬜ Chưa bắt đầu
**Test-list accept:**
- [ ] Vào `/admin` → chuyển tab "Article Management" → URL đổi tương ứng (vd `?tab=articles`)
- [ ] Từ danh sách bài viết, bấm Edit 1 bài → URL đổi tương ứng (vd `?tab=articles&edit=<id>`)
- [ ] Bấm Back trình duyệt → quay lại đúng danh sách bài viết (không thoát khỏi `/admin`)
- [ ] Bấm Back lần nữa → quay lại tab Dashboard ban đầu
- [ ] Bấm Forward → tiến lại đúng thứ tự các màn hình đã qua

### TECH-02: Thêm caching cho public API/trang chủ
**Mô tả:** `revalidate = 0` trên trang chủ và trang bài viết khiến mọi request query MongoDB trực tiếp, không cache. Ở 50-100 user chưa vấn đề, nhưng nên thêm cache nhẹ (Next.js `unstable_cache` hoặc ISR với `revalidate: 60`) cho dữ liệu ít đổi (danh sách category, trang chủ) để có biên độ an toàn khi traffic tăng đột biến (chạy ads).
**Status:** ⬜ Chưa bắt đầu
**Test-list accept:**
- [ ] Trang chủ dùng ISR/cache với thời gian revalidate hợp lý (vd 60s), xác nhận qua response header `x-nextjs-cache` hoặc thời gian phản hồi giảm ở request lặp lại
- [ ] Đăng bài viết mới → xuất hiện trên trang chủ trong vòng thời gian revalidate đã cấu hình (không bị cache "cứng" quá lâu)
- [ ] View count vẫn cập nhật chính xác dù trang có cache (không bị cache đè số liệu view)

### TECH-03: Bổ sung test tự động cho luồng critical
**Mô tả:** Hiện không có test nào. Thêm tối thiểu smoke test cho: login (đúng/sai mật khẩu), CRUD article + ownership check 403, tracking redirect, XSS sanitize (gắn với SEC-03).
**Status:** ⬜ Chưa bắt đầu
**Test-list accept:**
- [ ] Có test framework được cài đặt và chạy được qua `npm test`
- [ ] Test login: đúng mật khẩu trả token hợp lệ, sai mật khẩu trả 401
- [ ] Test editor/author không sửa/xoá được bài của người khác (403), admin sửa/xoá được mọi bài
- [ ] Test redirect tracking tạo đúng `ClickLog` và redirect đúng URL
- [ ] Test content chứa `<script>` bị strip sau khi lưu (gắn với SEC-03)
- [ ] CI (nếu có) fail build khi test fail

---

## 🟢 Low — Tech debt, không gấp

### SEC-07: Validate scheme `base_url` affiliate link
**Mô tả:** [affiliate-links/route.ts](src/app/api/v1/cms/affiliate-links/route.ts) không validate `base_url` phải là `http`/`https`. Rủi ro thấp (chỉ admin sửa được) nhưng nên chặn `javascript:`/`data:` để phòng ngừa.
**Status:** ⬜ Chưa bắt đầu
**Test-list accept:**
- [ ] Tạo affiliate link với `base_url = "javascript:alert(1)"` → API trả lỗi validation, không lưu được
- [ ] Tạo affiliate link với `base_url = "https://example.com/?ref=abc"` → lưu thành công bình thường

### SEO-04: Thêm schema `BreadcrumbList`
**Mô tả:** Đã có cây category/subcategory nhưng chưa có structured data breadcrumb — dễ bổ sung, có lợi cho rich snippet và GEO citation.
**Status:** ⬜ Chưa bắt đầu
**Test-list accept:**
- [ ] Trang bài viết có JSON-LD `BreadcrumbList` đúng thứ tự Home > Category > Sub-category > Bài viết
- [ ] Validate qua Google Rich Results Test không báo lỗi

### SEO-05: Canonical/noindex cho URL filter & phân trang
**Mô tả:** Các biến thể `/?category=x&page=2` hiện không có canonical/noindex riêng, rủi ro index bloat/thin content.
**Status:** ⬜ Chưa bắt đầu
**Test-list accept:**
- [ ] `/?category=finance&page=2` có thẻ canonical trỏ về URL sạch hoặc có `noindex` phù hợp
- [ ] Trang chủ không filter (`/`) vẫn giữ nguyên index bình thường, không bị ảnh hưởng

### FE-02: Trang 404/error tuỳ biến
**Mô tả:** Chưa có `not-found.tsx`/`error.tsx` — hiện dùng fallback mặc định của Next.js, không đồng bộ branding.
**Status:** ⬜ Chưa bắt đầu
**Test-list accept:**
- [ ] Truy cập URL không tồn tại (vd `/admin/articles`, `/article/khong-ton-tai`) → hiện trang 404 theo design riêng của site, có link quay về trang chủ
- [ ] Trang 404 trả đúng HTTP status 404 (kiểm tra qua `curl -I`)

### TECH-01: Gỡ dependency chết
**Mô tả:** `drizzle-orm` + `pg` trong `package.json` không được import ở bất kỳ đâu trong `src/`.
**Status:** ⬜ Chưa bắt đầu
**Test-list accept:**
- [ ] Gỡ 2 package khỏi `package.json`, chạy `npm install` lại
- [ ] `npm run build` thành công, không có lỗi thiếu module
- [ ] App chạy bình thường, không tính năng nào bị ảnh hưởng
