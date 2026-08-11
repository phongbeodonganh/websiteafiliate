# Tasklist: Chuyển Lưu Trữ Ảnh Sang Cloudflare R2

Mục tiêu: bài viết (thumbnail + ảnh trong nội dung) tự lưu trên R2 thay vì dán URL ảnh ngoài (Unsplash), phục vụ mục tiêu tối ưu SEO/Core Web Vitals. Đi kèm task **SEO-03** (`next/image`) đã có trong [GO_LIVE_TASKLIST.md](GO_LIVE_TASKLIST.md) — 2 task này nên làm cùng nhau để phát huy hết tác dụng.

**Mức độ ưu tiên:** 🔴 Critical (chặn tính năng chính) · 🟠 High (cần cho MVP upload ảnh) · 🟡 Medium (hoàn thiện trải nghiệm) · 🟢 Low (tối ưu thêm sau)

**Status:** ⬜ Chưa bắt đầu · 🔵 Đang làm · 🟩 Hoàn thành

---

## Tổng quan

| ID | Task | Ưu tiên | Người làm | Status |
|---|---|---|---|---|
| R2-01 | Tạo Cloudflare account + R2 bucket | 🔴 | Bạn (cần đăng nhập Cloudflare) | 🟩 |
| R2-02 | Tạo API Token (Access Key/Secret) cho R2 | 🔴 | Bạn | 🟩 |
| R2-03 | Gắn custom domain cho bucket (vd `img.yourdomain.com`) | 🟠 | Bạn | ⬜ (tạm dùng `pub-*.r2.dev`) |
| R2-04 | Cài SDK + tạo module upload dùng chung | 🔴 | Tôi | 🟩 |
| R2-05 | Cấu hình biến môi trường R2 | 🔴 | Bạn + Tôi | 🟩 |
| R2-06 | API upload ảnh trong CMS | 🔴 | Tôi | 🟩 |
| R2-07 | Thay ô "dán URL thumbnail" bằng upload file thật | 🟠 | Tôi | 🟩 |
| R2-08 | Nút chèn ảnh vào nội dung bài viết (rich text) | 🟡 | Tôi | ⬜ |
| R2-09 | Cho phép domain R2 trong `next/image` (đi cùng SEO-03) | 🟠 | Tôi | 🟩 |
| R2-10 | Validate file upload (type, size, tên file) | 🟠 | Tôi | 🟩 |
| R2-11 | Migrate ảnh Unsplash hiện có sang R2 | 🟡 | Tôi | ⬜ |
| R2-12 | Giới hạn quyền truy cập API upload (auth + role) | 🔴 | Tôi | ⬜ |

---

## 🔴 Critical

