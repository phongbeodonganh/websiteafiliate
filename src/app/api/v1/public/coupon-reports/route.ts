import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { CouponReportModel } from "@/lib/db/models";
import { consumeRequest } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/utils";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REASONS = new Set(["expired", "not_applied", "wrong_discount", "other"]);
const clean = (value: unknown, max: number) => typeof value === "string" ? value.trim().slice(0, max) : "";

export async function POST(request: Request) {
  const limit = consumeRequest(`coupon-report:${getClientIp(request)}`, 5, 60 * 60 * 1000);
  if (!limit.allowed) return NextResponse.json({ message: "Too many reports. Please try again later." }, { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds || 60) } });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body || clean(body.website, 100)) return NextResponse.json({ message: "Invalid report." }, { status: 400 });
  const pageUrl = clean(body.pageUrl, 500); const reason = clean(body.reason, 40) as "expired" | "not_applied" | "wrong_discount" | "other"; const email = clean(body.email, 254).toLowerCase();
  if (!pageUrl || !REASONS.has(reason) || (email && !EMAIL.test(email))) return NextResponse.json({ message: "Add a valid page URL, reason and optional email." }, { status: 400 });
  try {
    await connectToDatabase();
    await CouponReportModel.create({ store: clean(body.store, 120), coupon_code: clean(body.code, 80), page_url: pageUrl, email: email || undefined, reason, details: clean(body.details, 1000), status: "pending", priority: 100 });
    return NextResponse.json({ message: "Report received. It is now in our priority re-test queue." }, { status: 201 });
  } catch (error) {
    console.error("Unable to save coupon report:", error);
    return NextResponse.json({ message: "The report queue is temporarily unavailable. Please try again later." }, { status: 503 });
  }
}
