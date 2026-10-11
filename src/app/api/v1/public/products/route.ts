import { NextResponse } from "next/server";
import { getStorefrontProducts } from "@/lib/products/public";

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const products = await getStorefrontProducts({
    query: params.get("q") || "",
    category: params.get("category") || "",
    limit: Number(params.get("limit") || 24),
  });
  return NextResponse.json({ status: "success", data: products }, { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } });
}

