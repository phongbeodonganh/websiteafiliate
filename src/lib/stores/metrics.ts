import { StoreMetricsModel } from "@/lib/db/store-models";
import { consumeDedupe, consumeRequest } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/utils";

export async function recordStoreMetric(req: Request, slug: string, kind: "viewCount" | "clickCount") {
  if (/bot|crawler|spider|preview/i.test(req.headers.get("user-agent") || "")) return;
  const ip = getClientIp(req);
  if (!consumeRequest(`store-metrics:${ip}`, 120, 60_000).allowed) return;
  if (consumeDedupe(`store:${kind}:${slug}:${ip}`, 60_000)) return;
  try {
    await StoreMetricsModel.updateOne({ slug }, { $inc: { [kind]: 1 } }, { upsert: true });
  } catch (error) {
    // Analytics must never prevent an otherwise valid affiliate redirect.
    console.error("Store metrics error:", error);
  }
}
