"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  Boxes,
  CheckCircle2,
  ChevronRight,
  CircleGauge,
  ClipboardCheck,
  Eye,
  FileText,
  MousePointerClick,
  PackagePlus,
  Percent,
  RefreshCw,
  ShoppingBag,
  Sparkles,
  Store,
  Target,
} from "lucide-react";
import { getMarketplaceMeta } from "@/lib/marketplaces";

type HotProduct = {
  id: string;
  name: string;
  slug: string;
  sku: string;
  status: string;
  image: string;
  categoryName: string;
  price: number;
  originalPrice: number;
  discountPercent: number;
  views: number;
  clicks: number;
  ctr: number;
  offers: number;
  marketplace: string;
  issues: string[];
};

type DashboardData = {
  totalViews?: number;
  totalClicks?: number;
  topArticles?: { id: string; title: string; viewCount: number; clicks: number }[];
  products?: {
    total: number;
    published: number;
    drafts: number;
    archived: number;
    totalViews: number;
    totalClicks: number;
    ctr: number;
    averageDiscount: number;
    healthy: number;
    needAttention: number;
    topProducts: HotProduct[];
    productsNeedingAttention: HotProduct[];
    marketplaceBreakdown: { marketplace: string; clicks: number }[];
  };
};

const money = (value: number) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "USD" }).format(value || 0);
const number = (value: number) => new Intl.NumberFormat("vi-VN").format(value || 0);

function MetricCard({ label, value, note, icon: Icon, tone = "emerald" }: { label: string; value: string; note: string; icon: typeof Eye; tone?: "emerald" | "amber" | "cyan" | "violet" }) {
  const tones = {
    emerald: "border-emerald-500/20 bg-emerald-500/[.06] text-emerald-400",
    amber: "border-amber-500/20 bg-amber-500/[.06] text-amber-300",
    cyan: "border-cyan-500/20 bg-cyan-500/[.06] text-cyan-300",
    violet: "border-violet-500/20 bg-violet-500/[.06] text-violet-300",
  };
  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/75 p-5">
      <div className={`mb-5 flex h-10 w-10 items-center justify-center rounded-xl border ${tones[tone]}`}><Icon size={19} /></div>
      <p className="text-[10px] font-bold uppercase tracking-[.14em] text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-black tracking-tight text-white">{value}</p>
      <p className="mt-2 text-[11px] text-slate-500">{note}</p>
    </div>
  );
}

