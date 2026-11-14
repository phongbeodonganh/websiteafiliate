// Shared helpers for the admin Traffic Intelligence tab (Phase 06 / Plan 02).
//
// - DTOs mirror the Plan 01 route payloads verbatim (snake_case TrafficResponse,
//   masked config payload) so no reshaping happens between server and UI.
// - `trafficFetch` is the Bearer-token fetch pattern used across the admin shell
//   (localStorage 'token'), NOT cmsFetch: the traffic routes carry the actionable
//   Vietnamese message in both `message` and `error.message` on every failure
//   status (400 invalid_domain, 500 missing_api_key, 402 insufficient_credits,
//   502 unexpected_error), and the UI must surface those verbatim — cmsFetch
//   would replace them with its English status-mapped copy.

import type { MonthlyVisit, TrafficResponse } from '@/types/traffic';

// ---------------------------------------------------------------------------
// DTOs
// ---------------------------------------------------------------------------

/** One row of GET /api/v1/cms/traffic/domains. */
export interface TrafficRow {
  id: string;
  domain: string;
  report: TrafficResponse | null;
  lastFetchedAt: string | null;
  lastError: { code: string; message: string } | null;
  updatedAt?: string | null;
}

export type TrafficConfigKey =
  | 'tabApiKey'
  | 'serpApiKey'
  | 'whoisApiKey'
  | 'seRankingApiKey'
  | 'trustpilotScraperUrl';

export type TrafficKeySource = 'db' | 'env' | null;

/** GET/PUT /api/v1/cms/traffic/config payload — masked values only. */
export interface TrafficConfigData {
  masked: Record<TrafficConfigKey, string | null>;
  source: Record<TrafficConfigKey, TrafficKeySource>;
  months: number;
  missing: string[];
}

// ---------------------------------------------------------------------------
// Fetch helper (Bearer-token pattern, Vietnamese route messages preserved)
// ---------------------------------------------------------------------------

export type TrafficApiResult<T> =
  | { ok: true; status: number; data: T }
  | { ok: false; status: number; message: string; code: string | null };

const NETWORK_ERROR_MESSAGE = 'Không thể kết nối máy chủ. Kiểm tra kết nối và thử lại.';
const FALLBACK_ERROR_MESSAGE = 'Không thể thực hiện thao tác này.';

export async function trafficFetch<T>(
  path: string,
  init: { method?: string; body?: unknown } = {}
): Promise<TrafficApiResult<T>> {
  let token: string | null = null;
  try {
    token = localStorage.getItem('token');
  } catch {
    // Private-mode storage failure — proceed unauthenticated; the route 401s.
  }

  const headers: Record<string, string> = {};
  if (init.body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(path, {
      method: init.method ?? 'GET',
      headers,
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });
  } catch {
    return { ok: false, status: 0, message: NETWORK_ERROR_MESSAGE, code: null };
  }

  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok) {
    const envelope = (body ?? {}) as {
      message?: unknown;
      error?: { code?: unknown; message?: unknown };
    };
    const fromMessage =
      typeof envelope.message === 'string' && envelope.message.length > 0
        ? envelope.message
        : null;
    const fromError =
      typeof envelope.error?.message === 'string' && envelope.error.message.length > 0
        ? envelope.error.message
        : null;
    const code = typeof envelope.error?.code === 'string' ? envelope.error.code : null;
    return {
      ok: false,
      status: response.status,
      message: fromMessage ?? fromError ?? FALLBACK_ERROR_MESSAGE,
      code,
    };
  }

  return { ok: true, status: response.status, data: body as T };
}

// ---------------------------------------------------------------------------
// Pure view helpers
// ---------------------------------------------------------------------------

/** Client-side domain substring search (case-insensitive). */
export function filterRows(rows: TrafficRow[], query: string): TrafficRow[] {
  const q = query.trim().toLowerCase();
  if (!q) return rows;
  return rows.filter((row) => row.domain.toLowerCase().includes(q));
}

export type TrafficSortKey =
  | 'visits'
  | 'global_rank'
  | 'country_rank'
  | 'bounce_rate'
  | 'pages_per_visit'
  | 'updated';

export type SortDir = 'asc' | 'desc';

