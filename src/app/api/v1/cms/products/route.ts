import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { Types, type HydratedDocument } from "mongoose";
import { getAuthUser } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db/mongodb";
import { ProductModel, type IProduct } from "@/lib/db/product-models";
import { normalizeProductInput } from "@/lib/products/validation";
import { slugify } from "@/lib/utils";

function adminProduct(doc: HydratedDocument<IProduct>) {
  const value = doc.toObject();
  return { ...value, id: value._id.toString(), _id: value._id.toString(), author_id: value.author_id?.toString() };
}

function isDuplicateKey(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: unknown }).code === 11000;
}

export async function GET(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ status: "error", message: "Bạn chưa đăng nhập hoặc phiên làm việc đã hết hạn." }, { status: 401 });
  try {
    await connectToDatabase();
    const filter = user.role === "admin" ? {} : { author_id: new Types.ObjectId(String(user.userId)) };
    const products = await ProductModel.find(filter).populate("category_id", "name slug").populate("brand_id", "name slug").sort({ updated_at: -1 });
    return NextResponse.json({ status: "success", data: products.map((product) => adminProduct(product as HydratedDocument<IProduct>)) });
  } catch (error) {
    console.error("CMS products GET error:", error);
    return NextResponse.json({ status: "error", message: "Không thể tải danh sách sản phẩm." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ status: "error", message: "Bạn chưa đăng nhập hoặc phiên làm việc đã hết hạn." }, { status: 401 });
  try {
    const body = await req.json();
    const normalized = normalizeProductInput(body, false);
    if (normalized.errors.length) return NextResponse.json({ status: "error", message: normalized.errors.join(" · ") }, { status: 400 });
    await connectToDatabase();
    const baseSlug = slugify(String(normalized.data.slug || normalized.data.name));
    let finalSlug = baseSlug || `product-${Date.now()}`;
    if (await ProductModel.exists({ slug: finalSlug })) finalSlug = `${finalSlug}-${Date.now().toString().slice(-5)}`;
    const product = new ProductModel({
      ...normalized.data,
      slug: finalSlug,
      author_id: user.userId,
      currency: "USD",
    });
    await product.save();
    revalidatePath("/");
    revalidatePath(`/products/${product.slug}`);
    revalidatePath("/sitemap.xml");
    return NextResponse.json({ status: "success", data: adminProduct(product) }, { status: 201 });
  } catch (error: unknown) {
    console.error("CMS product POST error:", error);
    const duplicate = isDuplicateKey(error);
    return NextResponse.json({ status: "error", message: duplicate ? "Mã SKU hoặc đường dẫn sản phẩm đã tồn tại." : "Không thể tạo sản phẩm mới." }, { status: duplicate ? 400 : 500 });
  }
}
