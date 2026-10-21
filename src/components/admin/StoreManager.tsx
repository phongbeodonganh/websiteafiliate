"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Archive, ExternalLink, Plus, Save, Search, Store, Trash2 } from "lucide-react";
import RichTextEditor from "./RichTextEditor";
import { cmsFetch } from "@/lib/cms-fetch";

import { isOfferActive, type StoreRecord, type StoreOffer } from "@/lib/stores/types";

const input = "w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/10";
const button = "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 px-4 py-2.5 text-xs font-bold text-slate-200 transition hover:bg-white/5 disabled:opacity-40";
const panel = "rounded-2xl border border-slate-800 bg-slate-900/65 p-5 md:p-6";
const blankStore = (): StoreRecord => ({ id: "", slug: "", name: "", description: "", categorySlug: "", destination: "", imageUrl: "", imageAlt: "", content: "", faqs: [], offers: [], status: "draft", showOnHomepage: true, sortOrder: 0 });
const blankOffer = (): StoreOffer => ({ id: crypto.randomUUID(), kind: "code", title: "", description: "", saving: "", code: "", destination: "", terms: "", startsAt: "", expiresAt: "", checkedAt: "", active: true });
const statusLabel = (status: string) => status === "published" ? "Đã xuất bản" : status === "draft" ? "Bản nháp" : "Đã lưu trữ";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-400">{label}</span>{children}</label>;
}

