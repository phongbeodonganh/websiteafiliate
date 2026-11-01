import { StoreMetricsModel } from "@/lib/db/store-models";
import { connectToDatabase } from "@/lib/db/mongodb";
import { readThroughRamCache, refreshRamCache, updateRamCache } from "@/lib/ram-cache";
import { consumeDedupe, consumeRequest } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/utils";

const STORE_METRICS_KEY = "public:store-metrics";

export type StoreMetricSnapshot = Record<string, { viewCount: number; clickCount: number }>;

async function loadStoreMetricSnapshot(): Promise<StoreMetricSnapshot> {
  await connectToDatabase();
  const metrics = await StoreMetricsModel.find().select("slug viewCount clickCount -_id").lean();
  return Object.fromEntries(metrics.map((metric) => [metric.slug, {
    viewCount: Number(metric.viewCount || 0),
    clickCount: Number(metric.clickCount || 0),
  }]));
}

export function getStoreMetricSnapshot() {
  return readThroughRamCache(STORE_METRICS_KEY, loadStoreMetricSnapshot);
}

export function refreshStoreMetricsCache() {
  return refreshRamCache(STORE_METRICS_KEY, loadStoreMetricSnapshot);
}

function incrementCachedStoreMetric(slug: string, kind: "viewCount" | "clickCount") {
  updateRamCache<StoreMetricSnapshot>(STORE_METRICS_KEY, (current) => {
    const metric = current[slug] ?? { viewCount: 0, clickCount: 0 };
    return {
      ...current,
      [slug]: { ...metric, [kind]: metric[kind] + 1 },
    };
  });
}

export async function recordStoreMetric(req: Request, slug: string, kind: "viewCount" | "clickCount") {
  if (/bot|crawler|spider|preview/i.test(req.headers.get("user-agent") || "")) return;
  const ip = getClientIp(req);
  if (!consumeRequest(`store-metrics:${ip}`, 120, 60_000).allowed) return;
  if (consumeDedupe(`store:${kind}:${slug}:${ip}`, 60_000)) return;
  try {
    await StoreMetricsModel.updateOne({ slug }, { $inc: { [kind]: 1 } }, { upsert: true });
    incrementCachedStoreMetric(slug, kind);
  } catch (error) {
    // Analytics must never prevent an otherwise valid affiliate redirect.
    console.error("Store metrics error:", error);
  }
}
