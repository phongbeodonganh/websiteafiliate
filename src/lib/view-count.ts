import { ArticleModel } from "@/lib/db/models";
import { consumeDedupe, _resetForTests } from "@/lib/rateLimit";

// Dedupe window matches Phase 1 click-tracking (60s rolling window).
export const DEDUPE_WINDOW_MS = 60_000;

const OBJECT_ID_RE = /^[0-9a-fA-F]{24}$/;

/**
 * Fire-and-forget view counter (D-01, D-02, D-03).
 *
 * Uses consumeDedupe (rolling lastSeenAt Map) so N rapid views from the same
 * IP+article pair within DEDUPE_WINDOW_MS increment view_count by exactly 1.
 * The actual write is an atomic MongoDB $inc — no read-modify-write window.
 *
 * Designed to be called inside an after() callback (next/server) so it never
 * blocks the RSC response. Must NOT be called in tests without a Next request
 * context — call recordView directly instead (after() is skipped in vitest).
 *
 * Guard-clauses on invalid ObjectId strings so a malformed articleId never
 * throws into the after() handler.
 */
export async function recordView(articleId: string, ip: string): Promise<void> {
  const key = `${ip}:${articleId}`;
  if (consumeDedupe(key, DEDUPE_WINDOW_MS)) return;

  if (!OBJECT_ID_RE.test(articleId)) return;

  await ArticleModel.updateOne(
    { _id: articleId },
    { $inc: { view_count: 1 } },
  );
}

export { _resetForTests };
