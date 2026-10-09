"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Box,
  Check,
  ChevronDown,
  ExternalLink,
  Eye,
  ImagePlus,
  MousePointerClick,
  Package,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { cmsFetch } from "@/lib/cms-fetch";
import { MARKETPLACE_KEYS, getMarketplaceMeta } from "@/lib/marketplaces";

type Category = { id: string; name: string; subCategories?: { id: string; name: string }[] };
type AdminOffer = { _id?: string; marketplace?: string; store_name?: string; affiliate_url?: string; price?: number; original_price?: number; coupon_code?: string; coupon_note?: string; free_shipping?: boolean };
type AdminProduct = {
  id: string; name: string; sku: string; slug: string; status: string;
  category_id?: string | { _id?: string; name?: string }; sub_category_id?: string | { _id?: string; name?: string };
  short_description?: string; description?: string; images?: { url: string }[]; highlights?: string[]; pros?: string[]; cons?: string[];
  specs?: { group: string; items: { label: string; value: string }[] }[]; material?: string; origin_country?: string; warranty_months?: number;
  editor_score?: number; offers?: AdminOffer[]; price?: number; original_price?: number; price_min?: number; discount_percent?: number;
  trust?: { authentic?: boolean; free_shipping?: boolean; return_days?: number; warranty_text?: string };
  is_featured?: boolean; is_deal?: boolean; meta_title?: string; meta_description?: string;
  click_count?: number; view_count?: number; updated_at?: string;
};

const emptyForm = {
  name: "", sku: "", slug: "", categoryId: "", subCategoryId: "", shortDescription: "",
  imageUrls: "", highlights: "", description: "", pros: "", cons: "", specs: "",
  material: "", originCountry: "", warrantyMonths: "", editorScore: "",
  marketplace: "amazon", storeName: "", affiliateUrl: "", price: "", originalPrice: "", couponCode: "",
  couponNote: "", freeShipping: false, authentic: true, returnDays: "30", warrantyText: "",
  status: "draft", isFeatured: false, isDeal: true, metaTitle: "", metaDescription: "",
};

const splitLines = (value: string) => value.split("\n").map((item) => item.trim()).filter(Boolean);
const inputClass = "w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2.5 text-sm text-white outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/10";
const labelClass = "mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-400";
const statusLabel = (status: string) => status === "published" ? "Đang bán" : status === "draft" ? "Bản nháp" : "Đã lưu trữ";

function productNeedsAttention(product: AdminProduct) {
  return !product.images?.length || !product.offers?.length || (product.status === "published" && !product.offers?.[0]?.affiliate_url);
}