export default function AffiliateDashboard({ data, userName, onNavigate }: { data: DashboardData | null; userName: string; onNavigate: (tab: string) => void }) {
  const products = data?.products;
  const topProducts = products?.topProducts || [];
  const attention = products?.productsNeedingAttention || [];
  const marketplaces = products?.marketplaceBreakdown || [];
  const maxMarketplaceClicks = Math.max(...marketplaces.map((item) => item.clicks), 1);
  const activeProductCount = (products?.published || 0) + (products?.drafts || 0);
  const healthPercent = activeProductCount ? Math.round(((products?.healthy || 0) / activeProductCount) * 100) : 100;

  return (
    <div className="space-y-7 animate-in fade-in duration-500">
      <section className="relative overflow-hidden rounded-[28px] border border-emerald-500/20 bg-[linear-gradient(125deg,#0d2823_0%,#0c1717_52%,#111827_100%)] p-6 md:p-8">
        <div className="absolute -right-20 -top-28 h-72 w-72 rounded-full border-[55px] border-emerald-400/[.06]" />
        <div className="relative z-10 grid gap-8 xl:grid-cols-[1fr_380px] xl:items-center">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.16em] text-emerald-300"><Sparkles size={13} /> Bàn điều hành affiliate</div>
            <h1 className="max-w-2xl text-3xl font-black leading-tight text-white md:text-4xl">Chào {userName}, hôm nay danh mục của bạn đang hoạt động thế nào?</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">Theo dõi sản phẩm kéo nhiều lượt nhấp, phát hiện link hoặc giá cần cập nhật và xử lý các việc ảnh hưởng trực tiếp đến doanh thu.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button onClick={() => onNavigate("products")} className="inline-flex items-center gap-2 rounded-xl bg-emerald-400 px-4 py-2.5 text-xs font-black text-slate-950 transition hover:bg-emerald-300"><PackagePlus size={16} /> Đăng sản phẩm mới</button>
              <Link href="/" target="_blank" className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/[.05] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-white/10">Xem trang bán hàng <ArrowUpRight size={15} /></Link>
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/20 p-5 backdrop-blur-sm">
            <div className="flex items-center justify-between"><div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Sức khỏe danh mục</p><p className="mt-1 text-sm font-bold text-white">{products?.healthy || 0}/{activeProductCount} sản phẩm ổn định</p></div><CircleGauge className={healthPercent >= 80 ? "text-emerald-400" : "text-amber-300"} size={30} /></div>
            <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-800"><div className={`h-full rounded-full ${healthPercent >= 80 ? "bg-emerald-400" : "bg-amber-300"}`} style={{ width: `${healthPercent}%` }} /></div>
            <div className="mt-4 grid grid-cols-3 gap-3 text-center"><div><strong className="block text-lg text-white">{products?.published || 0}</strong><span className="text-[9px] text-slate-500">Đang bán</span></div><div><strong className="block text-lg text-amber-300">{products?.drafts || 0}</strong><span className="text-[9px] text-slate-500">Bản nháp</span></div><div><strong className="block text-lg text-rose-300">{products?.needAttention || 0}</strong><span className="text-[9px] text-slate-500">Cần xử lý</span></div></div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Lượt xem sản phẩm" value={number(products?.totalViews || 0)} note="Tổng lượt xem trang chi tiết" icon={Eye} tone="cyan" />
        <MetricCard label="Lượt nhấp mua hàng" value={number(products?.totalClicks || 0)} note="Đã ghi nhận qua link theo dõi" icon={MousePointerClick} tone="emerald" />
        <MetricCard label="Tỷ lệ nhấp" value={`${products?.ctr || 0}%`} note="Click mua hàng / lượt xem" icon={Target} tone="violet" />
        <MetricCard label="Mức giảm trung bình" value={`${products?.averageDiscount || 0}%`} note="Trên các sản phẩm đang bán" icon={Percent} tone="amber" />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.5fr_.8fr]">
        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/65">
          <div className="flex items-center justify-between border-b border-slate-800 p-5"><div><h2 className="flex items-center gap-2 text-base font-bold text-white"><BarChart3 size={18} className="text-emerald-400" /> Sản phẩm đang được quan tâm</h2><p className="mt-1 text-[11px] text-slate-500">Xếp hạng theo lượt nhấp, lượt xem và mức ưu đãi.</p></div><button onClick={() => onNavigate("products")} className="flex items-center gap-1 text-[11px] font-bold text-emerald-400">Quản lý tất cả <ChevronRight size={14} /></button></div>
          {topProducts.length ? <div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead className="bg-slate-950/40 text-[9px] uppercase tracking-wider text-slate-500"><tr><th className="p-4">Sản phẩm</th><th className="p-4 text-right">Giá</th><th className="p-4 text-right">Lượt xem</th><th className="p-4 text-right">Lượt nhấp</th><th className="p-4 text-right">CTR</th></tr></thead><tbody>{topProducts.map((product, index) => <tr key={product.id} className="border-t border-slate-800/70 hover:bg-white/[.025]"><td className="p-4"><div className="flex items-center gap-3"><span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[10px] font-black ${index === 0 ? "bg-amber-400 text-slate-950" : "bg-slate-800 text-slate-400"}`}>{index + 1}</span><div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-slate-800">{product.image ? <img src={product.image} alt="" className="h-full w-full object-cover" /> : <ShoppingBag className="m-2.5 text-slate-600" size={20} />}</div><div><Link href={`/products/${product.slug}`} target="_blank" className="line-clamp-1 max-w-[240px] font-bold text-white hover:text-emerald-300">{product.name}</Link><span className="text-[9px] text-slate-500">{product.categoryName || product.sku}</span></div></div></td><td className="p-4 text-right font-mono font-bold text-white">{money(product.price)}</td><td className="p-4 text-right text-slate-300">{number(product.views)}</td><td className="p-4 text-right font-bold text-emerald-400">{number(product.clicks)}</td><td className="p-4 text-right"><span className="rounded-md bg-violet-400/10 px-2 py-1 font-bold text-violet-300">{product.ctr}%</span></td></tr>)}</tbody></table></div> : <div className="p-12 text-center"><Boxes className="mx-auto mb-3 text-slate-700" size={36} /><p className="font-bold text-white">Chưa có dữ liệu sản phẩm</p><p className="mt-1 text-xs text-slate-500">Xuất bản sản phẩm đầu tiên để bắt đầu theo dõi.</p></div>}
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/65 p-5">
          <div className="mb-5"><h2 className="flex items-center gap-2 text-base font-bold text-white"><Store size={18} className="text-cyan-300" /> Nguồn click theo sàn</h2><p className="mt-1 text-[11px] text-slate-500">Biết nơi nào đang tạo nhiều lượt chuyển tiếp nhất.</p></div>
          <div className="space-y-4">{marketplaces.length ? marketplaces.map((item) => { const meta = getMarketplaceMeta(item.marketplace); return <div key={item.marketplace}><div className="mb-1.5 flex items-center justify-between text-[11px]"><span className="font-bold text-slate-300">{meta.label}</span><strong className="text-white">{number(item.clicks)} lượt nhấp</strong></div><div className="h-2 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full" style={{ width: `${Math.max(7, (item.clicks / maxMarketplaceClicks) * 100)}%`, background: meta.color }} /></div></div>; }) : <div className="rounded-xl border border-dashed border-slate-700 p-8 text-center text-xs text-slate-500">Chưa có lượt nhấp theo sàn.</div>}</div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_.8fr]">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/65">
          <div className="flex items-center justify-between border-b border-slate-800 p-5"><div><h2 className="flex items-center gap-2 text-base font-bold text-white"><ClipboardCheck size={18} className="text-amber-300" /> Việc cần làm hôm nay</h2><p className="mt-1 text-[11px] text-slate-500">Ưu tiên các lỗi có thể làm mất lượt nhấp hoặc giảm độ tin cậy.</p></div>{(products?.needAttention || 0) > 0 && <span className="rounded-full bg-rose-400/10 px-2.5 py-1 text-[10px] font-black text-rose-300">{products?.needAttention} việc</span>}</div>
          <div className="divide-y divide-slate-800/80">{attention.length ? attention.map((product) => <button key={product.id} onClick={() => onNavigate("products")} className="flex w-full items-start gap-3 p-4 text-left transition hover:bg-white/[.025]"><div className="mt-0.5 rounded-lg bg-amber-400/10 p-2 text-amber-300"><AlertTriangle size={15} /></div><div className="min-w-0 flex-1"><p className="truncate text-xs font-bold text-white">{product.name}</p><p className="mt-1 text-[10px] leading-5 text-slate-500">{product.issues.join(" · ")}</p></div><ChevronRight size={15} className="mt-2 text-slate-600" /></button>) : <div className="p-9 text-center"><CheckCircle2 className="mx-auto mb-3 text-emerald-400" size={31} /><p className="text-sm font-bold text-white">Danh mục đang khỏe</p><p className="mt-1 text-xs text-slate-500">Không có sản phẩm nào cần xử lý ngay.</p></div>}</div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/65 p-5">
          <h2 className="flex items-center gap-2 text-base font-bold text-white"><RefreshCw size={18} className="text-violet-300" /> Lối tắt vận hành</h2>
          <div className="mt-5 grid gap-3">
            <button onClick={() => onNavigate("products")} className="group flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/40 p-4 text-left hover:border-emerald-500/30"><span className="rounded-lg bg-emerald-400/10 p-2 text-emerald-400"><PackagePlus size={17} /></span><span className="flex-1"><strong className="block text-xs text-white">Đăng sản phẩm mới</strong><small className="text-[10px] text-slate-500">Thêm ảnh, giá, coupon và link affiliate</small></span><ChevronRight size={15} className="text-slate-600 group-hover:text-emerald-400" /></button>
            <button onClick={() => onNavigate("categories")} className="group flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/40 p-4 text-left hover:border-cyan-500/30"><span className="rounded-lg bg-cyan-400/10 p-2 text-cyan-300"><Boxes size={17} /></span><span className="flex-1"><strong className="block text-xs text-white">Sắp xếp danh mục</strong><small className="text-[10px] text-slate-500">Giúp khách tìm sản phẩm nhanh hơn</small></span><ChevronRight size={15} className="text-slate-600 group-hover:text-cyan-300" /></button>
            <button onClick={() => onNavigate("articles")} className="group flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/40 p-4 text-left hover:border-violet-500/30"><span className="rounded-lg bg-violet-400/10 p-2 text-violet-300"><FileText size={17} /></span><span className="flex-1"><strong className="block text-xs text-white">Viết bài hướng dẫn mua</strong><small className="text-[10px] text-slate-500">Tạo nội dung hỗ trợ chuyển đổi</small></span><ChevronRight size={15} className="text-slate-600 group-hover:text-violet-300" /></button>
          </div>
        </div>
      </section>

      {(data?.topArticles?.length || 0) > 0 && <section className="rounded-2xl border border-slate-800 bg-slate-900/45 p-5"><div className="mb-4 flex items-center justify-between"><div><h2 className="text-sm font-bold text-white">Nội dung đang hỗ trợ chuyển đổi</h2><p className="mt-1 text-[10px] text-slate-500">Bài viết có nhiều lượt đọc và click affiliate.</p></div><button onClick={() => onNavigate("articles")} className="text-[10px] font-bold text-slate-400 hover:text-white">Xem bài viết</button></div><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{data?.topArticles?.slice(0, 3).map((article) => <div key={article.id} className="rounded-xl border border-slate-800 bg-slate-950/35 p-4"><p className="line-clamp-2 text-xs font-bold text-slate-200">{article.title}</p><div className="mt-3 flex gap-4 text-[10px] text-slate-500"><span className="flex items-center gap-1"><Eye size={12} /> {number(article.viewCount)}</span><span className="flex items-center gap-1 text-emerald-400"><MousePointerClick size={12} /> {number(article.clicks)}</span></div></div>)}</div></section>}
    </div>
  );
}
