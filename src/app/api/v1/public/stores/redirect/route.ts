import { NextResponse } from "next/server";
import { getPublishedStores } from "@/lib/stores/public";
import { recordStoreMetric } from "@/lib/stores/metrics";
import { prepareAffiliateContent } from "@/lib/affiliate-content";
import { checkUrlAgainstBlacklist } from "@/lib/blacklist";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const fallback = new URL("/stores", req.url);
  const redirect = (destination: URL) => {
    const response = NextResponse.redirect(destination, 302);
    response.headers.set("Cache-Control", "no-store");
    return response;
  };
  try {
    const store = (await getPublishedStores()).find((item) => item.slug === params.get("store"));
    if (!store) return redirect(fallback);
    let destination = store.destination;
    if (params.has("link")) {
      const index = params.get("link") || "";
      if (!/^\d{1,4}$/.test(index)) return redirect(fallback);
      destination = prepareAffiliateContent(store.content).links[Number(index)];
    } else if (params.has("offer")) {
      const offer = store.offers.find((offer) => offer.id === params.get("offer"));
      if (!offer) return redirect(fallback);
      destination = offer.destination || store.destination;
    }
    const target = new URL(destination);
    if (!["http:", "https:"].includes(target.protocol) || target.username || target.password) return redirect(fallback);
    if ((await checkUrlAgainstBlacklist(target.href)).isBlacklisted) return redirect(new URL(`/store/${store.slug}`, req.url));
    await recordStoreMetric(req, store.slug, "clickCount");
    return redirect(target);
  } catch {
    return redirect(fallback);
  }
}
