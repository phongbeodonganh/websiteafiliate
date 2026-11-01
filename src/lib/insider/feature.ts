const ENABLED_VALUES = new Set(['1', 'true', 'yes', 'on']);

/**
 * Shared Insider feature flag for browser and server code.
 * Missing or unrecognized values fail closed and keep Insider disabled.
 */
export function isInsiderEnabled() {
  const value = process.env.NEXT_PUBLIC_INSIDER_ENABLED;
  return Boolean(value && ENABLED_VALUES.has(value.trim().toLowerCase()));
}

export function insiderDisabledResponse() {
  return Response.json(
    { status: 'error', message: 'Insider is currently disabled.' },
    { status: 503 },
  );
}
