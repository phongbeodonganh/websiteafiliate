# Phase 1: Security Remediation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-11
**Phase:** 1-Security Remediation
**Areas discussed:** Seed route fate, Secrets scope, Warning page, Abuse controls

---

## Seed route fate

| Option | Description | Selected |
|--------|-------------|----------|
| Delete route | Xóa src/app/api/v1/seed/route.ts — CLI `npm run seed` đã covers đủ | ✓ |
| Gate + refuse prod | Giữ route nhưng yêu cầu bearer secret + từ chối khi NODE_ENV=production | |
| Admin auth only | Giữ như hiện tại, chỉ thêm auth admin | |

**User's choice:** Delete route
**Notes:** Route công khai đang `deleteMany({})` trên mọi collection + reset admin về password123.

| Option | Description | Selected |
|--------|-------------|----------|
| Dọn dẹp triệt để | Xóa cả seed-mongodb.ts + seed.ts wrapper, chỉ giữ CLI scripts/seed-*.ts | ✓ |
| Chỉ xóa route | Giữ nguyên seed-mongodb.ts vì CLI vẫn dùng | |

**User's choice:** Dọn dẹp triệt để (3 seed paths → 1)

| Option | Description | Selected |
|--------|-------------|----------|
| Test chống tái xuất hiện | Test asserting request không token tới seed path phải 404/401 | ✓ |
| Không cần test | Việc xóa file là đủ | |

**User's choice:** Test chống tái xuất hiện

| Option | Description | Selected |
|--------|-------------|----------|
| CLI recovery script | scripts/reset-admin.ts + ghi vào DEPLOY.md | ✓ |
| Dùng seed CLI | Dùng lại script seed để tạo user mới | |
| Để sau | Xử lý khi có sự cố | |

**User's choice:** CLI recovery script
**Notes:** Route seed cũ là con đường de-facto để reset admin khi mất mật khẩu.

---

## Secrets scope

| Option | Description | Selected |
|--------|-------------|----------|
| Code + rotate key | Xóa literals + user rotate Gemini key ở Google AI Studio | |
| Chỉ dọn code | Chỉ xóa literals khỏi source, chưa rotate | ✓ |

**User's choice:** Chỉ dọn code
**Notes:** User hiểu key cũ vẫn nằm trong git history và vẫn valid.

| Option | Description | Selected |
|--------|-------------|----------|
| Lazy getter (hiện tại) | Giữ pattern getMongoUri/getJwtSecret — throw lúc dùng | ✓ |
| Fail-fast startup | Validate khi server start | |

**User's choice:** Lazy getter (hiện tại)

| Option | Description | Selected |
|--------|-------------|----------|
| Env chính + settings phụ | Env GEMINI_API_KEY primary; per-user key CMS settings secondary | ✓ |
| Chỉ settings key | Bỏ hẳn phụ thuộc env | |

**User's choice:** Env chính + settings phụ

| Option | Description | Selected |
|--------|-------------|----------|
| Thêm CI grep gate | Step grep trong deploy.yml chặn fallback secret patterns + jwt.verify ngoài auth.ts | ✓ |
| Defer sang Phase 5 | Chỉ test 401 cho CMS routes | |

**User's choice:** Thêm CI grep gate
**Notes:** SEC-02 đã regress 1 lần đúng theo cách này.

---

## Warning page

| Option | Description | Selected |
|--------|-------------|----------|
| Route thật | Next.js route thật (CSP áp dụng, bỏ CDN Tailwind Play) | ✓ |
| HTML + escape | Giữ raw HTML string nhưng escape toàn bộ + bỏ CDN script | |

**User's choice:** Route thật
**Notes:** Hiện tại: template literal HTML trong tracking/redirect/route.ts:54-95, zero escaping, /api/** bị loại khỏi CSP.

| Option | Description | Selected |
|--------|-------------|----------|
| DB-backed qua ref | 302 → /blocked?ref=<id> — page tự tra DB; không truyền text qua URL | ✓ |
| Query params | Truyền reason/countries qua query → escape + length cap | |

**User's choice:** DB-backed qua ref

| Option | Description | Selected |
|--------|-------------|----------|
| Giữ 302 trung gian | Behavior hiện tại, chỉ đổi cách render | ✓ |
| 200 trực tiếp | Trả HTML sạch trực tiếp từ redirect route | |

**User's choice:** Giữ 302 trung gian

---

## Abuse controls

| Option | Description | Selected |
|--------|-------------|----------|
| Cả 3 endpoints | subscribe + tracking/click + tracking/redirect — reuse rateLimit.ts | ✓ |
| Chỉ subscribe | Click tracking giữ không limit | |
| Subscribe + click | Bỏ redirect GET | |

**User's choice:** Cả 3 endpoints

| Option | Description | Selected |
|--------|-------------|----------|
| 429 + dedupe | Subscribe → 429; click/redirect → drop bản ghi trùng (IP+link, ~60s) | ✓ |
| 429 cứng cả 3 | Đơn giản nhất nhưng chặn user thật | |
| You decide | Planner quyết định ngưỡng | |

**User's choice:** 429 + dedupe

| Option | Description | Selected |
|--------|-------------|----------|
| Last-hop + Nginx | Parse hop cuối trước Nginx + config Nginx overwrite XFF | ✓ |
| Code-only | Chỉ sửa code parse, không đụng Nginx | |

**User's choice:** Last-hop + Nginx

| Option | Description | Selected |
|--------|-------------|----------|
| Giữ localStorage | Không migrate httpOnly trong Phase 1 — Phase 1 đóng lỗ hổng, không refactor auth | ✓ |
| Chuyển httpOnly | Chuyển cookie luôn — chạm login + mọi CMS fetch | |

**User's choice:** Giữ localStorage

---

## the agent's Discretion

- Exact rate-limit thresholds and window sizes (user delegated on the policy question)
- Exact `/blocked` route path name and `ref` validation approach
- CI grep gate implementation detail (workflow step vs test assertion)

## Deferred Ideas

- Rotate exposed Gemini API key (+ leaked Google Cloud project ID) — user-side action, chosen out of this phase
- Migrate JWT localStorage → httpOnly cookies — later phase
- Redis-backed token blacklist / httpOnly revocation — already deferred (single-instance constraint)
- Atlas credential rotation / project-owned cluster — standing blocker (third-party ownership)
