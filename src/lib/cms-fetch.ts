// D-03: one shared auth-fetch helper for every CMS call made from the canonical
// admin editor. It always attaches the Bearer token when one is supplied and
// normalizes every response into an explicit success or a status-mapped failure
// — so no editor call can silently omit the header or swallow a non-2xx.
//
// Dependency-free by design (no React, no next/*) so it is unit-testable in the
// suite's `environment: 'node'` without a jsdom shim.

export type CmsFetchResult<T> =
  | { ok: true; status: number; data: T }
  | { ok: false; status: number; message: string };

export interface CmsFetchOptions {
  method?: string;
  body?: unknown;
  token?: string | null;
  signal?: AbortSignal;
}

/** True when the response envelope is a success envelope. */
function isSuccessEnvelope(envelope: unknown): boolean {
  if (typeof envelope !== 'object' || envelope === null) return false;
  return (envelope as { status?: unknown }).status === 'success';
}

/** Pull a string `message` out of an arbitrary parsed envelope, if present. */
function envelopeMessage(envelope: unknown): string | undefined {
  if (typeof envelope !== 'object' || envelope === null) return undefined;
  const message = (envelope as { message?: unknown }).message;
  return typeof message === 'string' && message.length > 0 ? message : undefined;
}

/**
 * Map an HTTP status (or 0 for a transport failure) to the UI-SPEC Copywriting
 * Contract row. A 400 passes the server's own `message` through verbatim — it is
 * the actionable text — with the documented fallback when absent.
 */
export function errorMessageForResponse(status: number, serverMessage?: string): string {
  switch (status) {
    case 401:
      return 'Your session expired. Sign in again to continue.';
    case 403:
      return "You don't have permission to do that. Ask an admin if you need access.";
    case 404:
      return 'That article no longer exists. It may have been deleted.';
    case 400:
      return serverMessage && serverMessage.trim().length > 0
        ? serverMessage
        : 'That request was rejected. Check the fields and try again.';
    case 500:
      return 'Something went wrong on the server. Try again in a moment.';
    case 0:
      return "Can't reach the server. Check your connection and try again.";
    default:
      return "That action didn't complete. Try again.";
  }
}

/**
 * Perform a CMS request through the shared pipeline.
 *
 * - Sets `Content-Type: application/json` and serializes `body` when present.
 * - Attaches `Authorization: Bearer <token>` whenever a token is supplied.
 * - Treats a non-2xx response OR an envelope with `status: 'error'` as a failure.
 * - Never throws for an HTTP error; a genuine fetch rejection becomes
 *   `{ ok: false, status: 0, message: <network copy> }`.
 */
export async function cmsFetch<T>(
  path: string,
  options: CmsFetchOptions = {}
): Promise<CmsFetchResult<T>> {
  const { method, body, token, signal } = options;

  // FormData uploads must pass through untouched: the browser sets the multipart
  // Content-Type (with its boundary) itself, so we neither stringify the body nor
  // set a Content-Type header.
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;

  const headers: Record<string, string> = {};
  if (body !== undefined && !isFormData) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(path, {
      method: method || 'GET',
      headers,
      body:
        body === undefined
          ? undefined
          : isFormData
            ? (body as FormData)
            : JSON.stringify(body),
      signal,
    });
  } catch {
    // A thrown fetch (network failure, DNS, abort) never escapes the helper.
    return { ok: false, status: 0, message: errorMessageForResponse(0) };
  }

  let envelope: unknown = undefined;
  try {
    envelope = await response.json();
  } catch {
    // A non-JSON body leaves the envelope undefined; the status still drives the
    // mapped message below.
  }

  if (!response.ok || !isSuccessEnvelope(envelope)) {
    return {
      ok: false,
      status: response.status,
      message: errorMessageForResponse(response.status, envelopeMessage(envelope)),
    };
  }

  const data = (envelope as { data?: unknown }).data as T;
  return { ok: true, status: response.status, data };
}
