import jwt from 'jsonwebtoken';

// In-memory, per-process store — same constraint as rateLimit.ts: correct only for a
// single-instance deployment. See GO_LIVE_TASKLIST.md SEC-06 for what must change
// (shared store, e.g. Redis) before running multiple instances/processes.
const blacklist = new Map<string, number>(); // token -> exp (ms epoch)

// Ghi token đã logout vào blacklist, tự hết hạn đúng lúc token tự hết hạn (không cần
// dọn tay) — không verify lại chữ ký ở đây vì hàm này chỉ được gọi sau khi token đã
// được xác thực hợp lệ (route logout gọi getAuthUser trước).
export function blacklistToken(token: string): void {
  const decoded = jwt.decode(token) as { exp?: number } | null;
  if (!decoded?.exp) return;
  blacklist.set(token, decoded.exp * 1000);
}

export function isBlacklisted(token: string): boolean {
  const expiresAt = blacklist.get(token);
  if (expiresAt === undefined) return false;
  if (Date.now() > expiresAt) {
    blacklist.delete(token); // token đã hết hạn tự nhiên, không cần giữ trong blacklist nữa
    return false;
  }
  return true;
}
