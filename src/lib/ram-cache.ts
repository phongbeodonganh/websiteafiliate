import "server-only";

type CacheEntry = {
  value: unknown;
  loadedAt: number;
};

type RamCacheState = {
  entries: Map<string, CacheEntry>;
  loads: Map<string, Promise<unknown>>;
};

declare global {
  var publicRamCache: RamCacheState | undefined;
}
const state = globalThis.publicRamCache ?? {
  entries: new Map<string, CacheEntry>(),
  loads: new Map<string, Promise<unknown>>(),
};

globalThis.publicRamCache = state;

/**
 * Process-local cache-aside storage. Values must be plain, immutable data.
 * Concurrent misses for the same key share one database load.
 */
export async function readThroughRamCache<T>(
  key: string,
  loader: () => Promise<T>,
  options: { maxAgeMs?: number } = {},
): Promise<T> {
  // Integration tests often mutate MongoDB directly instead of going through
  // the CMS write paths. Bypass process state so each test observes its fixture.
  if (process.env.NODE_ENV === "test") return loader();

  const cached = state.entries.get(key);
  if (cached && (options.maxAgeMs === undefined || Date.now() - cached.loadedAt <= options.maxAgeMs)) {
    return cached.value as T;
  }
  if (cached) state.entries.delete(key);

  const pending = state.loads.get(key);
  if (pending) return pending as Promise<T>;

  const load = loader()
    .then((value) => {
      state.entries.set(key, { value, loadedAt: Date.now() });
      return value;
    })
    .finally(() => {
      state.loads.delete(key);
    });

  state.loads.set(key, load);
  return load;
}

/** Replace a snapshot after the database write has succeeded. */
export function setRamCache<T>(key: string, value: T): T {
  state.entries.set(key, { value, loadedAt: Date.now() });
  return value;
}

/** Reload a complete snapshot and atomically swap it into RAM. */
export async function refreshRamCache<T>(key: string, loader: () => Promise<T>): Promise<T> {
  try {
    const value = await loader();
    return setRamCache(key, value);
  } catch (error) {
    // Never leave a known-stale snapshot active after a successful DB write.
    state.entries.delete(key);
    throw error;
  }
}

export function invalidateRamCache(key: string) {
  state.entries.delete(key);
}

export function getRamCacheSnapshot() {
  return [...state.entries.entries()].map(([key, entry]) => ({
    key,
    loadedAt: new Date(entry.loadedAt).toISOString(),
  }));
}
