const DISABLED_VALUES = new Set(['0', 'false', 'no', 'off']);

/**
 * Shared Insider feature flag for browser and server code.
 * Missing values preserve the existing enabled behaviour.
 */
export function isInsiderEnabled() {
  const value = process.env.NEXT_PUBLIC_INSIDER_ENABLED;
  return !value || !DISABLED_VALUES.has(value.trim().toLowerCase());
}

export function insiderDisabledResponse() {
  return Response.json(
    { status: 'error', message: 'Insider is currently disabled.' },
    { status: 503 },
  );
}
