import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  invalidateRamCache,
  readThroughRamCache,
  refreshRamCache,
  setRamCache,
} from "@/lib/ram-cache";

const keys = ["test:dedupe", "test:evict"];

describe("process-local RAM cache", () => {
  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "production");
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
});