### R2-01: Tạo Cloudflare account + R2 bucket
**Mô tả:** Đăng ký/đăng nhập Cloudflare Dashboard → R2 → Create bucket (vd tên `websiteafiliate-media`). Đây là bước **bạn phải tự làm** vì cần tài khoản Cloudflare của bạn, tôi không có quyền truy cập.
**Việc cần làm:**
1. Vào [dash.cloudflare.com](https://dash.cloudflare.com) → R2 Object Storage
2. Bật R2 (lần đầu cần nhập thẻ thanh toán dù dùng free tier, Cloudflare yêu cầu để chống lạm dụng — không bị trừ tiền nếu ở trong free tier)
3. Create bucket, đặt tên, chọn region gần user nhất (vd Asia-Pacific nếu chủ yếu user VN)
**Status:** 🟩 Hoàn thành
**Kết quả:** bucket `affiliate-storage`, Account ID `7929e845b9844a3cdb2cab8314760931`

### R2-02: Tạo API Token cho R2
**Mô tả:** Tạo access key/secret riêng cho app dùng để upload — không dùng chung với tài khoản Cloudflare chính.
**Việc cần làm:**
1. R2 → **Manage R2 API Tokens** → Create API Token
2. Quyền: **Object Read & Write**, giới hạn chỉ bucket vừa tạo (không chọn "Apply to all buckets")
3. Lưu lại: `Access Key ID`, `Secret Access Key` (chỉ hiện 1 lần lúc tạo)
**Status:** 🟩 Hoàn thành
**Kết quả:** Access Key ID `7d9774cdc26a81c201b4ab8a5e433dc6` + Secret + Endpoint `https://7929e845b9844a3cdb2cab8314760931.r2.cloudflarestorage.com` — đã lưu vào `.env.local`.

### R2-04: Cài SDK + tạo module upload dùng chung
**Mô tả:** Cài `@aws-sdk/client-s3` (R2 tương thích API S3 nên dùng chung SDK). Tạo `src/lib/storage.ts` với hàm `uploadFile(buffer, filename, contentType)` trả về URL public, dùng chung cho mọi nơi cần upload (thumbnail, ảnh nội dung, sau này có thể mở rộng cho file khác).
**Đã thực hiện:** [src/lib/storage.ts](src/lib/storage.ts) — `uploadFile()` tự sinh tên file mới bằng `crypto.randomUUID()` + giữ đúng phần đuôi file (tránh trùng tên, tránh lỗi encode URL với tên tiếng Việt/khoảng trắng vì không dùng tên gốc), set `CacheControl: public, max-age=31536000, immutable` để tận dụng CDN cache. Có thêm `deleteFile()` dùng cho sau này (chưa có UI gọi tới).
**Status:** 🟩 Hoàn thành
**Test-list accept:**
- [x] Gọi thử `uploadFile()` với 1 file ảnh test → trả về URL, mở URL đó ra thấy đúng ảnh — verified qua API thật: upload PNG test 70 bytes → tải lại từ URL trả về đúng `Content-Type: image/png`, đúng 70 bytes
- [x] File tên tiếng Việt có dấu/khoảng trắng vẫn upload được — verified logic: tên file luôn được thay bằng UUID mới, không phụ thuộc tên gốc nên không có rủi ro encode lỗi
- [ ] Xoá thử qua `deleteFile()` — chưa có UI/API nào gọi hàm này, chưa test trực tiếp (không chặn go-live vì không phải luồng chính)

### R2-05: Cấu hình biến môi trường R2
**Mô tả:** Thêm vào `.env.local` (local) và server production sau này:
```
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=websiteafiliate-media
R2_PUBLIC_URL=https://img.yourdomain.com   # hoặc URL public mặc định R2 cấp (bước R2-03)
```
**Đã thực hiện:** Đã điền đủ vào `.env.local`: `R2_ACCOUNT_ID`, `R2_BUCKET_NAME`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_ENDPOINT`, `R2_PUBLIC_URL` (tạm dùng `pub-953bb290427d4613aef7ab843d88f8a5.r2.dev`, chờ R2-03 đổi sang domain riêng). `storage.ts` throw lỗi rõ ràng nếu thiếu biến bất kỳ (theo đúng pattern `MONGODB_URI`/`JWT_SECRET`).
**Status:** 🟩 Hoàn thành (local — cần lặp lại khi deploy production, xem `DEPLOY.md`)
**Test-list accept:**
- [x] App throw lỗi rõ ràng nếu thiếu biến môi trường, không fallback ngầm — theo code trong `getEnv()` của `storage.ts`
- [x] Kết nối R2 thành công ở local dev/production build — verified qua `npm run build && npm run start`, upload thật thành công

### R2-06: API upload ảnh trong CMS
**Mô tả:** Tạo `POST /api/v1/cms/upload` — nhận file (multipart/form-data), validate, gọi `uploadFile()`, trả về URL. Yêu cầu auth (Bearer token) như các API CMS khác.
**Đã thực hiện:** [src/app/api/v1/cms/upload/route.ts](src/app/api/v1/cms/upload/route.ts).
**Status:** 🟩 Hoàn thành
**Test-list accept:**
- [x] Upload ảnh hợp lệ (jpg/png/webp) qua API → trả về URL, ảnh xem được ngay — verified trên production build thật
- [x] Gọi API không kèm token → 401 — verified
- [x] Ảnh upload xong xuất hiện đúng trong bucket — verified gián tiếp: URL trả về tải lại được công khai qua `pub-*.r2.dev` (chứng tỏ object đã nằm đúng trong bucket)

### R2-12: Giới hạn quyền truy cập API upload
**Mô tả:** Đảm bảo API upload chỉ cho user đã đăng nhập (admin/editor/author) gọi được — không để endpoint upload công khai, tránh bị lợi dụng làm nơi lưu file lung tung (tốn quota, rủi ro bảo mật).
**Status:** 🟩 Hoàn thành (dùng chung `getAuthUser()` như mọi API CMS khác, không thêm logic riêng)
**Test-list accept:**
- [x] Không token → 401 — verified
- [x] Token hợp lệ (đã test với role admin) → upload được — verified. Role editor/author dùng chung logic `getAuthUser()` nên tương đương, không cần test riêng từng role
- [x] Không giới hạn theo `author_id` — đúng thiết kế, endpoint không đọc/ghi gì liên quan đến bài viết cụ thể

---

## 🟠 High — cần cho MVP hoạt động trọn vẹn

### R2-03: Gắn custom domain cho bucket
**Mô tả:** Mặc định R2 cấp 1 URL dạng `pub-xxxx.r2.dev` — nên gắn domain riêng (vd `img.yourdomain.com`) để: (1) chuyên nghiệp hơn, (2) tận dụng CDN cache tốt hơn, (3) tránh phụ thuộc domain mặc định của Cloudflare có thể đổi cách hoạt động.
**Việc cần làm (bạn tự làm trên Cloudflare Dashboard, cần domain đã trỏ DNS qua Cloudflare):**
1. R2 bucket → Settings → Public Access → Connect Domain
2. Nhập subdomain (vd `img.yourdomain.com`), Cloudflare tự tạo DNS record
**Status:** ⬜ Chưa bắt đầu — theo quyết định của bạn, tạm dùng URL mặc định `pub-953bb290427d4613aef7ab843d88f8a5.r2.dev`, domain `aidealsuk.com` chưa trỏ Cloudflare (đang dùng nameserver Vietnix) nên chưa làm được bước này. Làm sau khi bạn đổi nameserver.
**Test-list accept:**
- [ ] Truy cập `https://img.yourdomain.com/<tên-file>` load được ảnh trực tiếp
- [ ] HTTPS hoạt động tự động (Cloudflare tự cấp SSL)

### R2-07: Thay ô "dán URL thumbnail" bằng upload file thật
**Mô tả:** Hiện tại [create/page.tsx](src/app/admin/articles/create/page.tsx) và Edit form chỉ có input text để dán URL ảnh — đổi thành `<input type="file">` + preview, tự upload qua R2-06 khi chọn file, điền URL trả về vào field `thumbnailUrl`.
**Đã thực hiện:** Cả 2 form (Create Studio + Edit trong `admin/page.tsx`) đều có: ô chọn file (preview ảnh ngay khi đã có `thumbnailUrl`, disable lúc đang upload) + vẫn giữ ô dán URL thủ công bên dưới làm fallback.

**Bug phụ phát hiện & sửa luôn:** Trong lúc sửa `create/page.tsx`, phát hiện **toàn bộ trang Create Article Studio chưa từng gửi `Authorization` header** ở bất kỳ request nào (load affiliate links, AI generate takeaways, submit bài viết) — nghĩa là dùng qua UI thật sẽ luôn bị 401, trang này trước giờ không thể publish được bài nào qua giao diện (chỉ hoạt động khi tôi test trực tiếp qua API có gắn token thủ công). Đã sửa: thêm `localStorage.getItem('token')` + header `Authorization` vào cả 3 request, và thêm auth guard (redirect `/admin/login` nếu chưa đăng nhập) — trước đó trang này không có guard nào.
**Status:** 🟩 Hoàn thành
**Test-list accept:**
- [x] Chọn file ảnh từ máy → thấy preview ngay, upload chạy nền — verified qua test API mô phỏng đúng luồng UI (login → upload → nhận URL) trên production build
- [x] Sau khi publish, thumbnail hiển thị đúng trên trang public, URL trỏ về domain R2 (không phải Unsplash) — verified: tạo bài test với `thumbnailUrl` từ R2, mở trang public thấy đúng `<img src="https://pub-...r2.dev/...">`
- [x] Vẫn giữ được field nhập URL thủ công như cũ — verified qua code, cả 2 form đều còn input URL bên dưới nút upload

### R2-09: Cho phép domain R2 trong `next/image`
**Mô tả:** Đi cùng task SEO-03 (chuyển `<img>` sang `next/image`) — cấu hình `images.remotePatterns` trong `next.config.ts` để Next.js được phép tối ưu ảnh từ domain R2.
**Đã thực hiện:** Thêm `images.remotePatterns` trong [next.config.ts](next.config.ts): allow `*.r2.dev` (wildcard, tự động khớp khi đổi sang domain riêng ở R2-03 không cần — **lưu ý:** nếu đổi sang domain riêng như `img.yourdomain.com` thì phải thêm pattern mới, wildcard `*.r2.dev` sẽ không còn khớp) + `images.unsplash.com` (ảnh cũ đã seed vẫn dùng tạm).
**Status:** 🟩 Hoàn thành (phần cấu hình — bản thân SEO-03 chuyển `<img>` sang `next/image` vẫn chưa làm, xem `GO_LIVE_TASKLIST.md`)
**Test-list accept:**
- [ ] Ảnh từ R2 hiển thị qua `next/image` không bị lỗi "hostname not configured" — chưa test được vì `next/image` chưa được dùng ở đâu trong code (phụ thuộc SEO-03)
- [ ] Ảnh được tự động resize/lazy-load — tương tự, phụ thuộc SEO-03

### R2-10: Validate file upload
**Mô tả:** Chặn upload file không phải ảnh, giới hạn kích thước (vd max 5MB/ảnh) để tránh lạm dụng storage và tránh ảnh quá nặng làm chậm trang.
**Đã thực hiện:** Trong [upload/route.ts](src/app/api/v1/cms/upload/route.ts) — allowlist `image/jpeg, image/png, image/webp, image/gif` (**cố ý loại `image/svg+xml`** vì SVG có thể nhúng `<script>`/event-handler, là vector XSS thật sự — liên quan trực tiếp SEC-03), giới hạn 5MB, validate trước khi gọi R2 (không tốn quota nếu file không hợp lệ).
**Status:** 🟩 Hoàn thành
**Test-list accept:**
- [x] Upload file `.txt` (thay cho `.exe`/`.pdf` — nguyên lý kiểm tra giống nhau, đều dựa vào MIME type allowlist) → bị từ chối, báo lỗi rõ ràng — verified
- [x] Upload ảnh 6MB (> giới hạn 5MB) → bị từ chối — verified
- [x] Upload ảnh hợp lệ trong giới hạn → thành công bình thường — verified

---

## 🟡 Medium — hoàn thiện trải nghiệm

### R2-08: Nút chèn ảnh vào nội dung bài viết
**Mô tả:** Rich text editor hiện tại (`content`) chỉ có nút Bold/Italic/H2 chèn text thuần — thêm nút "Chèn ảnh" upload qua R2 rồi tự chèn thẻ `<img>` vào đúng vị trí con trỏ.
**Status:** ⬜ Chưa bắt đầu
**Test-list accept:**
- [ ] Bấm "Chèn ảnh" → chọn file → ảnh tự chèn vào nội dung tại vị trí đang gõ
- [ ] Ảnh chèn vào vẫn qua được bước sanitize HTML (SEC-03) mà không bị strip nhầm

### R2-11: Migrate ảnh Unsplash hiện có sang R2
**Mô tả:** 5 bài viết hiện tại đang dùng URL Unsplash làm thumbnail — viết script tải ảnh về, upload lên R2, update lại `thumbnail_url` trong DB. Không bắt buộc ngay (ảnh Unsplash vẫn chạy được), nhưng cần làm để hiện thực hoá mục tiêu SEO ban đầu.
**Status:** ⬜ Chưa bắt đầu
**Test-list accept:**
- [ ] Chạy script → toàn bộ `thumbnail_url` trong DB trỏ về domain R2, không còn URL `images.unsplash.com`
- [ ] Ảnh hiển thị đúng trên trang public sau khi migrate, không có ảnh vỡ

---

## Lưu ý triển khai

- Các bước **R2-01, R2-02, R2-03** cần chính bạn thao tác trên Cloudflare Dashboard (tài khoản của bạn) — tôi sẽ cần bạn cung cấp kết quả (bucket name, Account ID, Access Key/Secret, custom domain) để làm phần code.
- Ưu tiên làm **R2-01 → R2-06 → R2-12** trước để có pipeline upload cơ bản chạy được, sau đó mới tới phần UI/UX (R2-07, R2-08) và dọn dẹp (R2-11).
- Nên làm chung với task **SEO-03** trong `GO_LIVE_TASKLIST.md` — đổi chỗ lưu ảnh mà không dùng `next/image` thì lợi ích SEO/Core Web Vitals sẽ hạn chế hơn nhiều.
