import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import { connectToDatabase } from "@/lib/db/mongodb";
import { ProductModel } from "@/lib/db/product-models";
import { ClickLogModel, CLICK_PLACEMENTS, type ClickPlacement } from "@/lib/db/models";
import { checkUrlAgainstBlacklist } from "@/lib/blacklist";
import { appendSubId, getClientIp } from "@/lib/utils";
import { consumeDedupe, consumeRequest } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const productId = url.searchParams.get("product_id") || "";
  const offerId = url.searchParams.get("offer_id") || "";
  const rawPlacement = url.searchParams.get("placement") || "other";
  const placement: ClickPlacement = CLICK_PLACEMENTS.includes(rawPlacement as ClickPlacement) ? rawPlacement as ClickPlacement : "other";
  const fallback = new URL("/", req.url);
  if (!isValidObjectId(productId) || !isValidObjectId(offerId)) return NextResponse.redirect(fallback, 302);
  try {
    await connectToDatabase();
    const product = await ProductModel.findOne({ _id: productId, status: "published", "offers._id": offerId });
    const offer = product?.offers.id(offerId);
    if (!product || !offer || offer.status !== "active") return NextResponse.redirect(fallback, 302);
    const blocked = await checkUrlAgainstBlacklist(offer.affiliate_url);
    if (blocked.isBlacklisted) return NextResponse.redirect(new URL(`/products/${product.slug}`, req.url), 302);

    const ip = getClientIp(req);
    const allowed = consumeRequest(`product-redirect:${ip}`, 60, 60_000).allowed;
    const duplicate = consumeDedupe(`${ip}:${offerId}`, 60_000);
    if (allowed && !duplicate) {
      await Promise.all([
        ClickLogModel.create({ product_id: product._id, offer_id: offer._id, marketplace: offer.marketplace, placement, device: /mobile/i.test(req.headers.get("user-agent") || "") ? "mobile" : "desktop", referrer: req.headers.get("referer") || undefined, ip_address: ip }),
        ProductModel.updateOne({ _id: product._id, "offers._id": offer._id }, { $inc: { click_count: 1, "offers.$.click_count": 1 } }),
      ]);
    }
    const destination = new URL(appendSubId(offer.affiliate_url, product.slug));
    if (offer.subid_param) destination.searchParams.set(offer.subid_param, product.slug);
    const response = NextResponse.redirect(destination, 302);
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    console.error("Product redirect error:", error);
    return NextResponse.redirect(fallback, 302);
  }
}
