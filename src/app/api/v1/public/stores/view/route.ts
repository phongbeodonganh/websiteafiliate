import { NextResponse } from "next/server";
import { getPublishedStores } from "@/lib/stores/public";
import { recordStoreMetric } from "@/lib/stores/metrics";

export async function POST(req: Request) {
  const origin = req.headers.get("origin");
  if (req.headers.get("sec-fetch-site") === "cross-site" || (origin && origin !== new URL(req.url).origin)) return new NextResponse(null, { status: 403 });
  try {
    const { slug } = await req.json();
    if (typeof slug !== "string" || slug.length > 120) return new NextResponse(null, { status: 400 });
    const store = (await getPublishedStores()).find((item) => item.slug === slug);
    if (!store) return new NextResponse(null, { status: 404 });
    await recordStoreMetric(req, slug, "viewCount");
    return new NextResponse(null, { status: 204 });
  } catch { return new NextResponse(null, { status: 400 }); }
}
