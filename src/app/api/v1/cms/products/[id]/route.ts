import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { isValidObjectId, type HydratedDocument } from "mongoose";
import { getAuthUser } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db/mongodb";
import { ProductModel, type IProduct } from "@/lib/db/product-models";
import { normalizeProductInput } from "@/lib/products/validation";
import { slugify } from "@/lib/utils";

const canEdit = (user: { userId: string | number; role: string }, product: HydratedDocument<IProduct>) => user.role === "admin" || product.author_id?.toString() === String(user.userId);
const output = (doc: HydratedDocument<IProduct>) => { const value = doc.toObject(); return { ...value, id: value._id.toString(), _id: value._id.toString(), author_id: value.author_id?.toString() }; };
const isDuplicateKey = (error: unknown) => typeof error === "object" && error !== null && "code" in error && (error as { code?: unknown }).code === 11000;

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ status: "error", message: "Bạn chưa đăng nhập hoặc phiên làm việc đã hết hạn." }, { status: 401 });
  const { id } = await params;
  if (!isValidObjectId(id)) return NextResponse.json({ status: "error", message: "Không tìm thấy sản phẩm." }, { status: 404 });
  await connectToDatabase();
  const product = await ProductModel.findById(id);
  if (!product) return NextResponse.json({ status: "error", message: "Không tìm thấy sản phẩm." }, { status: 404 });
  if (!canEdit(user, product)) return NextResponse.json({ status: "error", message: "Bạn không có quyền chỉnh sửa sản phẩm này." }, { status: 403 });
  return NextResponse.json({ status: "success", data: output(product) });
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ status: "error", message: "Bạn chưa đăng nhập hoặc phiên làm việc đã hết hạn." }, { status: 401 });
  const { id } = await params;
  if (!isValidObjectId(id)) return NextResponse.json({ status: "error", message: "Không tìm thấy sản phẩm." }, { status: 404 });
  try {
    await connectToDatabase();
    const product = await ProductModel.findById(id);
    if (!product) return NextResponse.json({ status: "error", message: "Không tìm thấy sản phẩm." }, { status: 404 });
    if (!canEdit(user, product)) return NextResponse.json({ status: "error", message: "Bạn không có quyền chỉnh sửa sản phẩm này." }, { status: 403 });
    const previousSlug = product.slug;
    const body = await req.json();
    if (body.slug) body.slug = slugify(body.slug);
    const normalized = normalizeProductInput(body, true);
    if (normalized.errors.length) return NextResponse.json({ status: "error", message: normalized.errors.join(" · ") }, { status: 400 });
    product.set(normalized.data);
    await product.save();
    revalidatePath("/");
    revalidatePath(`/products/${previousSlug}`);
    revalidatePath(`/products/${product.slug}`);
    revalidatePath("/sitemap.xml");
    return NextResponse.json({ status: "success", data: output(product) });
  } catch (error: unknown) {
    console.error("CMS product PUT error:", error);
    const duplicate = isDuplicateKey(error);
    return NextResponse.json({ status: "error", message: duplicate ? "Mã SKU hoặc đường dẫn sản phẩm đã tồn tại." : "Không thể cập nhật sản phẩm." }, { status: duplicate ? 400 : 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ status: "error", message: "Bạn chưa đăng nhập hoặc phiên làm việc đã hết hạn." }, { status: 401 });
  const { id } = await params;
  if (!isValidObjectId(id)) return NextResponse.json({ status: "error", message: "Không tìm thấy sản phẩm." }, { status: 404 });
  await connectToDatabase();
  const product = await ProductModel.findById(id);
  if (!product) return NextResponse.json({ status: "error", message: "Không tìm thấy sản phẩm." }, { status: 404 });
  if (!canEdit(user, product)) return NextResponse.json({ status: "error", message: "Bạn không có quyền xóa sản phẩm này." }, { status: 403 });
  const slug = product.slug;
  await product.deleteOne();
  revalidatePath("/");
  revalidatePath(`/products/${slug}`);
  revalidatePath("/sitemap.xml");
  return NextResponse.json({ status: "success", data: { id } });
}
