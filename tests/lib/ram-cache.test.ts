import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  invalidateRamCache,
  readThroughRamCache,
  refreshRamCache,
  setRamCache,
  updateRamCache,
} from "@/lib/ram-cache";

const keys = ["test:dedupe", "test:evict", "test:update"];

describe("process-local RAM cache", () => {
  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("RAM_CACHE_ENABLED", "true");
    keys.forEach(invalidateRamCache);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    keys.forEach(invalidateRamCache);
  });

  it("deduplicates concurrent misses and reuses the loaded snapshot", async () => {
    const loader = vi.fn(async () => ({ version: 1 }));

    const [first, second] = await Promise.all([
      readThroughRamCache("test:dedupe", loader),
      readThroughRamCache("test:dedupe", loader),
    ]);
    const third = await readThroughRamCache("test:dedupe", loader);

    expect(first).toEqual({ version: 1 });
    expect(second).toBe(first);
    expect(third).toBe(first);
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it("evicts the old snapshot when a post-write refresh fails", async () => {
    setRamCache("test:evict", { version: 1 });
    await expect(refreshRamCache("test:evict", async () => {
      throw new Error("database unavailable");
    })).rejects.toThrow("database unavailable");

    const loader = vi.fn(async () => ({ version: 2 }));
    await expect(readThroughRamCache("test:evict", loader)).resolves.toEqual({ version: 2 });
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it("updates a loaded snapshot without another database read", async () => {
    setRamCache("test:update", { count: 1 });
    updateRamCache<{ count: number }>("test:update", (current) => ({ count: current.count + 1 }));
    const loader = vi.fn(async () => ({ count: 99 }));

    await expect(readThroughRamCache("test:update", loader)).resolves.toEqual({ count: 2 });
    expect(loader).not.toHaveBeenCalled();
  });

  it("bypasses reads, writes, updates, and refreshes when disabled", async () => {
    vi.stubEnv("RAM_CACHE_ENABLED", "false");
    setRamCache("test:update", { count: 1 });
    expect(updateRamCache<{ count: number }>("test:update", (current) => ({ count: current.count + 1 }))).toBeUndefined();

    const readLoader = vi.fn(async () => ({ count: 2 }));
    await readThroughRamCache("test:update", readLoader);
    await readThroughRamCache("test:update", readLoader);
    expect(readLoader).toHaveBeenCalledTimes(2);

    const refreshLoader = vi.fn(async () => ({ count: 3 }));
    await expect(refreshRamCache("test:update", refreshLoader)).resolves.toBeUndefined();
    expect(refreshLoader).not.toHaveBeenCalled();
  });
});