export default function ProductManager({ categories = [] }: { categories?: Category[] }) {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<AdminProduct | null>(null);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(emptyForm);
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const token = () => localStorage.getItem("token");
  const load = async () => {
    setLoading(true);
    const result = await cmsFetch<AdminProduct[]>("/api/v1/cms/products", { token: token() });
    if (result.ok) setProducts(result.data || []);
    else setNotice({ type: "error", text: result.message });
    setLoading(false);
  };

  useEffect(() => {
    let active = true;
    void cmsFetch<AdminProduct[]>("/api/v1/cms/products", { token: token() }).then((result) => {
      if (!active) return;
      if (result.ok) setProducts(result.data || []);
      else setNotice({ type: "error", text: result.message });
      setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const filtered = useMemo(() => {
    const result = products.filter((product) => {
      const matchesQuery = `${product.name} ${product.sku}`.toLowerCase().includes(query.toLowerCase());
      const matchesStatus = statusFilter === "all"
        || product.status === statusFilter
        || (statusFilter === "attention" && productNeedsAttention(product));
      return matchesQuery && matchesStatus;
    });
    return [...result].sort((a, b) => {
      if (sortBy === "clicks") return Number(b.click_count || 0) - Number(a.click_count || 0);
      if (sortBy === "views") return Number(b.view_count || 0) - Number(a.view_count || 0);
      if (sortBy === "discount") return Number(b.discount_percent || 0) - Number(a.discount_percent || 0);
      return new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime();
    });
  }, [products, query, statusFilter, sortBy]);

  const selectedCategory = categories.find((category) => category.id === form.categoryId);
  const update = (key: keyof typeof emptyForm, value: string | boolean) => setForm((current) => ({ ...current, [key]: value }));

  const openNew = () => { setEditing(null); setForm(emptyForm); setStep(0); setNotice(null); setEditorOpen(true); };
  const openEdit = (product: AdminProduct) => {
    const offer = product.offers?.[0] || {};
    setEditing(product);
    setForm({
      ...emptyForm,
      name: product.name || "", sku: product.sku || "", slug: product.slug || "",
      categoryId: typeof product.category_id === "object" ? product.category_id?._id || "" : product.category_id || "",
      subCategoryId: typeof product.sub_category_id === "object" ? product.sub_category_id?._id || "" : product.sub_category_id || "",
      shortDescription: product.short_description || "", description: product.description || "",
      imageUrls: (product.images || []).map((image) => image.url).join("\n"), highlights: (product.highlights || []).join("\n"),
      pros: (product.pros || []).join("\n"), cons: (product.cons || []).join("\n"),
      specs: (product.specs?.[0]?.items || []).map((item) => `${item.label}: ${item.value}`).join("\n"),
      material: product.material || "", originCountry: product.origin_country || "", warrantyMonths: product.warranty_months?.toString() || "",
      editorScore: product.editor_score?.toString() || "", marketplace: offer.marketplace || "amazon", storeName: offer.store_name || "",
      affiliateUrl: offer.affiliate_url || "", price: (offer.price ?? product.price ?? "").toString(), originalPrice: (offer.original_price ?? product.original_price ?? "").toString(),
      couponCode: offer.coupon_code || "", couponNote: offer.coupon_note || "", freeShipping: Boolean(offer.free_shipping || product.trust?.free_shipping),
      authentic: product.trust?.authentic !== false, returnDays: product.trust?.return_days?.toString() || "30", warrantyText: product.trust?.warranty_text || "",
      status: product.status || "draft", isFeatured: Boolean(product.is_featured), isDeal: product.is_deal !== false,
      metaTitle: product.meta_title || "", metaDescription: product.meta_description || "",
    });
    setStep(0); setNotice(null); setEditorOpen(true);
  };

  const handleUpload = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    const data = new FormData(); data.append("file", file);
    try {
      const response = await fetch("/api/v1/cms/upload", { method: "POST", headers: { Authorization: `Bearer ${token()}` }, body: data });
      const result = await response.json();
      if (!response.ok || result.status !== "success") throw new Error(result.message || "Tải ảnh lên thất bại");
      update("imageUrls", [form.imageUrls, result.data.url].filter(Boolean).join("\n"));
    } catch (error) {
      setNotice({ type: "error", text: error instanceof Error ? error.message : "Không thể tải ảnh lên" });
    } finally { setUploading(false); }
  };

  const createPayload = () => {
    const images = splitLines(form.imageUrls);
    const specs = splitLines(form.specs).flatMap((row) => {
      const split = row.indexOf(":");
      return split > 0 ? [{ label: row.slice(0, split).trim(), value: row.slice(split + 1).trim() }] : [];
    });
    const price = form.price === "" ? undefined : Number(form.price);
    const originalPrice = form.originalPrice === "" ? undefined : Number(form.originalPrice);
    return {
      name: form.name, sku: form.sku, ...(form.slug ? { slug: form.slug } : {}),
      category_id: form.categoryId || null, sub_category_id: form.subCategoryId || null,
      short_description: form.shortDescription, description: form.description,
      highlights: splitLines(form.highlights), pros: splitLines(form.pros), cons: splitLines(form.cons),
      images: images.map((url, index) => ({ url, alt: `${form.name} - ảnh ${index + 1}`, sort_order: index })),
      specs: specs.length ? [{ group: "Thông số chính", items: specs }] : [],
      material: form.material, origin_country: form.originCountry,
      warranty_months: form.warrantyMonths === "" ? undefined : Number(form.warrantyMonths),
      editor_score: form.editorScore === "" ? undefined : Number(form.editorScore), price, original_price: originalPrice,
      offers: form.affiliateUrl ? [{ ...(editing?.offers?.[0]?._id ? { _id: editing.offers[0]._id } : {}), marketplace: form.marketplace, store_name: form.storeName, affiliate_url: form.affiliateUrl, price, original_price: originalPrice, coupon_code: form.couponCode, coupon_note: form.couponNote, free_shipping: form.freeShipping, stock_status: "in_stock", is_primary: true, status: "active", sort_order: 0 }] : [],
      trust: { authentic: form.authentic, free_shipping: form.freeShipping, return_days: form.returnDays === "" ? undefined : Number(form.returnDays), warranty_text: form.warrantyText },
      status: form.status, is_featured: form.isFeatured, is_deal: form.isDeal,
      meta_title: form.metaTitle, meta_description: form.metaDescription,
    };
  };

  const save = async () => {
    if (!form.name.trim() || !form.sku.trim()) { setStep(0); setNotice({ type: "error", text: "Vui lòng nhập tên sản phẩm và mã SKU." }); return; }
    if (form.status === "published" && (!form.affiliateUrl || !form.price)) { setStep(2); setNotice({ type: "error", text: "Cần có giá bán và link affiliate trước khi xuất bản." }); return; }
    setSaving(true); setNotice(null);
    const result = await cmsFetch<AdminProduct>(editing ? `/api/v1/cms/products/${editing.id}` : "/api/v1/cms/products", { method: editing ? "PUT" : "POST", token: token(), body: createPayload() });
    if (result.ok) { setNotice({ type: "success", text: editing ? "Đã cập nhật sản phẩm." : "Đã tạo sản phẩm." }); setEditorOpen(false); await load(); }
    else setNotice({ type: "error", text: result.message });
    setSaving(false);
  };

  const changeStatus = async (product: AdminProduct, status: "draft" | "published") => {
    const result = await cmsFetch<AdminProduct>(`/api/v1/cms/products/${product.id}`, { method: "PUT", token: token(), body: { status } });
    if (result.ok) { setNotice({ type: "success", text: status === "published" ? "Sản phẩm đã được xuất bản." : "Đã chuyển sản phẩm về bản nháp." }); await load(); }
    else setNotice({ type: "error", text: result.message });
  };

  const remove = async (product: AdminProduct) => {
    if (!window.confirm(`Xóa “${product.name}”? Thao tác này không thể hoàn tác.`)) return;
    const result = await cmsFetch(`/api/v1/cms/products/${product.id}`, { method: "DELETE", token: token() });
    if (result.ok) { setNotice({ type: "success", text: "Đã xóa sản phẩm." }); await load(); }
    else setNotice({ type: "error", text: result.message });
  };

  const steps = ["Thông tin", "Hình ảnh", "Giá & liên kết", "Nội dung & xuất bản"];
  const previewImage = splitLines(form.imageUrls)[0];

  if (editorOpen) return (
    <div className="mx-auto max-w-6xl">
      <button onClick={() => setEditorOpen(false)} className="mb-5 flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white"><ArrowLeft size={15} /> Quay lại danh sách</button>
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div><p className="text-xs font-bold uppercase tracking-[.18em] text-emerald-400">Sản phẩm vật lý</p><h1 className="mt-1 text-3xl font-bold text-white">{editing ? "Chỉnh sửa sản phẩm" : "Đăng sản phẩm mới"}</h1><p className="mt-2 text-sm text-slate-400">Hoàn thành từng bước hoặc lưu bản nháp để tiếp tục sau.</p></div>
        <div className="flex flex-wrap gap-2">{steps.map((name, index) => <button key={name} onClick={() => setStep(index)} className={`rounded-full px-3 py-1.5 text-[10px] font-bold ${step === index ? "bg-emerald-400 text-slate-950" : "bg-slate-900 text-slate-500"}`}>{index + 1}. {name}</button>)}</div>
      </div>
      {notice && <Notice notice={notice} onClose={() => setNotice(null)} />}
      <div className="grid gap-6 xl:grid-cols-[1fr_310px]">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-2xl">
          {step === 0 && <div className="space-y-5">
            <Field label="Tên sản phẩm *"><input className={inputClass} value={form.name} onChange={(event) => update("name", event.target.value)} placeholder="Ví dụ: Pin sạc dự phòng Anker 737" /></Field>
            <div className="grid gap-4 md:grid-cols-2"><Field label="Mã SKU *"><input className={inputClass} value={form.sku} onChange={(event) => update("sku", event.target.value)} placeholder="ANK-737-BLK" /></Field><Field label="Đường dẫn thân thiện"><input className={inputClass} value={form.slug} onChange={(event) => update("slug", event.target.value)} placeholder="Để trống để tạo tự động" /></Field></div>
            <div className="grid gap-4 md:grid-cols-2"><Field label="Danh mục"><select className={inputClass} value={form.categoryId} onChange={(event) => { update("categoryId", event.target.value); update("subCategoryId", ""); }}><option value="">Chọn danh mục</option>{categories.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></Field><Field label="Danh mục con"><select className={inputClass} value={form.subCategoryId} onChange={(event) => update("subCategoryId", event.target.value)}><option value="">Không chọn</option>{selectedCategory?.subCategories?.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></Field></div>
            <Field label="Mô tả ngắn"><textarea rows={3} className={inputClass} value={form.shortDescription} onChange={(event) => update("shortDescription", event.target.value)} placeholder="Một câu rõ ràng: sản phẩm là gì và phù hợp với ai." /></Field>
            <Field label="Điểm nổi bật — mỗi dòng một ý"><textarea rows={4} className={inputClass} value={form.highlights} onChange={(event) => update("highlights", event.target.value)} placeholder={'Sạc nhanh USB-C 65W\nDung lượng 20.000mAh\nPhù hợp mang theo khi đi xa'} /></Field>
          </div>}

          {step === 1 && <div className="space-y-5">
            <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/40 p-8 text-center"><ImagePlus className="mx-auto mb-3 text-emerald-400" size={31} /><h3 className="text-sm font-bold text-white">Thêm hình ảnh sản phẩm</h3><p className="mx-auto mt-1 max-w-md text-xs text-slate-500">Hỗ trợ WEBP, JPG, PNG hoặc GIF tối đa 5MB. Ảnh đầu tiên sẽ là ảnh đại diện.</p><label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-lg bg-emerald-400 px-4 py-2 text-xs font-bold text-slate-950"><Upload size={15} /> {uploading ? "Đang tải lên..." : "Chọn ảnh từ máy"}<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" disabled={uploading} onChange={(event) => void handleUpload(event.target.files?.[0])} /></label></div>
            <Field label="Hoặc dán URL ảnh — mỗi dòng một URL"><textarea rows={8} className={`${inputClass} font-mono text-xs`} value={form.imageUrls} onChange={(event) => update("imageUrls", event.target.value)} placeholder="https://media.example.com/san-pham.webp" /></Field>
          </div>}

          {step === 2 && <div className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2"><Field label="Sàn / nhà bán lẻ"><select className={inputClass} value={form.marketplace} onChange={(event) => update("marketplace", event.target.value)}>{MARKETPLACE_KEYS.map((key) => <option key={key} value={key}>{getMarketplaceMeta(key).label}</option>)}</select></Field><Field label="Tên gian hàng"><input className={inputClass} value={form.storeName} onChange={(event) => update("storeName", event.target.value)} placeholder="Amazon hoặc gian hàng chính hãng" /></Field></div>
            <Field label="Link affiliate của sản phẩm *"><input type="url" className={inputClass} value={form.affiliateUrl} onChange={(event) => update("affiliateUrl", event.target.value)} placeholder="https://nhabanle.com/san-pham?ref=..." /><p className="mt-1.5 text-[10px] text-slate-500">Link gốc được giữ kín. Khách truy cập thông qua đường dẫn theo dõi an toàn.</p></Field>
            <div className="grid gap-4 md:grid-cols-2"><Field label="Giá đang bán (USD) *"><input type="number" min="0" step="0.01" className={inputClass} value={form.price} onChange={(event) => update("price", event.target.value)} placeholder="49.99" /></Field><Field label="Giá niêm yết"><input type="number" min="0" step="0.01" className={inputClass} value={form.originalPrice} onChange={(event) => update("originalPrice", event.target.value)} placeholder="69.99" /></Field></div>
            <div className="grid gap-4 md:grid-cols-2"><Field label="Mã giảm giá"><input className={inputClass} value={form.couponCode} onChange={(event) => update("couponCode", event.target.value)} placeholder="SAVE20" /></Field><Field label="Hướng dẫn dùng mã"><input className={inputClass} value={form.couponNote} onChange={(event) => update("couponNote", event.target.value)} placeholder="Nhập mã khi thanh toán" /></Field></div>
            <label className="flex items-center gap-3 rounded-xl border border-slate-800 p-3 text-sm text-slate-300"><input type="checkbox" checked={form.freeShipping} onChange={(event) => update("freeShipping", event.target.checked)} className="accent-emerald-400" /> Có miễn phí vận chuyển</label>
          </div>}

          {step === 3 && <div className="space-y-5">
            <Field label="Mô tả chi tiết"><textarea rows={6} className={inputClass} value={form.description} onChange={(event) => update("description", event.target.value)} placeholder="Giải thích sản phẩm bằng ngôn ngữ dễ hiểu, đối tượng phù hợp và điều cần lưu ý." /></Field>
            <div className="grid gap-4 md:grid-cols-2"><Field label="Ưu điểm — mỗi dòng một ý"><textarea rows={5} className={inputClass} value={form.pros} onChange={(event) => update("pros", event.target.value)} /></Field><Field label="Nhược điểm — mỗi dòng một ý"><textarea rows={5} className={inputClass} value={form.cons} onChange={(event) => update("cons", event.target.value)} /></Field></div>
            <Field label="Thông số — Tên: Giá trị, mỗi dòng một mục"><textarea rows={5} className={inputClass} value={form.specs} onChange={(event) => update("specs", event.target.value)} placeholder={'Dung lượng: 20.000mAh\nCông suất tối đa: 65W\nTrọng lượng: 420g'} /></Field>
            <div className="grid gap-4 md:grid-cols-3"><Field label="Chất liệu"><input className={inputClass} value={form.material} onChange={(event) => update("material", event.target.value)} /></Field><Field label="Xuất xứ"><input className={inputClass} value={form.originCountry} onChange={(event) => update("originCountry", event.target.value)} /></Field><Field label="Bảo hành (tháng)"><input type="number" className={inputClass} value={form.warrantyMonths} onChange={(event) => update("warrantyMonths", event.target.value)} /></Field></div>
            <div className="grid gap-4 md:grid-cols-2"><Field label="Điểm GoodPick (0–10)"><input type="number" min="0" max="10" step="0.1" className={inputClass} value={form.editorScore} onChange={(event) => update("editorScore", event.target.value)} /></Field><Field label="Thời hạn đổi trả (ngày)"><input type="number" min="0" className={inputClass} value={form.returnDays} onChange={(event) => update("returnDays", event.target.value)} /></Field></div>
            <Field label="Tiêu đề SEO"><input className={inputClass} value={form.metaTitle} onChange={(event) => update("metaTitle", event.target.value)} placeholder={form.name ? `${form.name} — Giá, ưu đãi và đánh giá` : ""} /></Field>
            <Field label="Mô tả SEO"><textarea rows={3} className={inputClass} value={form.metaDescription} onChange={(event) => update("metaDescription", event.target.value)} /></Field>
            <div className="grid gap-4 md:grid-cols-3"><label className="flex items-center gap-2 text-xs text-slate-300"><input type="checkbox" className="accent-emerald-400" checked={form.authentic} onChange={(event) => update("authentic", event.target.checked)} /> Đã kiểm tra độ tin cậy</label><label className="flex items-center gap-2 text-xs text-slate-300"><input type="checkbox" className="accent-emerald-400" checked={form.isDeal} onChange={(event) => update("isDeal", event.target.checked)} /> Hiển thị là ưu đãi</label><label className="flex items-center gap-2 text-xs text-slate-300"><input type="checkbox" className="accent-emerald-400" checked={form.isFeatured} onChange={(event) => update("isFeatured", event.target.checked)} /> Nổi bật trên trang chủ</label></div>
            <Field label="Trạng thái xuất bản"><select className={inputClass} value={form.status} onChange={(event) => update("status", event.target.value)}><option value="draft">Bản nháp — chỉ người quản trị nhìn thấy</option><option value="published">Đang bán — hiển thị trên website</option><option value="archived">Lưu trữ — tạm ẩn khỏi website</option></select></Field>
          </div>}

          <div className="mt-8 flex items-center justify-between border-t border-slate-800 pt-5"><button disabled={step === 0} onClick={() => setStep((value) => value - 1)} className="flex items-center gap-2 text-xs font-bold text-slate-400 disabled:opacity-30"><ArrowLeft size={15} /> Quay lại</button>{step < 3 ? <button onClick={() => setStep((value) => value + 1)} className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-xs font-bold text-slate-950">Tiếp tục <ArrowRight size={15} /></button> : <button disabled={saving} onClick={() => void save()} className="flex items-center gap-2 rounded-lg bg-emerald-400 px-5 py-2.5 text-xs font-bold text-slate-950 disabled:opacity-50"><Check size={16} /> {saving ? "Đang lưu..." : editing ? "Lưu thay đổi" : "Tạo sản phẩm"}</button>}</div>
        </div>

        <aside className="self-start rounded-2xl border border-slate-800 bg-slate-900/60 p-4 xl:sticky xl:top-4"><p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Xem trước thẻ sản phẩm</p><div className="overflow-hidden rounded-xl border border-slate-700 bg-white text-slate-900"><div className="flex h-48 items-center justify-center bg-slate-100">{previewImage ? <img src={previewImage} alt="" className="h-full w-full object-cover" /> : <Package size={42} className="text-slate-300" />}</div><div className="p-4"><span className="text-[9px] font-bold uppercase tracking-wider text-emerald-700">{selectedCategory?.name || "Danh mục"}</span><h3 className="mt-1 text-base font-bold">{form.name || "Tên sản phẩm"}</h3><p className="mt-2 line-clamp-2 text-[11px] text-slate-500">{form.shortDescription || "Mô tả ngắn của sản phẩm sẽ xuất hiện tại đây."}</p><div className="mt-4 border-t pt-3 text-xl font-bold">{form.price ? `$${Number(form.price).toFixed(2)}` : "$0.00"}</div></div></div></aside>
      </div>
    </div>
  );

  const liveCount = products.filter((product) => product.status === "published").length;
  const attentionCount = products.filter(productNeedsAttention).length;

  return (
    <div>
      <div className="mb-7 flex flex-col gap-4 md:flex-row md:items-end md:justify-between"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-emerald-400">Danh mục bán hàng</p><h1 className="mt-1 text-3xl font-bold text-white">Sản phẩm & ưu đãi</h1><p className="mt-2 text-sm text-slate-400">Quản lý giá, coupon, hình ảnh, hiệu suất và link affiliate tại một nơi.</p></div><button onClick={openNew} className="flex items-center justify-center gap-2 rounded-xl bg-emerald-400 px-5 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-500/10"><Plus size={18} /> Đăng sản phẩm</button></div>
      {notice && <Notice notice={notice} onClose={() => setNotice(null)} />}

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4"><span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Tổng sản phẩm</span><strong className="mt-1 block text-2xl text-white">{products.length}</strong></div>
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[.05] p-4"><span className="text-[9px] font-bold uppercase tracking-wider text-emerald-500/70">Đang bán</span><strong className="mt-1 block text-2xl text-emerald-400">{liveCount}</strong></div>
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/[.05] p-4"><span className="text-[9px] font-bold uppercase tracking-wider text-amber-400/70">Cần xử lý</span><strong className="mt-1 block text-2xl text-amber-300">{attentionCount}</strong></div>
      </div>

      <div className="mb-5 grid gap-3 lg:grid-cols-[1fr_auto_auto]">
        <div className="relative"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" /><input value={query} onChange={(event) => setQuery(event.target.value)} className={`${inputClass} pl-10`} placeholder="Tìm theo tên sản phẩm hoặc SKU..." /></div>
        <div className="relative"><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className={`${inputClass} min-w-44 appearance-none pr-9`}><option value="all">Tất cả trạng thái</option><option value="published">Đang bán</option><option value="draft">Bản nháp</option><option value="archived">Đã lưu trữ</option><option value="attention">Cần xử lý</option></select><ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" /></div>
        <div className="relative"><select value={sortBy} onChange={(event) => setSortBy(event.target.value)} className={`${inputClass} min-w-44 appearance-none pr-9`}><option value="newest">Mới cập nhật</option><option value="clicks">Nhiều lượt nhấp</option><option value="views">Nhiều lượt xem</option><option value="discount">Giảm giá cao</option></select><ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" /></div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60">
        {loading ? <div className="p-12 text-center text-sm text-slate-500">Đang tải danh sách sản phẩm...</div> : filtered.length === 0 ? <div className="p-14 text-center"><Box size={35} className="mx-auto mb-3 text-slate-600" /><h3 className="font-bold text-white">{products.length ? "Không tìm thấy sản phẩm phù hợp" : "Danh mục đang trống"}</h3><p className="mt-1 text-xs text-slate-500">{products.length ? "Hãy đổi từ khóa hoặc bộ lọc." : "Đăng sản phẩm đầu tiên để thay thế dữ liệu minh họa trên trang chủ."}</p>{!products.length && <button onClick={openNew} className="mt-4 rounded-lg bg-emerald-400 px-4 py-2 text-xs font-bold text-slate-950">Đăng sản phẩm đầu tiên</button>}</div> : (
          <div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead className="border-b border-slate-800 bg-slate-950/50 text-[10px] uppercase tracking-wider text-slate-500"><tr><th className="p-4">Sản phẩm</th><th className="p-4">Giá & ưu đãi</th><th className="p-4">Hiệu suất</th><th className="p-4">Trạng thái</th><th className="p-4 text-right">Thao tác</th></tr></thead><tbody>{filtered.map((product) => {
            const ctr = product.view_count ? ((Number(product.click_count || 0) / product.view_count) * 100).toFixed(1) : "0";
            const attention = productNeedsAttention(product);
            return <tr className="border-b border-slate-800/70 last:border-0 hover:bg-white/[.02]" key={product.id}>
              <td className="p-4"><div className="flex items-center gap-3"><div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-800">{product.images?.[0]?.url ? <img src={product.images[0].url} alt="" className="h-full w-full object-cover" /> : <Package size={20} className="text-slate-600" />}</div><div className="min-w-0"><div className="flex items-center gap-2"><strong className="block max-w-xs truncate text-sm text-white">{product.name}</strong>{attention && <AlertTriangle size={13} className="shrink-0 text-amber-300" />}</div><span className="text-[10px] text-slate-500">SKU {product.sku}</span></div></div></td>
              <td className="p-4"><strong className="block font-mono text-sm text-white">${Number(product.price_min || product.price || 0).toFixed(2)}</strong><div className="mt-1 flex items-center gap-2"><span className="text-[10px] text-slate-500">{product.offers?.[0]?.store_name || getMarketplaceMeta(product.offers?.[0]?.marketplace).label}</span>{Number(product.discount_percent || 0) > 0 && <span className="rounded bg-rose-400/10 px-1.5 py-0.5 text-[9px] font-bold text-rose-300">-{product.discount_percent}%</span>}</div></td>
              <td className="p-4"><div className="flex gap-4"><span className="flex items-center gap-1 text-slate-400"><Eye size={13} /> {Number(product.view_count || 0).toLocaleString("vi-VN")}</span><span className="flex items-center gap-1 font-bold text-emerald-400"><MousePointerClick size={13} /> {Number(product.click_count || 0).toLocaleString("vi-VN")}</span></div><span className="mt-1 block text-[9px] text-slate-500">CTR {ctr}%</span></td>
              <td className="p-4"><button onClick={() => void changeStatus(product, product.status === "published" ? "draft" : "published")} className={`rounded-full px-2.5 py-1 text-[9px] font-bold uppercase ${product.status === "published" ? "bg-emerald-400/10 text-emerald-400" : product.status === "draft" ? "bg-amber-400/10 text-amber-300" : "bg-slate-700 text-slate-400"}`} title={product.status === "published" ? "Nhấn để chuyển về bản nháp" : "Nhấn để xuất bản"}>{statusLabel(product.status)}</button></td>
              <td className="p-4"><div className="flex justify-end gap-2">{product.status === "published" && <Link href={`/products/${product.slug}`} target="_blank" title="Xem ngoài website" className="rounded-lg border border-slate-700 p-2 text-slate-400 hover:text-white"><ExternalLink size={15} /></Link>}<button title="Chỉnh sửa" onClick={() => openEdit(product)} className="rounded-lg border border-slate-700 p-2 text-slate-400 hover:border-emerald-500 hover:text-emerald-400"><Pencil size={15} /></button><button title="Xóa sản phẩm" onClick={() => void remove(product)} className="rounded-lg border border-slate-700 p-2 text-slate-400 hover:border-rose-500 hover:text-rose-400"><Trash2 size={15} /></button></div></td>
            </tr>;
          })}</tbody></table></div>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className={labelClass}>{label}</label>{children}</div>;
}

function Notice({ notice, onClose }: { notice: { type: "success" | "error"; text: string }; onClose: () => void }) {
  return <div className={`mb-5 flex items-center justify-between rounded-xl border p-3 text-xs ${notice.type === "error" ? "border-rose-500/40 bg-rose-500/10 text-rose-300" : "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"}`}><span>{notice.text}</span><button type="button" onClick={onClose} aria-label="Đóng thông báo"><X size={14} /></button></div>;
}