function sortMetric(row: TrafficRow, key: TrafficSortKey): number | null {
  const overview = row.report?.overview ?? null;
  switch (key) {
    case 'visits':
      return overview?.visits ?? null;
    case 'global_rank':
      return overview?.global_rank ?? null;
    case 'country_rank':
      return overview?.country_rank?.rank ?? null;
    case 'bounce_rate':
      return overview?.bounce_rate ?? null;
    case 'pages_per_visit':
      return overview?.pages_per_visit ?? null;
    case 'updated': {
      const time = row.lastFetchedAt ? Date.parse(row.lastFetchedAt) : NaN;
      return Number.isNaN(time) ? null : time;
    }
  }
}

/**
 * Sort rows on a numeric/date column. Null metrics always sink to the end
 * regardless of direction so '—' rows never hide sorted data.
 */
export function sortRows(
  rows: TrafficRow[],
  key: TrafficSortKey,
  dir: SortDir
): TrafficRow[] {
  const mult = dir === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    const av = sortMetric(a, key);
    const bv = sortMetric(b, key);
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    return (av - bv) * mult;
  });
}

/**
 * Month-over-month traffic change from the last two `monthly_visits` points.
 * Returns a fraction (0.12 = +12%) or null when fewer than 2 points exist or
 * the previous month has no positive baseline.
 */
export function momTrend(monthly: MonthlyVisit[] | null | undefined): number | null {
  if (!monthly || monthly.length < 2) return null;
  const prev = monthly[monthly.length - 2]?.visits;
  const last = monthly[monthly.length - 1]?.visits;
  if (typeof prev !== 'number' || typeof last !== 'number' || prev <= 0) return null;
  return (last - prev) / prev;
}

/**
 * Extract the Vietnamese error message from a soft-slice payload
 * (HTTP-200 `{ data, error }` convention on whois/trustpilot/referring-sites/
 * seranking routes). Returns null when the slice carries no error — the caller
 * must treat a non-null result as an error state, never as success data.
 */
export function sliceMessage(
  slice: { error: { message?: string } | null } | null | undefined
): string | null {
  const message = slice?.error?.message;
  return typeof message === 'string' && message.length > 0 ? message : null;
}

/** Vietnamese relative time for the Cập nhật column. */
export function formatRelativeTime(
  value: string | null | undefined,
  now: number = Date.now()
): string {
  if (!value) return '—';
  const time = Date.parse(value);
  if (Number.isNaN(time)) return '—';
  const diffMs = now - time;
  if (diffMs < 60_000) return 'vừa xong';
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} ngày trước`;
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(time));
}

// ---------------------------------------------------------------------------
// Click-to-load panel state machine (credit-conscious: never auto-fetch)
// ---------------------------------------------------------------------------

export type TrafficPanelPhase = 'collapsed' | 'loading' | 'error' | 'missing' | 'ready' | 'empty';

export interface PanelViewInput {
  expanded: boolean;
  loading: boolean;
  errorMessage: string | null;
  missingKey: boolean;
  hasData: boolean;
}

/**
 * Derive which body state a click-to-load panel renders:
 *  - collapsed: header only (nothing fetched)
 *  - loading:   spinner
 *  - error:     Vietnamese slice/route error + retry
 *  - missing:   'Chưa cấu hình key — vào Cấu hình API' + disabled action
 *  - ready:     data
 *  - empty:     fetched successfully but provider returned nothing
 */
export function derivePanelPhase(state: PanelViewInput): TrafficPanelPhase {
  if (!state.expanded) return 'collapsed';
  if (state.loading) return 'loading';
  if (state.errorMessage) return 'error';
  if (state.missingKey) return 'missing';
  return state.hasData ? 'ready' : 'empty';
}

// ---------------------------------------------------------------------------
// Row list reducers used by page.tsx callbacks
// ---------------------------------------------------------------------------

/** Upsert by id or domain (Add & run updates an existing row instead of duplicating). */
export function upsertRow(rows: TrafficRow[], row: TrafficRow): TrafficRow[] {
  const index = rows.findIndex((r) => r.id === row.id || r.domain === row.domain);
  if (index === -1) return [row, ...rows];
  const next = [...rows];
  next[index] = { ...next[index], ...row };
  return next;
}
