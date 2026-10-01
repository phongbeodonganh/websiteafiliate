import { after } from 'next/server';

// D-05: run work after the HTTP response is sent, without blocking the response.
//
// Next's `after()` is the framework-supported post-response hook, but it THROWS
// (`E468` / "`after` was called outside a request scope") whenever it is called
// without an active request store — which is exactly what happens when a route
// handler is invoked directly inside a Vitest test (RESEARCH Pitfall 1). If the
// import route called `after()` bare, a successful import in a route-handler test
// would blow up.
//
// This helper absorbs that failure: it registers `after(fn)` when a request scope
// exists, and otherwise falls back to a detached microtask (`void fn()`), so the
// caller always gets a fire-and-forget schedule and never sees E468.
export function scheduleAfterResponse(fn: () => unknown): void {
  // Normalize the return value away — callers may pass a function returning a
  // value (e.g. `() => sweepDomains(...)`); `after` expects `void | Promise<void>`.
  const run = async (): Promise<void> => {
    await fn();
  };

  try {
    after(run);
  } catch (error) {
    const code = (error as { __NEXT_ERROR_CODE?: string } | null)?.__NEXT_ERROR_CODE;
    const message = error instanceof Error ? error.message : String(error);
    const outsideRequestScope =
      code === 'E468' || message.includes('outside a request scope');

    if (!outsideRequestScope) {
      // A genuine failure inside `after()` registration — surface it rather than
      // silently dropping the scheduled work.
      console.error('scheduleAfterResponse error:', error);
    }

    // Fire-and-forget fallback (no request scope, e.g. a direct route-handler test).
    void Promise.resolve()
      .then(run)
      .catch((err) => console.error('Background task error:', err));
  }
}