export default function StoreManager({ categories = [] }: { categories?: { slug: string; name: string }[] }) {
  const [stores, setStores] = useState<StoreRecord[]>([]);
  const [form, setForm] = useState<StoreRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortBy, setSortBy] = useState("order");
  const [activityFilter, setActivityFilter] = useState("all");
  const visibleStores = stores.filter((store) =>
    `${store.name} ${store.slug}`.toLowerCase().includes(query.toLowerCase())
    && (statusFilter === "all" || store.status === statusFilter)
    && (categoryFilter === "all" || (categoryFilter === "uncategorized" ? !store.categorySlug : store.categorySlug === categoryFilter))
    && (activityFilter === "all" || (activityFilter === "views" ? (store.viewCount || 0) > 0 : (store.clickCount || 0) > 0))
  ).sort((a, b) => sortBy === "views" ? (b.viewCount || 0) - (a.viewCount || 0)
    : sortBy === "clicks" ? (b.clickCount || 0) - (a.clickCount || 0)
    : sortBy === "name" ? a.name.localeCompare(b.name) : a.sortOrder - b.sortOrder);
  const categoryOptions = [...categories, ...Array.from(new Set(stores.map((store) => store.categorySlug).filter(Boolean)))
    .filter((slug) => !categories.some((category) => category.slug === slug)).map((slug) => ({ slug, name: `${slug} (danh mục cũ)` }))];
  const [notice, setNotice] = useState<{ error: boolean; text: string } | null>(null);

  async function load() {
    setLoading(true);
    const result = await cmsFetch<StoreRecord[]>("/api/v1/cms/stores", { token: localStorage.getItem("token") });
    if (result.ok) setStores(result.data); else setNotice({ error: true, text: result.message });
    setLoading(false);
  }
  useEffect(() => {
    let cancelled = false;
    cmsFetch<StoreRecord[]>("/api/v1/cms/stores", { token: localStorage.getItem("token") }).then((result) => {
      if (cancelled) return;
      if (result.ok) setStores(result.data); else setNotice({ error: true, text: result.message });
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);
  function patch(data: Partial<StoreRecord>) { setForm((current) => current ? { ...current, ...data } : null); }
  function patchOffer(index: number, data: Partial<StoreOffer>) {
    setForm((current) => current ? { ...current, offers: current.offers.map((offer, i) => i === index ? { ...offer, ...data } : offer) } : null);
  }
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!form || busy || uploading) return;
    setBusy(true); setNotice(null);
    const result = await cmsFetch<StoreRecord>(form.id ? `/api/v1/cms/stores/${form.id}` : "/api/v1/cms/stores", {
      method: form.id ? "PUT" : "POST", token: localStorage.getItem("token"), body: form,
    });
    if (result.ok) {
      setForm(null);
      await load();
      setNotice({ error: false, text: "Đã lưu store. Nội dung đã xuất bản được cập nhật trên website." });
    } else setNotice({ error: true, text: result.message });
    setBusy(false);
  }
  async function changeVisibility(store: StoreRecord, action: "archive" | "delete") {
    if (busy) return;
    const deleting = action === "delete";
    if (!window.confirm(deleting ? `Xoá ${store.name}? Store sẽ bị gỡ khỏi website và danh sách quản trị. Dùng Lưu trữ nếu bạn muốn khôi phục sau.` : `Lưu trữ ${store.name}? Store và ưu đãi sẽ ẩn khỏi website; bạn có thể xuất bản lại sau.`)) return;
    setBusy(true); setNotice(null);
    const id = store.id || `legacy-${store.slug}`;
    const result = await cmsFetch(`/api/v1/cms/stores/${encodeURIComponent(id)}${deleting ? "?action=delete" : ""}`, {
      method: "DELETE", token: localStorage.getItem("token"),
    });
    if (result.ok) { setForm(null); await load(); setNotice({ error: false, text: deleting ? "Đã xoá store khỏi website và danh sách quản trị." : "Đã lưu trữ store. Chọn bộ lọc Đã lưu trữ để chỉnh sửa và xuất bản lại." }); }
    else setNotice({ error: true, text: result.message });
    setBusy(false);
  }
  async function upload(file: File) {
    setUploading(true);
    const body = new FormData(); body.append("file", file);
    const result = await cmsFetch<{ url: string }>("/api/v1/cms/upload", { method: "POST", token: localStorage.getItem("token"), body });
    if (result.ok) patch({ imageUrl: result.data.url }); else setNotice({ error: true, text: result.message });
    setUploading(false);
  }
  function close() {
    if (window.confirm("Đóng trình chỉnh sửa? Các thay đổi chưa lưu sẽ bị bỏ.")) { setForm(null); setNotice(null); }
  }
  return <div className="space-y-6">
    {notice && <p role={notice.error ? "alert" : "status"} className={`rounded-xl border p-4 text-sm ${notice.error ? "border-rose-400/30 bg-rose-400/10 text-rose-200" : "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"}`}>{notice.text}</p>}
    {!form ? <>
      <div className="flex flex-wrap items-center justify-between gap-4"><div><h1 className="flex items-center gap-2 text-2xl font-black text-white"><Store size={25} /> Store & coupon</h1><p className="mt-2 text-sm text-slate-400">Quản lý ảnh homepage, bài giới thiệu, Q&A và mã ưu đãi của từng store.</p></div><button type="button" className={`${button} bg-emerald-400 !text-slate-950 hover:bg-emerald-300`} onClick={() => { setForm(blankStore()); setNotice(null); }}><Plus size={16} /> Thêm store</button></div>
      <div className="flex items-center gap-3"><Search size={18} className="text-slate-500" /><input className={input} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm store theo tên hoặc đường dẫn" aria-label="Tìm store" /></div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Field label="Trạng thái"><select className={input} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="all">Tất cả trạng thái</option><option value="published">Đã xuất bản</option><option value="draft">Bản nháp</option><option value="archived">Đã lưu trữ</option></select></Field>
        <Field label="Danh mục"><select className={input} value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}><option value="all">Tất cả danh mục</option><option value="uncategorized">Chưa phân loại</option>{categoryOptions.map((category) => <option key={category.slug} value={category.slug}>{category.name}</option>)}</select></Field>
        <Field label="Sắp xếp"><select className={input} value={sortBy} onChange={(event) => setSortBy(event.target.value)}><option value="order">Thứ tự hiển thị</option><option value="views">Nhiều lượt xem chi tiết nhất</option><option value="clicks">Nhiều lượt bấm affiliate nhất</option><option value="name">Tên A–Z</option></select></Field>
        <Field label="Hoạt động"><select className={input} value={activityFilter} onChange={(event) => setActivityFilter(event.target.value)}><option value="all">Tất cả store</option><option value="views">Có lượt xem chi tiết</option><option value="clicks">Có lượt bấm affiliate</option></select></Field>
      </div>
      <p className="text-xs text-slate-400">{visibleStores.length}/{stores.length} store · Thống kê bắt đầu từ khi tính năng được bật; lượt lặp cùng IP trong 1 phút được gộp.</p>
      {loading ? <p className="text-slate-400">Đang tải store...</p> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{visibleStores.map((store) => <article key={store.slug} className={`${panel} text-left transition hover:border-emerald-400/40`}>
        <div className="mb-4 flex items-center gap-3">{store.imageUrl ? <img src={store.imageUrl} alt="" className="h-14 w-20 rounded-lg object-cover" /> : <Store className="text-emerald-400" size={30} />}<div><strong className="block text-lg text-white">{store.name}</strong><span className="text-xs text-slate-500">/store/{store.slug}</span></div></div>
        <p className="text-xs text-slate-400">{statusLabel(store.status)} · {store.offers.filter((offer) => isOfferActive(offer)).length} ưu đãi đang hoạt động</p>
        <p className="mt-2 text-[11px] text-emerald-300">{!store.id ? "Store có sẵn · chỉnh sửa để quản lý nội dung" : store.showOnHomepage ? "Hiển thị trên homepage khi xuất bản" : "Chỉ hiển thị trong danh sách store"}</p>
        <p className="mt-3 text-xs text-slate-300">{store.viewCount || 0} lượt xem chi tiết · {store.clickCount || 0} lượt bấm affiliate</p>
        <p className="mt-2 text-xs text-slate-400">{categoryOptions.find((category) => category.slug === store.categorySlug)?.name || "Chưa phân loại"}</p>
        <div className="mt-4 flex flex-wrap gap-2"><button type="button" className={button} disabled={busy} onClick={() => { setForm(structuredClone(store)); setNotice(null); }}>Chỉnh sửa</button>{store.status !== "archived" && <button type="button" className={button} disabled={busy} onClick={() => void changeVisibility(store, "archive")}><Archive size={14} /> Lưu trữ</button>}<button type="button" className={`${button} !text-rose-300`} disabled={busy} onClick={() => void changeVisibility(store, "delete")}><Trash2 size={14} /> Xoá</button></div>
      </article>)}</div>}
      {!loading && !visibleStores.length && <p className={panel}>Không tìm thấy store. Thêm store mới hoặc đổi từ khóa tìm kiếm.</p>}
    </> : <form onSubmit={save} className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3"><button className={button} type="button" onClick={close} disabled={busy || uploading}><ArrowLeft size={16} /> Danh sách store</button><div className="flex flex-wrap gap-2">{form.status === "published" && (form.id || stores.some((store) => store.slug === form.slug)) && <Link href={`/store/${form.slug}`} target="_blank" className={button}>Xem trang đã xuất bản <ExternalLink size={14} /></Link>}<button className={`${button} bg-emerald-400 !text-slate-950`} type="submit" disabled={busy || uploading}><Save size={16} /> {busy ? "Đang lưu..." : "Lưu store"}</button></div></div>
      <fieldset disabled={busy || uploading} className="space-y-6 disabled:opacity-70">
        <section className={panel}><h2 className="mb-5 text-lg font-bold text-white">Thông tin store</h2><div className="grid gap-4 md:grid-cols-2">
          <Field label="Tên store *"><input className={input} value={form.name} required maxLength={120} onChange={(event) => patch({ name: event.target.value })} /></Field>
          <Field label="Đường dẫn (tự tạo từ tên nếu để trống)"><input className={input} value={form.slug} readOnly={!!form.id || stores.some((store) => !store.id && store.slug === form.slug)} maxLength={120} onChange={(event) => patch({ slug: event.target.value })} /><small className="text-slate-500">Đường dẫn cố định sau khi lưu để giữ liên kết.</small></Field>
          <Field label="Website / link affiliate *"><input className={input} value={form.destination} type="url" required onChange={(event) => patch({ destination: event.target.value })} /></Field>
          <Field label="Danh mục"><select className={input} value={form.categorySlug} onChange={(event) => patch({ categorySlug: event.target.value })}><option value="">Không phân loại</option>{categoryOptions.map((category) => <option key={category.slug} value={category.slug}>{category.name}</option>)}</select></Field>
          <div className="md:col-span-2"><Field label="Mô tả ngắn"><textarea className={input} rows={3} maxLength={2000} value={form.description} onChange={(event) => patch({ description: event.target.value })} /></Field></div>
          <Field label="Trạng thái"><select className={input} value={form.status} onChange={(event) => patch({ status: event.target.value as StoreRecord["status"] })}><option value="draft">Bản nháp</option><option value="published">Xuất bản</option><option value="archived">Lưu trữ</option></select></Field>
          <Field label="Thứ tự hiển thị (số nhỏ trước)"><input className={input} type="number" min={-100000} max={100000} value={form.sortOrder} onChange={(event) => patch({ sortOrder: Number(event.target.value) })} /></Field>
          <label className="flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" checked={form.showOnHomepage} onChange={(event) => patch({ showOnHomepage: event.target.checked })} /> Hiển thị store trên homepage khi xuất bản</label>
        </div></section>
        <section className={panel}><h2 className="mb-5 text-lg font-bold text-white">Ảnh store trên homepage</h2><div className="grid gap-4 md:grid-cols-2"><Field label="Tải ảnh (JPG, PNG, WebP, GIF · tối đa 5 MB)"><input className={input} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file); event.target.value = ""; }} /></Field><Field label="Hoặc URL ảnh"><input className={input} type="url" value={form.imageUrl} onChange={(event) => patch({ imageUrl: event.target.value })} /></Field><Field label="Mô tả ảnh"><input className={input} maxLength={300} value={form.imageAlt} onChange={(event) => patch({ imageAlt: event.target.value })} /></Field></div>{form.imageUrl && <div className="mt-4 flex items-start gap-3"><img src={form.imageUrl} alt={form.imageAlt || form.name} className="aspect-video w-64 rounded-xl object-cover" /><button className={button} type="button" onClick={() => patch({ imageUrl: "", imageAlt: "" })}><Trash2 size={14} /> Bỏ ảnh</button></div>}</section>
        <section className={panel}><h2 className="mb-2 text-lg font-bold text-white">Bài giới thiệu & ảnh quảng cáo</h2><p className="mb-5 text-xs leading-6 text-slate-400">Dùng nút ảnh trong trình soạn thảo để tải ảnh quảng cáo vào bài viết. Có thể kéo thả ảnh và đặt nội dung ở vị trí mong muốn. Dùng Chèn Affiliate để thêm URL hoặc nút mua hàng ngay cả trước khi lưu store.</p><RichTextEditor value={form.content} onChange={(content) => patch({ content })} affiliateLinks={[]} allowDirectLinks /></section>
        <section className={panel}><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-bold text-white">Q&A về store</h2><button type="button" className={button} onClick={() => patch({ faqs: [...form.faqs, { question: "", answer: "" }] })} disabled={form.faqs.length >= 50}><Plus size={14} /> Thêm câu hỏi</button></div><div className="space-y-4">{form.faqs.map((faq, index) => <div className="grid gap-3 rounded-xl border border-slate-800 p-4" key={index}><Field label={`Câu hỏi ${index + 1}`}><input className={input} required maxLength={300} value={faq.question} onChange={(event) => patch({ faqs: form.faqs.map((row, i) => i === index ? { ...row, question: event.target.value } : row) })} /></Field><Field label="Câu trả lời"><textarea className={input} required maxLength={5000} rows={3} value={faq.answer} onChange={(event) => patch({ faqs: form.faqs.map((row, i) => i === index ? { ...row, answer: event.target.value } : row) })} /></Field><button type="button" className={`${button} justify-self-start`} onClick={() => patch({ faqs: form.faqs.filter((_, i) => i !== index) })}><Trash2 size={14} /> Xóa câu hỏi</button></div>)}</div>{!form.faqs.length && <p className="text-sm text-slate-500">Chưa có Q&A. Thêm câu hỏi về thanh toán, giao hàng hoặc cách áp dụng mã.</p>}</section>
        <section className={panel}><div className="mb-3 flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-bold text-white">Coupon & promo code</h2><button type="button" className={button} disabled={form.offers.length >= 100} onClick={() => patch({ offers: [...form.offers, blankOffer()] })}><Plus size={14} /> Thêm ưu đãi</button></div><p className="mb-5 text-xs leading-6 text-slate-400">Coupon không cần mã; promo code yêu cầu mã. Ngày bắt đầu tính từ 00:00, ngày hết hạn tính hết ngày theo UTC. Để trống ngày nếu không giới hạn.</p><div className="space-y-5">{form.offers.map((offer, index) => <div key={offer.id} className="rounded-xl border border-slate-700 bg-slate-950/30 p-4"><div className="mb-4 flex items-center justify-between"><strong className="text-sm text-white">Ưu đãi {index + 1}</strong><button className={button} type="button" onClick={() => patch({ offers: form.offers.filter((_, i) => i !== index) })}><Trash2 size={14} /> Xóa ưu đãi</button></div><div className="grid gap-4 md:grid-cols-2">
          <Field label="Loại ưu đãi"><select className={input} value={offer.kind} onChange={(event) => patchOffer(index, { kind: event.target.value as StoreOffer["kind"], code: "" })}><option value="code">Promo code (cần mã)</option><option value="coupon">Coupon / deal (không cần mã)</option></select></Field>
          <Field label="Tiêu đề *"><input className={input} required maxLength={200} value={offer.title} onChange={(event) => patchOffer(index, { title: event.target.value })} /></Field>
          <Field label="Mức ưu đãi (ví dụ 20% off)"><input className={input} maxLength={100} value={offer.saving} onChange={(event) => patchOffer(index, { saving: event.target.value })} /></Field>
          {offer.kind === "code" && <Field label="Mã giảm giá *"><input className={`${input} font-mono`} required maxLength={100} value={offer.code} onChange={(event) => patchOffer(index, { code: event.target.value })} /></Field>}
          <Field label="Link ưu đãi (trống = link store)"><input className={input} type="url" value={offer.destination} onChange={(event) => patchOffer(index, { destination: event.target.value })} /></Field>
          <Field label="Mô tả"><textarea className={input} rows={2} maxLength={2000} value={offer.description} onChange={(event) => patchOffer(index, { description: event.target.value })} /></Field>
          <Field label="Điều kiện & ngoại lệ"><textarea className={input} rows={2} maxLength={4000} value={offer.terms} onChange={(event) => patchOffer(index, { terms: event.target.value })} /></Field>
          {([['startsAt', 'Ngày bắt đầu'], ['expiresAt', 'Ngày hết hạn'], ['checkedAt', 'Ngày kiểm tra thực tế']] as const).map(([key, label]) => <Field key={key} label={label}><input className={input} type="date" value={offer[key].slice(0, 10)} onChange={(event) => patchOffer(index, { [key]: event.target.value ? `${event.target.value}T${key === 'expiresAt' ? '23:59:59.999' : '00:00:00.000'}Z` : "" })} /></Field>)}
          <label className="flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" checked={offer.active} onChange={(event) => patchOffer(index, { active: event.target.checked })} /> Bật ưu đãi (tự ẩn trước ngày bắt đầu / sau hết hạn)</label>
        </div></div>)}</div>{!form.offers.length && <p className="text-sm text-slate-500">Chưa có ưu đãi. Thêm coupon hoặc promo code đầu tiên.</p>}</section>
      </fieldset>
      <div className="flex flex-wrap justify-between gap-3">{(form.id || stores.some((store) => store.slug === form.slug)) && form.status !== "archived" ? <button type="button" className={`${button} text-rose-300`} disabled={busy || uploading} onClick={() => void changeVisibility(form, "archive")}><Archive size={15} /> Lưu trữ store</button> : <span />}{(form.id || stores.some((store) => store.slug === form.slug)) && <button type="button" className={`${button} !text-rose-300`} disabled={busy || uploading} onClick={() => void changeVisibility(form, "delete")}><Trash2 size={15} /> Xoá store</button>}<button className={`${button} bg-emerald-400 !text-slate-950`} type="submit" disabled={busy || uploading}><Save size={16} /> {uploading ? "Đang tải ảnh..." : busy ? "Đang lưu..." : "Lưu store"}</button></div>
    </form>}
  </div>;
}
