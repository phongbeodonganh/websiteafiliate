import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { Types } from "mongoose";
import { getAuthUser } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db/mongodb";
import { StoreModel, StoreMetricsModel } from "@/lib/db/store-models";
import { UserModel, CategoryModel } from "@/lib/db/models";
import { getCategory } from "@/lib/marketplace";
import { normalizeStoreInput } from "./validation";
import { getStoreRecords, legacyStoreRecords } from "./public";

function failure(message: string, status: number) {
  return NextResponse.json({ status: "error", message }, { status });
}
function invalidate(slug: string) {
  for (const path of ["/", "/stores", "/search", `/store/${slug}`, "/sitemap.xml"]) revalidatePath(path);
  revalidatePath("/category/[slug]", "page");
}

export async function handleStores(req: Request, id?: string) {
  try {
    const user = await getAuthUser(req);
    if (!user) return failure("Bạn chưa đăng nhập hoặc phiên làm việc đã hết hạn.", 401);
    if (user.role !== "admin") return failure("Chỉ quản trị viên được quản lý store và coupon.", 403);
    // Re-check the current role, including tokens issued before a demotion.
    const account = await UserModel.findById(user.userId).select("role");
    if (account?.role !== "admin") return failure("Chỉ quản trị viên được quản lý store và coupon.", 403);
    const legacy = id?.startsWith("legacy-") && req.method === "DELETE" ? legacyStoreRecords().find((store) => `legacy-${store.slug}` === id) : null;
    if (id && !legacy && !/^[a-f\d]{24}$/i.test(id)) return failure("ID store không hợp lệ.", 400);
    await connectToDatabase();
    if (req.method === "GET") {
      const metrics = await StoreMetricsModel.find().lean();
      const counts = new Map(metrics.map((metric) => [metric.slug, metric]));
      const data = (await getStoreRecords()).filter((store) => store.status !== "deleted").map((store) => ({
        ...store, viewCount: counts.get(store.slug)?.viewCount || 0, clickCount: counts.get(store.slug)?.clickCount || 0,
      }));
      return NextResponse.json({ status: "success", data });
    }
    const existing = legacy
      ? await StoreModel.findOne({ slug: legacy.slug }) || new StoreModel(legacy)
      : id ? await StoreModel.findById(new Types.ObjectId(id)) : null;
    if (id && !existing) return failure("Store không còn tồn tại.", 404);
    if (req.method === "DELETE" && existing) {
      if (existing.status === "deleted") return failure("Store đã bị xoá.", 404);
      // Keep a tombstone so built-in stores cannot reappear after deletion.
      existing.status = new URL(req.url).searchParams.get("action") === "delete" ? "deleted" : "archived";
      await existing.save();
      invalidate(existing.slug);
      return NextResponse.json({ status: "success", data: { id: existing._id.toString(), status: existing.status } });
    }
    const normalized = normalizeStoreInput(await req.json());
    if (normalized.errors.length) return failure(normalized.errors.join(" · "), 400);
    if (existing?.status === "deleted") return failure("Store đã bị xoá.", 404);
    if (normalized.data.categorySlug && !getCategory(normalized.data.categorySlug) && !await CategoryModel.exists({ slug: normalized.data.categorySlug })) return failure("Danh mục không còn tồn tại. Hãy chọn lại danh mục.", 400);
    if (existing && normalized.data.slug !== existing.slug) return failure("Đường dẫn store đã lưu không thể thay đổi.", 400);
    const store = existing || new StoreModel();
    store.set(normalized.data);
    await store.save();
    invalidate(store.slug);
    return NextResponse.json({ status: "success", data: { ...store.toObject(), id: store._id.toString() } }, { status: existing ? 200 : 201 });
  } catch (error) {
    if (error instanceof SyntaxError) return failure("Dữ liệu JSON không hợp lệ.", 400);
    if (typeof error === "object" && error !== null && "code" in error && error.code === 11000) return failure("Đường dẫn store đã tồn tại. Hãy chọn đường dẫn khác.", 400);
    console.error("CMS stores error:", error);
    return failure("Không thể xử lý store. Vui lòng thử lại.", 500);
  }
}
