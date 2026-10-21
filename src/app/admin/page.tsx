'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { cmsFetch, errorMessageForResponse } from '@/lib/cms-fetch';
import ProductManager from '@/components/admin/ProductManager';
import StoreManager from '@/components/admin/StoreManager';
import AffiliateDashboard from '@/components/admin/AffiliateDashboard';
import {
  LayoutDashboard,
  Link as LinkIcon,
  Settings,
  User,
  LogOut,
  Plus,
  Edit,
  Trash2,
  Eye,
  TrendingUp,
  MousePointerClick,
  CheckCircle2,
  Globe,
  Search,
  Users,
  Activity,
  Clock,
  Shield,
  MapPin,
  X,
  Sparkles,
  Tag,
  FolderTree,
  Palette,
  Layers,
  Type,
  Sliders,
  Layout,
  Mail,
  Download,
  ShieldAlert,
  Upload,
  FileSpreadsheet,
  AlertTriangle,
  AlertCircle,
  Send,
  Loader2,
  Radio,
  RefreshCw,
  TrendingDown,
  Info,
  Package,
} from 'lucide-react';

// D-13: the admin-only CMS tab ids. Used both by `renderContent` (permission-denied
// fallback for a non-admin that reaches one via URL) and as the single source of
// truth for which tabs only an admin may see. Every backing route keeps its 403 —
// this set is a UI contract, not the access control.
const ADMIN_ONLY_TABS = new Set(['stores', 'insights', 'subscribers', 'categories', 'users', 'links', 'blacklist', 'settings']);
const roleLabel = (role: string) => role === 'admin' ? 'Quản trị viên' : role === 'editor' ? 'Biên tập viên' : 'Tác giả';

// Reusable Luxury Button Component
const LuxuryButton = ({ children, variant = 'primary', className = '', ...props }: any) => {
  const baseStyle =
    'px-4 py-2 rounded-lg font-medium transition-all duration-300 flex items-center justify-center gap-2 text-sm cursor-pointer';
  const variants: Record<string, string> = {
    primary:
      'bg-gradient-to-r from-amber-200 to-yellow-500 text-slate-950 font-bold hover:shadow-[0_0_15px_rgba(251,191,36,0.4)] hover:scale-[1.02]',
    secondary: 'bg-white/5 border border-white/10 text-white hover:bg-white/10',
    danger: 'bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20',
  };
  return (
    <button className={`${baseStyle} ${variants[variant] || variants.primary} ${className}`} {...props}>
      {children}
    </button>
  );
};

const StatCard = ({ title, value, icon: Icon, trend, subtext, info }: any) => {
  return (
    <div className="relative rounded-2xl bg-slate-900/50 border border-slate-800 backdrop-blur-xl p-6 group hover:border-amber-500/30 transition-all duration-500">
      <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110 duration-500">
          <Icon size={100} className="text-amber-400" />
        </div>
      </div>
      <div className="relative z-10">
        <div className="flex items-center justify-between gap-3 text-slate-400 mb-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 bg-slate-950/50 rounded-lg border border-slate-800 shrink-0">
              <Icon size={16} className="text-amber-400" />
            </div>
            <h3 className="font-medium text-xs tracking-wider uppercase truncate">{title}</h3>
          </div>
          {info && (
            <div className="relative shrink-0 group/info">
              <button
                type="button"
                className="text-slate-500 hover:text-amber-400 transition-colors cursor-help"
                aria-label={`Giải thích ${title}`}
              >
                <Info size={15} />
              </button>
              <div className="pointer-events-none absolute right-0 bottom-full mb-2.5 w-64 z-40 opacity-0 invisible -translate-y-1 group-hover/info:opacity-100 group-hover/info:visible group-hover/info:translate-y-0 transition-all duration-150">
                <div className="relative p-3.5 rounded-xl bg-slate-950 border border-amber-500/30 shadow-2xl shadow-black/40 text-[11px] text-slate-300 leading-relaxed normal-case font-normal tracking-normal">
                  {info}
                </div>
                <div className="absolute -bottom-1 right-3 w-2 h-2 bg-slate-950 border-b border-r border-amber-500/30 rotate-45" />
              </div>
            </div>
          )}
        </div>
        <div className="mt-4">
          <span className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
            {value}
          </span>
        </div>
        <div className="mt-2 flex items-center gap-2 text-sm">
          {trend && (
            <span className={`font-medium flex items-center gap-1 ${trend.startsWith('+') ? 'text-emerald-400' : 'text-red-400'}`}>
              <TrendingUp size={14} className={trend.startsWith('+') ? '' : 'rotate-180'} />
              {trend}
            </span>
          )}
          {subtext && <span className="text-slate-500 text-xs">{subtext}</span>}
        </div>
      </div>
    </div>
  );
};

// Mini time-series line chart (0-based y-axis, hover crosshair + tooltip, direct end-label).
// Dùng cho các chỉ số đơn lẻ (1 series/chart) — 2 series khác thang đo (clicks vs impressions)
// cố tình tách thành 2 chart riêng thay vì dual-axis để không tạo tương quan giả.
const TrendLineChart = ({
  data,
  color,
  formatValue = (v: number) => v.toLocaleString('vi-VN'),
}: {
  data: { date: string; value: number }[];
  color: string;
  formatValue?: (v: number) => string;
}) => {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const svgRef = React.useRef<SVGSVGElement>(null);

  const W = 300;
  const H = 84;
  const PAD_TOP = 8;
  const PAD_BOTTOM = 4;
  const plotH = H - PAD_TOP - PAD_BOTTOM;

  if (data.length < 2) {
    return <p className="text-slate-500 text-xs py-8 text-center">Chưa đủ dữ liệu để vẽ biểu đồ.</p>;
  }

  const max = Math.max(...data.map((d) => d.value), 1);
  const stepX = W / (data.length - 1);
  const yFor = (v: number) => PAD_TOP + plotH - (v / max) * plotH;
  const points = data.map((d, i) => [i * stepX, yFor(d.value)] as const);
  const linePath = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L${points[points.length - 1][0].toFixed(1)},${H} L0,${H} Z`;

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? iso : `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
  };

  const handleMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const fraction = (e.clientX - rect.left) / rect.width;
    const idx = Math.round(fraction * (data.length - 1));
    setHoverIdx(Math.max(0, Math.min(data.length - 1, idx)));
  };

  const active = hoverIdx !== null ? data[hoverIdx] : data[data.length - 1];
  const activePoint = hoverIdx !== null ? points[hoverIdx] : points[points.length - 1];
  const tooltipAnchor = activePoint[0] < W * 0.15 ? 'left' : activePoint[0] > W * 0.85 ? 'right' : 'center';

  return (
    <div>
      <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1 tabular-nums">
        <span>{formatValue(max)}</span>
        <span>{formatValue(0)}</span>
      </div>
      <div className="relative">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="w-full h-20 cursor-crosshair overflow-visible"
          onMouseMove={handleMove}
          onMouseLeave={() => setHoverIdx(null)}
        >
          <line x1={0} y1={PAD_TOP} x2={W} y2={PAD_TOP} stroke="currentColor" strokeWidth={1} className="text-slate-800" vectorEffect="non-scaling-stroke" />
          <line x1={0} y1={H - PAD_BOTTOM} x2={W} y2={H - PAD_BOTTOM} stroke="currentColor" strokeWidth={1} className="text-slate-800" vectorEffect="non-scaling-stroke" />
          <path d={areaPath} fill={color} opacity={0.1} />
          <path d={linePath} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          {hoverIdx !== null && (
            <line
              x1={activePoint[0]}
              y1={0}
              x2={activePoint[0]}
              y2={H}
              stroke="currentColor"
              strokeWidth={1}
              className="text-slate-600"
              vectorEffect="non-scaling-stroke"
            />
          )}
          <circle
            cx={activePoint[0]}
            cy={activePoint[1]}
            r={4}
            fill={color}
            stroke="currentColor"
            strokeWidth={2}
            className="text-slate-900"
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        <div
          className={`absolute -top-1 flex flex-col text-[11px] whitespace-nowrap pointer-events-none px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 shadow-xl transition-opacity ${hoverIdx !== null ? 'opacity-100' : 'opacity-0'}`}
          style={{
            left: tooltipAnchor === 'center' ? `${(activePoint[0] / W) * 100}%` : tooltipAnchor === 'left' ? '0%' : undefined,
            right: tooltipAnchor === 'right' ? '0%' : undefined,
            transform: tooltipAnchor === 'center' ? 'translate(-50%, -100%)' : 'translateY(-100%)',
          }}
        >
          <span className="text-slate-500">{formatDate(active.date)}</span>
          <span className="font-bold" style={{ color }}>{formatValue(active.value)}</span>
        </div>
      </div>
      <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1">
        <span>{formatDate(data[0].date)}</span>
        <span>{formatDate(data[data.length - 1].date)}</span>
      </div>
    </div>
  );
};

export default function AdminDashboardPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);

  // System States
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [affiliateLinksList, setAffiliateLinksList] = useState<any[]>([]);
  const [categoriesList, setCategoriesList] = useState<any[]>([]);
  const [settingsData, setSettingsData] = useState<any>(null);
  // SEO Insights (GA4 + GSC) State
  const [insightsData, setInsightsData] = useState<any>(null);
  const [insightsConfigured, setInsightsConfigured] = useState<boolean | null>(null);
  const [insightsMissingEnv, setInsightsMissingEnv] = useState<string[]>([]);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsDays, setInsightsDays] = useState(28);
  // Subscribers Leads State
  const [subscribersList, setSubscribersList] = useState<any[]>([]);
  const [subscribersStats, setSubscribersStats] = useState<any>({ totalSubscribers: 0, countToday: 0, countThisWeek: 0 });
  const [subscriberSearchQuery, setSubscriberSearchQuery] = useState('');
  const [sendingInsiderDigest, setSendingInsiderDigest] = useState(false);
  const [insiderDispatchNotice, setInsiderDispatchNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // D-03: shell-level error/success toast for every CMS call routed through the
  // shared auth-fetch helper. Error toasts persist until dismissed; success
  // toasts auto-dismiss (~3s). Mirrors the insiderDispatchNotice shape.
  const [cmsToast, setCmsToast] = useState<{ type: 'success' | 'error'; text: string; showSignIn?: boolean } | null>(null);
  const cmsToastTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const showCmsToast = (
    type: 'success' | 'error',
    text: string,
    options: { showSignIn?: boolean } = {}
  ) => {
    if (cmsToastTimerRef.current) {
      clearTimeout(cmsToastTimerRef.current);
      cmsToastTimerRef.current = null;
    }
    setCmsToast({ type, text, showSignIn: options.showSignIn });
    // Success auto-dismisses; error persists until dismissed or superseded.
    if (type === 'success') {
      cmsToastTimerRef.current = setTimeout(() => setCmsToast(null), 3000);
    }
  };

  // Shared failure handler: on 401 clear the stale token and offer Sign in;
  // otherwise surface the status-mapped copy.
  const handleCmsFailure = (status: number, message?: string) => {
    if (status === 401) {
      try {
        localStorage.removeItem('token');
      } catch {
        // ignore storage failures (private mode)
      }
      showCmsToast('error', errorMessageForResponse(401), { showSignIn: true });
      return;
    }
    showCmsToast('error', errorMessageForResponse(status, message));
  };

  // User Modal State
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('editor');

  // D-14: edit-user modal state. Covers role/status/name/avatar ONLY — there is
  // deliberately no password control (password recovery is CLI-only, Phase 1 D-04).
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [editUserName, setEditUserName] = useState('');
  const [editUserRole, setEditUserRole] = useState('editor');
  const [editUserStatus, setEditUserStatus] = useState<'active' | 'inactive'>('active');
  const [editUserAvatar, setEditUserAvatar] = useState('');
  const [savingEditUser, setSavingEditUser] = useState(false);

  // Category & Sub-Category Modal States
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategoryObj, setEditingCategoryObj] = useState<any>(null);
  const [catName, setCatName] = useState('');
  const [catSlug, setCatSlug] = useState('');
  const [catDesc, setCatDesc] = useState('');
  const [catMetaTitle, setCatMetaTitle] = useState('');
  const [catMetaDesc, setCatMetaDesc] = useState('');
  const [catHomepageImageUrl, setCatHomepageImageUrl] = useState('');
  const [catShowOnHomepage, setCatShowOnHomepage] = useState(false);
  const [catNavOrder, setCatNavOrder] = useState('0');

  const [showSubCategoryModal, setShowSubCategoryModal] = useState(false);
  const [editingSubCategoryObj, setEditingSubCategoryObj] = useState<any>(null);
  const [subCatParentId, setSubCatParentId] = useState<number | string>('');
  const [subCatName, setSubCatName] = useState('');
  const [subCatSlug, setSubCatSlug] = useState('');
  const [subCatDesc, setSubCatDesc] = useState('');
  const [subCatMetaTitle, setSubCatMetaTitle] = useState('');
  const [subCatMetaDesc, setSubCatMetaDesc] = useState('');

  // Affiliate Link Form State
  const [newAffName, setNewAffName] = useState('');
  const [newAffUrl, setNewAffUrl] = useState('');
  const [newAffProductUrl, setNewAffProductUrl] = useState('');
  const [newAffCommission, setNewAffCommission] = useState('15% / Sale');
  const [newAffCookie, setNewAffCookie] = useState('30 Days');
  const [affUrlBlacklistError, setAffUrlBlacklistError] = useState<any>(null);

  // Blacklist Center States
  const [blacklistList, setBlacklistList] = useState<any[]>([]);
  const [showAddBlacklistModal, setShowAddBlacklistModal] = useState(false);
  const [showImportSheetModal, setShowImportSheetModal] = useState(false);
  const [importSheetUrl, setImportSheetUrl] = useState('https://docs.google.com/spreadsheets/d/1HNAJ6F_EBzVs0bqBfC2mt2pFQHCtCNlIRGXDRnNvEuQ/edit?gid=802654639#gid=802654639');
  const [isImportingSheet, setIsImportingSheet] = useState(false);
  const [isReSweeping, setIsReSweeping] = useState(false);
  const [activeBlacklistTab, setActiveBlacklistTab] = useState<'repository' | 'rules'>('repository');
  const [blProjectName, setBlProjectName] = useState('');
  const [blWebsiteUrl, setBlWebsiteUrl] = useState('');
  const [blReason, setBlReason] = useState('Bắt Ads - Không trả tiền');
  const [blBlockedCountries, setBlBlockedCountries] = useState('Bồ Đào Nha, Croatia, Ba Lan, Bỉ, Đức');
  const [blMatchType, setBlMatchType] = useState<'domain' | 'exact_url'>('domain');
  const [blSearchQuery, setBlSearchQuery] = useState('');

  // Settings Sub-Tab
  const [settingsSection, setSettingsSection] = useState<'appearance' | 'seo_geo' | 'code'>('appearance');

  const router = useRouter();
  const searchParams = useSearchParams();

  // Preserve browser Back/Forward navigation between sales management tabs.
  const buildAdminUrl = (tab: string) => {
    const params = new URLSearchParams();
    if (tab !== 'dashboard') params.set('tab', tab);
    const qs = params.toString();
    return qs ? `/admin?${qs}` : '/admin';
  };

  const navigate = (next: { tab?: string }, options: { replace?: boolean } = {}) => {
    const tab = next.tab ?? activeTab;
    setActiveTab(tab);
    const url = buildAdminUrl(tab);
    if (options.replace) router.replace(url, { scroll: false });
    else router.push(url, { scroll: false });
  };

  useEffect(() => {
    const urlTab = searchParams.get('tab') || 'dashboard';
    // Old bookmarks must not open the removed article editor or preview.
    if (urlTab === 'articles' || searchParams.has('edit') || searchParams.has('preview')) {
      setActiveTab('products');
      router.replace('/admin?tab=products', { scroll: false });
      return;
    }
    setActiveTab(urlTab);
  }, [searchParams, router]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/admin/login');
      return;
    }

    fetch('/api/v1/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.status === 'success') {
          setCurrentUser(data.data);
          loadAllData(token);
        } else {
          router.push('/admin/login');
        }
      })
      .catch(() => router.push('/admin/login'))
      .finally(() => setLoading(false));
  }, [router]);

  const loadAllData = (tokenStr?: string) => {
    const token = tokenStr || localStorage.getItem('token');
    if (!token) return;

    fetch('/api/v1/cms/dashboard', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => d.status === 'success' && setDashboardData(d.data));

    fetch('/api/v1/cms/affiliate-links', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => d.status === 'success' && setAffiliateLinksList(d.data));

    fetch('/api/v1/cms/categories', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => d.status === 'success' && setCategoriesList(d.data));

    fetch('/api/v1/cms/settings', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => d.status === 'success' && setSettingsData(d.data));

    fetch('/api/v1/cms/blacklist', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => d.status === 'success' && setBlacklistList(d.data));

    if (currentUser?.role === 'admin') {
      loadSubscribersData(token);
    }
  };

  const handleCheckAffUrl = async (urlStr: string) => {
    setNewAffUrl(urlStr);
    if (!urlStr || urlStr.length < 4) {
      setAffUrlBlacklistError(null);
      return;
    }
    // CR-01: route through cmsFetch so the bearer token is attached automatically,
    // and fail closed on any non-ok result — a failed check must never clear the
    // warning or make a blacklisted URL look safe.
    const token = localStorage.getItem('token');
    const result = await cmsFetch<{
      isBlacklisted: boolean;
      projectName?: string;
      matchedDomain?: string;
      reason?: string;
      blockedCountries?: string[];
    }>('/api/v1/cms/blacklist/check', {
      method: 'POST',
      body: { url: urlStr },
      token,
    });
    if (!result.ok) {
      setAffUrlBlacklistError({
        isError: true,
        projectName: '—',
        matchedDomain: urlStr,
        reason: 'Blacklist check unavailable. Retry before saving.',
        blockedCountries: [],
      });
      return;
    }
    if (result.data?.isBlacklisted) {
      setAffUrlBlacklistError({
        isError: true,
        projectName: result.data.projectName,
        matchedDomain: result.data.matchedDomain,
        reason: result.data.reason,
        blockedCountries: result.data.blockedCountries || [],
      });
    } else {
      setAffUrlBlacklistError(null);
    }
  };

  const handleSaveBlacklist = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    const blockedList = blBlockedCountries.split(',').map((s) => s.trim()).filter(Boolean);

    try {
      const res = await fetch('/api/v1/cms/blacklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          projectName: blProjectName,
          websiteUrl: blWebsiteUrl,
          reason: blReason,
          matchType: blMatchType,
          blockedCountries: blockedList,
        }),
      });
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        alert(`✅ Đã thêm "${data.data.extractedDomain}" vào Blacklist!\n📊 Tự động làm sạch ${data.data.sweep?.totalUpdatedLinks || 0} chiến dịch bị ảnh hưởng.`);
        setShowAddBlacklistModal(false);
        setBlProjectName('');
        setBlWebsiteUrl('');
        loadAllData();
      } else {
        alert(`Lỗi: ${data.message}`);
      }
    } catch {
      alert('Không thể thêm vào Blacklist');
    }
  };

  const handleQuickBlacklist = async (campaignId: string, campaignName: string) => {
    const reasonPrompt = prompt(`Đưa chiến dịch "${campaignName}" vào danh sách Blacklist?\nNhập lý do cấm (ví dụ: Bắt Ads - Không trả tiền):`, 'Bắt Ads - Không trả tiền');
    if (!reasonPrompt) return;

    const token = localStorage.getItem('token');
    try {
      const res = await fetch('/api/v1/cms/blacklist/quick-blacklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ campaignId, reason: reasonPrompt }),
      });
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        alert(`🛑 Chiến dịch "${campaignName}" đã được đưa vào Blacklist (Domain: ${data.data.domainBlacklisted}).\nQuét ngầm thành công ${data.data.sweptCount} chiến dịch.`);
        loadAllData();
      } else {
        alert(`Lỗi: ${data.message}`);
      }
    } catch {
      alert('Không thể thực hiện Quick Blacklist');
    }
  };

  const handleDeleteBlacklist = async (id: string) => {
    if (!confirm('Bạn có chắc muốn xóa domain/URL này khỏi Blacklist?')) return;
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`/api/v1/cms/blacklist?id=${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) loadAllData();
    } catch {
      alert('Không thể xóa khỏi Blacklist');
    }
  };

  const handleImportGoogleSheetUrl = async () => {
    if (!importSheetUrl) {
        showCmsToast('error', 'Hãy dán đường dẫn Google Sheet công khai để nhập dữ liệu.');
      return;
    }
    setIsImportingSheet(true);
    const token = localStorage.getItem('token');
    try {
      const result = await cmsFetch<{ totalImported: number; csvExportUrl: string }>(
        '/api/v1/cms/blacklist/import-sheet-url',
        { method: 'POST', body: { sheetUrl: importSheetUrl }, token }
      );
      if (!result.ok) {
        handleCmsFailure(result.status, result.message);
        return;
      }
      const n = result.data.totalImported;
      // D-05: the sweep runs after the response, so the copy is eventual — it must
      // not promise a final swept count.
      showCmsToast(
        'success',
        `Đã nhập ${n} tên miền từ Google Sheet. Hệ thống đang quét lại các chiến dịch liên quan trong nền.`
      );
      setShowImportSheetModal(false);
      loadAllData();
    } catch {
      handleCmsFailure(0);
    } finally {
      setIsImportingSheet(false);
    }
  };

  // D-08: manual re-sweep — re-run the sweep over current blacklist entries AND
  // restore campaigns no longer matching any active entry back to `active`. Never
  // touches a manually-inactive campaign.
  const handleReSweepBlacklist = async () => {
    setIsReSweeping(true);
    const token = localStorage.getItem('token');
    try {
      const result = await cmsFetch<{ swept: number; restored: number }>(
        '/api/v1/cms/blacklist/re-sweep',
        { method: 'POST', token }
      );
      if (!result.ok) {
        handleCmsFailure(result.status, result.message);
        return;
      }
      const { swept, restored } = result.data;
      if (swept === 0 && restored === 0) {
        showCmsToast('success', 'Đã quét lại. Không có chiến dịch nào cần thay đổi.');
      } else {
        showCmsToast(
          'success',
          `Đã quét lại: chặn ${swept} chiến dịch và khôi phục ${restored} chiến dịch về trạng thái hoạt động.`
        );
      }
      loadAllData();
    } catch {
      handleCmsFailure(0);
    } finally {
      setIsReSweeping(false);
    }
  };

  const handleBatchImportGoogleSheet = async () => {
    const token = localStorage.getItem('token');
    const sampleSheetData = [
      { projectName: 'dozarplati', websiteUrl: 'https://dozarplati.com/', reason: 'Bắt Ads-Không trả tiền' },
      { projectName: 'NordVPN', websiteUrl: 'https://nordvpn.com', reason: 'Bắt Ads-Không trả tiền' },
      { projectName: 'finbo', websiteUrl: 'https://www.finbo.pl/', reason: 'Bắt Ads-Không trả tiền' },
      { projectName: 'nichescraper', websiteUrl: 'https://nichescraper.com/affiliate.php', reason: 'Bắt Ads-Không trả tiền' },
      { projectName: 'alidropship', websiteUrl: 'https://affiliates.alidropship.com/', reason: 'Bắt Ads-Không trả tiền' },
      { projectName: 'supergrosz', websiteUrl: 'https://supergrosz.pl/', reason: 'Bắt Ads-Không trả tiền' },
      { projectName: 'smart pozyczka', websiteUrl: 'https://smartpozyczka.pl/', reason: 'Bắt Ads-Không trả tiền' },
      { projectName: 'Hostinger', websiteUrl: 'https://hostinger.com/', reason: 'Bắt Ads-Không trả tiền' },
      { projectName: 'flowxo', websiteUrl: 'https://flowxo.com/', reason: 'Bắt Ads-Không trả tiền' },
      { projectName: 'Scalenut', websiteUrl: 'https://www.scalenut.com/', reason: 'Bắt Ads-Không trả tiền' },
      { projectName: 'getresponse', websiteUrl: 'getresponse.com/vn/affiliate-programs', reason: 'Bắt Ads-Không trả tiền' },
      { projectName: 'graphy', websiteUrl: 'https://graphy.com/partners', reason: 'Bắt Ads-Không trả tiền' },
      { projectName: 'Liquidweb', websiteUrl: 'liquidweb.com', reason: 'Bắt Ads-Không trả tiền' },
      { projectName: 'iPage', websiteUrl: 'https://www.ipage.com/', reason: 'Bắt Ads-Không trả tiền' },
      { projectName: 'Pixpa', websiteUrl: 'https://www.pixpa.com/', reason: 'Bắt Ads-Không trả tiền' },
      { projectName: 'Bluehost', websiteUrl: 'https://www.bluehost.com/', reason: 'Bắt Ads-Không trả tiền' },
      { projectName: 'Semrush', websiteUrl: 'https://www.semrush.com/', reason: 'Bắt Ads-Không trả tiền' },
      { projectName: 'Wix', websiteUrl: 'https://vi.wix.com/', reason: 'Bắt Ads-Không trả tiền' },
      { projectName: 'Grammarly', websiteUrl: 'https://www.grammarly.com/', reason: 'Bắt Ads-Không trả tiền' },
      { projectName: 'Teachable', websiteUrl: 'https://teachable.com/', reason: 'Bắt Ads-Không trả tiền', blockedCountries: 'Bồ Đào Nha, Croatia, Ba Lan, Bỉ, Đức, Ý, Áo, Tây Ban Nha' },
    ];

    try {
      const res = await fetch('/api/v1/cms/blacklist/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ items: sampleSheetData }),
      });
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        alert(`📥 Nạp dữ liệu từ Google Sheet mẫu thành công!\n📊 Đã lưu ${data.data.totalImported} domain cấm và tự động làm sạch ${data.data.totalSweptCampaigns} chiến dịch.`);
        loadAllData();
      } else {
        alert(`Lỗi: ${data.message}`);
      }
    } catch {
      alert('Không thể nạp dữ liệu từ Google Sheet mẫu');
    }
  };

  const loadSubscribersData = (tokenStr?: string) => {
    const token = tokenStr || localStorage.getItem('token');
    fetch('/api/v1/cms/subscribers', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => {
        if (d.status === 'success') {
          setSubscribersList(d.data.list);
          setSubscribersStats(d.data.stats);
        }
      });
  };

  const handleDeleteSubscriber = async (id: number) => {
    if (!confirm('Bạn có chắc muốn xóa người đăng ký này?')) return;
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`/api/v1/cms/subscribers/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) loadSubscribersData();
    } catch {
      alert('Không thể xóa người đăng ký.');
    }
  };

  const handleSendInsiderDigestNow = async () => {
    const activeRecipients = subscribersStats?.totalSubscribers || 0;
    if (activeRecipients === 0) {
      setInsiderDispatchNotice({ type: 'error', text: 'Hiện chưa có người nhận bản tin đang hoạt động.' });
      return;
    }
    if (!confirm(`Gửi bản tin hôm nay đến ${activeRecipients.toLocaleString()} người đang hoạt động ngay bây giờ? Lần gửi thủ công này không ảnh hưởng đến lịch gửi tự động tiếp theo.`)) return;

    const token = localStorage.getItem('token');
    setSendingInsiderDigest(true);
    setInsiderDispatchNotice(null);
    try {
      const response = await fetch('/api/v1/cms/insider/send-now', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = await response.json();
      if (!response.ok || payload.status !== 'success') {
        throw new Error(payload.message || 'Không thể gửi bản tin.');
      }

      const result = payload.data || {};
      const text = result.skipped === 'no_articles'
        ? 'Chưa có bài viết đã xuất bản để gửi trong bản tin.'
        : result.sent === 0
          ? 'Không tìm thấy người nhận đang hoạt động khi bắt đầu gửi.'
          : `Đã gửi bản tin đến ${result.sent.toLocaleString()} người trong ${result.batches.toLocaleString()} đợt. Lịch gửi tự động tiếp theo vẫn hoạt động.`;
      setInsiderDispatchNotice({ type: 'success', text });
      loadSubscribersData();
    } catch (error) {
      setInsiderDispatchNotice({
        type: 'error',
        text: error instanceof Error ? error.message : 'Không thể gửi bản tin.',
      });
    } finally {
      setSendingInsiderDigest(false);
    }
  };

  const loadUsersData = () => {
    const token = localStorage.getItem('token');
    fetch('/api/v1/cms/users', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => d.status === 'success' && setUsersList(d.data));
  };

  const loadInsightsData = (force = false, days = insightsDays) => {
    const token = localStorage.getItem('token');
    setInsightsLoading(true);
    const params = new URLSearchParams({ days: String(days) });
    if (force) params.set('force', 'true');
    fetch(`/api/v1/cms/insights?${params.toString()}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => {
        if (d.status !== 'success') return;
        setInsightsConfigured(d.configured);
        setInsightsMissingEnv(d.missingEnv || []);
        setInsightsData(d.data);
      })
      .finally(() => setInsightsLoading(false));
  };

  useEffect(() => {
    if (activeTab === 'users' && currentUser?.role === 'admin') {
      loadUsersData();
    }
    if (activeTab === 'subscribers' && currentUser?.role === 'admin') {
      loadSubscribersData();
    }
    if (activeTab === 'insights' && currentUser?.role === 'admin') {
      loadInsightsData();
    }
  }, [activeTab, currentUser]);

  const handleLogout = async () => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        await fetch('/api/v1/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {
        // Mất mạng/API lỗi vẫn cứ đăng xuất phía client bình thường — token cũ
        // không bị revoke ngay lúc đó nhưng vẫn tự hết hạn sau 24h như cũ.
      }
    }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/admin/login');
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('/api/v1/cms/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          username: newUsername,
          password: newPassword,
          name: newName,
          role: newRole,
        }),
      });
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        alert('Đã thêm thành viên mới.');
        setShowAddUserModal(false);
        setNewUsername('');
        setNewPassword('');
        setNewName('');
        loadUsersData();
      } else {
        alert(`Lỗi: ${data.message}`);
      }
    } catch {
      alert('Không thể thêm thành viên.');
    }
  };

  // D-14: open the edit modal seeded with the row's current values. No password.
  const openEditUserModal = (u: any) => {
    setEditingUser(u);
    setEditUserName(u.name || '');
    setEditUserRole(u.role || 'editor');
    setEditUserStatus(u.status === 'inactive' ? 'inactive' : 'active');
    setEditUserAvatar(u.avatar || '');
    setShowEditUserModal(true);
  };

  // D-14: persist role/status/name/avatar via PUT /api/v1/cms/users/:id through the
  // shared auth-fetch helper (D-03) so a non-2xx surfaces the status-mapped error
  // toast instead of failing silently. No password is ever sent.
  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    const token = localStorage.getItem('token');
    setSavingEditUser(true);
    try {
      const result = await cmsFetch(`/api/v1/cms/users/${editingUser.id}`, {
        method: 'PUT',
        token,
        body: {
          name: editUserName,
          role: editUserRole,
          status: editUserStatus,
          avatar: editUserAvatar,
        },
      });

      if (!result.ok) {
        handleCmsFailure(result.status, result.message);
        return;
      }

      showCmsToast('success', 'Đã cập nhật thông tin thành viên.');
      setShowEditUserModal(false);
      setEditingUser(null);
      loadUsersData();
    } finally {
      setSavingEditUser(false);
    }
  };

  const handleAddAffiliateLink = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('/api/v1/cms/affiliate-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: newAffName,
          base_url: newAffUrl,
          product_url: newAffProductUrl || newAffUrl,
          commission: newAffCommission,
          cookie: newAffCookie,
        }),
      });
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        alert('Đã thêm chiến dịch affiliate thành công!');
        setNewAffName('');
        setNewAffUrl('');
        setNewAffProductUrl('');
        loadAllData();
      } else {
        alert(data.message);
      }
    } catch (err) {
      alert('Không thể thêm liên kết affiliate.');
    }
  };

  const handleDeleteAffiliateLink = async (id: number) => {
    if (!confirm('Bạn có chắc muốn xóa chiến dịch này?')) return;
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`/api/v1/cms/affiliate-links/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) loadAllData();
    } catch (err) {
      alert('Không thể xóa chiến dịch.');
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('/api/v1/cms/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(settingsData),
      });
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        alert('Đã lưu cấu hình giao diện, hệ thống, SEO và GEO!');
      } else {
        alert(`Lỗi: ${data.message}`);
      }
    } catch {
      alert('Không thể lưu cấu hình.');
    }
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    const payload = {
      name: catName,
      slug: catSlug || catName.toLowerCase().trim().replace(/\s+/g, '-'),
      description: catDesc,
      metaTitle: catMetaTitle,
      metaDescription: catMetaDesc,
      homepageImageUrl: catHomepageImageUrl,
      showOnHomepage: catShowOnHomepage,
      navOrder: Number(catNavOrder) || 0,
    };
    try {
      let res;
      if (editingCategoryObj?.id) {
        res = await fetch(`/api/v1/cms/categories/${editingCategoryObj.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch('/api/v1/cms/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload),
        });
      }
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        alert(editingCategoryObj?.id ? 'Đã cập nhật danh mục.' : 'Đã tạo danh mục chính.');
        setShowCategoryModal(false);
        setEditingCategoryObj(null);
        setCatName(''); setCatSlug(''); setCatDesc(''); setCatMetaTitle(''); setCatMetaDesc('');
        setCatHomepageImageUrl(''); setCatShowOnHomepage(false); setCatNavOrder('0');
        loadAllData();
      } else {
        alert(`Lỗi: ${data.message}`);
      }
    } catch {
      alert('Không thể lưu danh mục.');
    }
  };

  const handleDeleteCategory = async (id: number) => {
    if (!confirm('Bạn có chắc muốn xóa danh mục chính này? Các danh mục phụ liên quan cũng sẽ bị xóa.')) return;
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`/api/v1/cms/categories/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) loadAllData();
    } catch {
      alert('Không thể xóa danh mục.');
    }
  };

  const handleSaveSubCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    const payload = {
      categoryId: subCatParentId ? String(subCatParentId) : undefined,
      name: subCatName,
      slug: subCatSlug || subCatName.toLowerCase().trim().replace(/\s+/g, '-'),
      description: subCatDesc,
      metaTitle: subCatMetaTitle,
      metaDescription: subCatMetaDesc,
    };
    try {
      let res;
      if (editingSubCategoryObj?.id) {
        res = await fetch(`/api/v1/cms/sub-categories/${editingSubCategoryObj.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch('/api/v1/cms/sub-categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload),
        });
      }
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        alert(editingSubCategoryObj?.id ? 'Đã cập nhật danh mục phụ.' : 'Đã tạo danh mục phụ.');
        setShowSubCategoryModal(false);
        setEditingSubCategoryObj(null);
        setSubCatName(''); setSubCatSlug(''); setSubCatDesc(''); setSubCatMetaTitle(''); setSubCatMetaDesc('');
        loadAllData();
      } else {
        alert(`Lỗi: ${data.message}`);
      }
    } catch {
      alert('Không thể lưu danh mục phụ.');
    }
  };

  const handleDeleteSubCategory = async (id: number) => {
    if (!confirm('Bạn có chắc muốn xóa danh mục phụ này?')) return;
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`/api/v1/cms/sub-categories/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) loadAllData();
    } catch {
      alert('Không thể xóa danh mục phụ.');
    }
  };

  const generateDefaultSchemaJsonLd = () => {
    const schema = {
      "@context": "https://schema.org",
      "@type": "Organization",
      "name": settingsData?.businessName || settingsData?.siteTitle || "AIDEALSUK",
      "url": settingsData?.canonicalUrl || "https://nexusfinance.global",
      "logo": settingsData?.logoUrl || "https://images.unsplash.com/photo-1621761191319-c6fb62004040?q=80&w=300",
      "description": settingsData?.metaDescription || "Institutional Financial Intelligence & Affiliate Deals",
      "address": {
        "@type": "PostalAddress",
        "streetAddress": settingsData?.businessAddress || "Wall Street",
        "addressLocality": settingsData?.geoPlacename || "New York",
        "addressRegion": settingsData?.geoRegionName || "US-NY",
        "addressCountry": settingsData?.geoTarget || "US"
      },
      "geo": {
        "@type": "GeoCoordinates",
        "latitude": settingsData?.geoLatitude || 40.7128,
        "longitude": settingsData?.geoLongitude || -74.0060
      },
      "contactPoint": {
        "@type": "ContactPoint",
        "telephone": settingsData?.businessPhone || "+1-800-555-0199",
        "contactType": "customer service"
      }
    };
    setSettingsData({ ...settingsData, schemaJsonld: JSON.stringify(schema, null, 2) });
  };

  if (loading || !currentUser) {
    return (
      <div className="min-h-screen bg-[#060608] flex items-center justify-center text-amber-400 font-sans">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-full border-2 border-amber-400 border-t-transparent animate-spin"></div>
          <span>Đang mở trung tâm quản trị GoodPick...</span>
        </div>
      </div>
    );
  }

  // --- VIEWS ---

  // Dashboard Overview
  const DashboardView = () => (
    <AffiliateDashboard
      data={dashboardData}
      userName={currentUser.name || currentUser.username}
      onNavigate={(tab) => navigate({ tab })}
    />
  );

  // SEO Insights View (GA4 + GSC)
  const InsightsView = () => {
    const overview: any[] = insightsData?.organicOverview || [];
    const quickWins: any[] = insightsData?.quickWinQueries || [];
    const decay: any[] = insightsData?.contentDecay || [];
    const funnel: any[] = insightsData?.funnel || [];

    const totals = overview.reduce(
      (acc, d) => ({ clicks: acc.clicks + d.clicks, impressions: acc.impressions + d.impressions }),
      { clicks: 0, impressions: 0 }
    );
    const avgPosition = overview.length
      ? overview.reduce((sum, d) => sum + d.position, 0) / overview.length
      : 0;
    const avgCtr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;

    const clicksSeries = overview.map((d) => ({ date: d.date, value: d.clicks }));
    const impressionsSeries = overview.map((d) => ({ date: d.date, value: d.impressions }));

    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">Hiệu quả tìm kiếm</h2>
            <p className="text-slate-400 text-sm">Dữ liệu tổng hợp từ Google Analytics 4 &amp; Search Console — {insightsDays} ngày gần nhất.</p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={insightsDays}
              onChange={(e) => {
                const days = Number(e.target.value);
                setInsightsDays(days);
                loadInsightsData(false, days);
              }}
              disabled={insightsLoading}
              className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-300 hover:border-amber-500/40 transition-all disabled:opacity-50 cursor-pointer"
            >
              <option value={7}>7 ngày qua</option>
              <option value={28}>28 ngày qua</option>
              <option value={90}>90 ngày qua</option>
            </select>
            <button
              onClick={() => loadInsightsData(true)}
              disabled={insightsLoading}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs bg-slate-900 border border-slate-700 text-slate-300 hover:text-white hover:border-amber-500/40 transition-all disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw size={14} className={insightsLoading ? 'animate-spin' : ''} /> Làm mới
            </button>
          </div>
        </div>

        {insightsConfigured === false && (
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-6 flex items-start gap-4">
            <AlertTriangle size={24} className="text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-white font-semibold mb-1">Chưa cấu hình GA4 Data API / Search Console API</p>
              <p className="text-slate-400 text-sm mb-2">
                Cần set các biến môi trường server sau (service account credentials, không nhập qua UI):
              </p>
              <ul className="text-xs font-mono text-amber-300/90 space-y-1">
                {insightsMissingEnv.map((key) => (
                  <li key={key}>• {key}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {insightsConfigured && insightsLoading && !insightsData && (
          <div className="flex items-center justify-center h-48 text-slate-500 text-sm gap-2">
            <Loader2 size={18} className="animate-spin" /> Đang tải dữ liệu từ Google...
          </div>
        )}

        {insightsConfigured && insightsData && (
          <div className={`space-y-6 transition-opacity duration-200 ${insightsLoading ? 'opacity-50' : 'opacity-100'}`}>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <StatCard
                title={`Lượt nhấp tự nhiên (${insightsDays} ngày)`}
                value={totals.clicks.toLocaleString()}
                icon={MousePointerClick}
                subtext="Google Search Console"
                info="Số lần người dùng bấm vào kết quả tìm kiếm (không phải quảng cáo) để vào trang của bạn trên Google. Đây là traffic SEO thực tế, khác với 'Impressions' chỉ là được nhìn thấy."
              />
              <StatCard
                title={`Lượt hiển thị (${insightsDays} ngày)`}
                value={totals.impressions.toLocaleString()}
                icon={Eye}
                subtext="Google Search Console"
                info="Số lần một URL của bạn xuất hiện trên trang kết quả tìm kiếm Google, dù người dùng có cuộn tới thấy hay bấm vào hay không. Impressions cao nhưng Clicks thấp = trang được Google hiển thị nhưng chưa đủ hấp dẫn để người dùng bấm vào."
              />
              <StatCard
                title="CTR trung bình"
                value={`${avgCtr.toFixed(2)}%`}
                icon={Activity}
                subtext="Lượt nhấp / Lượt hiển thị"
                info="Tỷ lệ click-through = Clicks ÷ Impressions. CTR thấp thường do title/meta description chưa hấp dẫn, hoặc thứ hạng (position) còn thấp nên ít người cuộn tới thấy."
              />
              <StatCard
                title="Vị trí trung bình"
                value={avgPosition.toFixed(1)}
                icon={Search}
                subtext="Thứ hạng trung bình"
                info="Vị trí trung bình trang của bạn xuất hiện trên kết quả tìm kiếm Google cho các truy vấn liên quan (1 = vị trí đầu tiên). Số càng nhỏ càng tốt."
              />
            </div>

            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm">
              <h3 className="text-white font-medium flex items-center gap-2 mb-5">
                <TrendingUp size={18} className="text-amber-400" /> Xu hướng tìm kiếm tự nhiên
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <p className="text-xs font-semibold text-amber-400/90 uppercase tracking-wider mb-2">Clicks theo ngày</p>
                  <TrendLineChart data={clicksSeries} color="#f59e0b" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-cyan-400/90 uppercase tracking-wider mb-2">Impressions theo ngày</p>
                  <TrendLineChart data={impressionsSeries} color="#22d3ee" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm">
                <h3 className="text-white font-medium flex items-center gap-2 mb-4">
                  <Search size={18} className="text-cyan-400" /> Từ khóa có thể tăng hạng nhanh
                </h3>
                <p className="text-xs text-slate-500 mb-4">Từ khóa vị trí 8-20, impressions cao — cơ hội tối ưu để lên top 10.</p>
                <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
                  {quickWins.length > 0 ? quickWins.map((q: any, i: number) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-slate-950/50 rounded-xl border border-slate-800/50">
                      <div className="min-w-0">
                        <p className="text-white text-sm font-medium truncate">{q.query}</p>
                        <p className="text-xs text-slate-500 truncate">{q.page}</p>
                      </div>
                      <div className="text-right shrink-0 ml-3">
                        <p className="text-xs text-cyan-400 font-semibold">Vị trí {q.position}</p>
                        <p className="text-[11px] text-slate-500">{q.impressions.toLocaleString()} lượt hiển thị</p>
                      </div>
                    </div>
                  )) : (
                    <p className="text-slate-500 text-sm text-center py-8">Không có quick-win nào trong kỳ này.</p>
                  )}
                </div>
              </div>

              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm">
                <h3 className="text-white font-medium flex items-center gap-2 mb-4">
                  <TrendingDown size={18} className="text-red-400" /> Cảnh báo nội dung giảm hiệu quả
                </h3>
                <p className="text-xs text-slate-500 mb-4">Bài viết giảm &gt;20% clicks so với {insightsDays} ngày trước đó — ưu tiên update.</p>
                <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
                  {decay.length > 0 ? decay.map((d: any, i: number) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-slate-950/50 rounded-xl border border-slate-800/50">
                      <p className="text-white text-sm font-medium truncate max-w-[60%]">{d.page}</p>
                      <div className="text-right shrink-0">
                        <p className="text-xs text-red-400 font-semibold">{d.changePercent}%</p>
                        <p className="text-[11px] text-slate-500">{d.clicksBefore} → {d.clicksAfter} lượt nhấp</p>
                      </div>
                    </div>
                  )) : (
                    <p className="text-slate-500 text-sm text-center py-8">Không phát hiện bài viết bị suy giảm.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm">
              <h3 className="text-white font-medium flex items-center gap-2 mb-4">
                <MousePointerClick size={18} className="text-emerald-400" /> Phễu truy cập → nhấp liên kết affiliate
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-slate-400 text-xs uppercase tracking-wider border-b border-slate-800">
                      <th className="p-3 font-medium">Bài viết</th>
                      <th className="p-3 font-medium text-right">Lượt xem trang (GA4)</th>
                      <th className="p-3 font-medium text-right">Nhấp affiliate</th>
                      <th className="p-3 font-medium text-right">CTR</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {funnel.length > 0 ? funnel.map((f: any, i: number) => (
                      <tr key={i} className="border-b border-slate-800/60 hover:bg-white/[0.02] transition-colors">
                        <td className="p-3 text-white">
                          <div className="max-w-xs truncate" title={f.articleTitle}>{f.articleTitle}</div>
                        </td>
                        <td className="p-3 text-slate-300 text-right font-mono">{f.pageviews.toLocaleString()}</td>
                        <td className="p-3 text-emerald-400/90 text-right font-mono">{f.affiliateClicks.toLocaleString()}</td>
                        <td className="p-3 text-amber-400 text-right font-mono">{f.clickThroughRate}%</td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-slate-500 text-sm">Chưa có dữ liệu funnel trong kỳ này.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // User Management View
  const UsersView = () => (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">Tài khoản & phân quyền</h2>
          <p className="text-slate-400 text-sm">Quản lý thành viên, vai trò và phạm vi dữ liệu được phép thao tác.</p>
        </div>
        <LuxuryButton onClick={() => setShowAddUserModal(true)}>
          <Plus size={18} /> Thêm thành viên
        </LuxuryButton>
      </div>

      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-950/50 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-800">
              <th className="p-4 font-medium">Thành viên</th>
              <th className="p-4 font-medium">Vai trò</th>
              <th className="p-4 font-medium">Trạng thái</th>
              <th className="p-4 font-medium">Bài viết</th>
              <th className="p-4 font-medium text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {usersList.map((u) => (
              <tr key={u.id} className="border-b border-slate-800 hover:bg-white/[0.02] transition-colors">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-amber-400 font-bold border border-slate-700">
                      {u.avatar || u.username[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-white">{u.name || u.username}</p>
                      <p className="text-xs text-slate-500">@{u.username}</p>
                    </div>
                  </div>
                </td>
                <td className="p-4">
                  <span
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 w-max ${u.role === 'admin'
                      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      : u.role === 'editor'
                        ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        : 'bg-slate-800 text-slate-300 border border-slate-700'
                      }`}
                  >
                    {u.role === 'admin' && <Shield size={12} />}
                    {roleLabel(u.role)}
                  </span>
                </td>
                <td className="p-4">
                  <span className="flex items-center gap-2 text-xs">
                    <span
                      className={`w-2 h-2 rounded-full ${u.status === 'active' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-slate-600'
                        }`}
                    ></span>
                    <span className={u.status === 'active' ? 'text-slate-300' : 'text-slate-500'}>
                      {u.status === 'active' ? 'Đang hoạt động' : 'Đã khóa'}
                    </span>
                  </span>
                </td>
                <td className="p-4">
                  <div className="flex flex-col">
                    <span className="text-white font-medium">{u.totalArticles || 0} bài</span>
                    <span className="text-xs text-slate-500">{u.publishedArticles || 0} đã xuất bản</span>
                  </div>
                </td>
                <td className="p-4 text-right">
                  <button
                    onClick={() => openEditUserModal(u)}
                    className="p-2 text-slate-400 hover:text-white"
                    title="Sửa tài khoản"
                    aria-label={`Sửa ${u.name || u.username}`}
                  >
                    <Edit size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAddUserModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-white">Thêm thành viên</h3>
              <button onClick={() => setShowAddUserModal(false)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAddUser} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Họ và tên</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ví dụ: Nguyễn Minh Anh"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Tên đăng nhập</label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="editor_john"
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Mật khẩu</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Vai trò</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="editor">Biên tập viên (quản lý nội dung riêng)</option>
                  <option value="author">Tác giả (tạo bài viết)</option>
                  <option value="admin">Quản trị viên (toàn quyền)</option>
                </select>
              </div>
              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-white"
                >
                  Hủy
                </button>
                <LuxuryButton type="submit" className="py-2 px-5 text-xs">
                  Tạo tài khoản
                </LuxuryButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditUserModal && editingUser && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-white">Chỉnh sửa thành viên</h3>
              <button
                onClick={() => setShowEditUserModal(false)}
                className="text-slate-400 hover:text-white"
                title="Đóng"
                aria-label="Đóng cửa sổ sửa thành viên"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleEditUser} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Họ và tên</label>
                <input
                  type="text"
                  value={editUserName}
                  onChange={(e) => setEditUserName(e.target.value)}
                  placeholder="Ví dụ: Nguyễn Minh Anh"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Vai trò</label>
                <select
                  value={editUserRole}
                  onChange={(e) => setEditUserRole(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="editor">Biên tập viên (quản lý nội dung riêng)</option>
                  <option value="author">Tác giả (tạo bài viết)</option>
                  <option value="admin">Quản trị viên (toàn quyền)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Trạng thái</label>
                <select
                  value={editUserStatus}
                  onChange={(e) => setEditUserStatus(e.target.value === 'inactive' ? 'inactive' : 'active')}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="active">Đang hoạt động</option>
                  <option value="inactive">Tạm khóa</option>
                </select>
                {editUserStatus === 'inactive' && (
                  <p className="mt-2 text-xs text-amber-400/80">
                    Tài khoản bị khóa sẽ mất quyền truy cập ngay từ yêu cầu tiếp theo.
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Ảnh đại diện / ký tự</label>
                <input
                  type="text"
                  value={editUserAvatar}
                  onChange={(e) => setEditUserAvatar(e.target.value)}
                  placeholder="Không bắt buộc — để trống sẽ dùng chữ cái đầu của tên"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>
              <p className="text-xs text-slate-500">
                Mật khẩu được quản lý riêng. Dùng lệnh đặt lại tài khoản quản trị khi cần khôi phục truy cập.
              </p>
              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowEditUserModal(false)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-white"
                >
                  Hủy
                </button>
                <LuxuryButton type="submit" disabled={savingEditUser} className="py-2 px-5 text-xs">
                  {savingEditUser ? 'Đang lưu…' : 'Lưu thay đổi'}
                </LuxuryButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );

  // Affiliate Links Management
  const LinksView = () => (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">Chiến dịch affiliate cũ</h2>
          <p className="text-slate-400 text-sm">Quản lý liên kết theo dõi, trang đích, hoa hồng và thời hạn cookie của các chiến dịch trước đây.</p>
        </div>
      </div>

      <form onSubmit={handleAddAffiliateLink} className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl space-y-4 backdrop-blur-sm">
        <h3 className="text-white font-medium flex items-center gap-2">
          <Plus size={18} className="text-amber-400" /> Thêm chiến dịch affiliate
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Tên chiến dịch / nền tảng *</label>
            <input
              type="text"
              value={newAffName}
              onChange={(e) => setNewAffName(e.target.value)}
              placeholder="Ví dụ: Gian hàng Shopee chính hãng..."
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Liên kết theo dõi affiliate *</label>
            <input
              type="url"
              value={newAffUrl}
              onChange={(e) => handleCheckAffUrl(e.target.value)}
              placeholder="https://binance.com/en/register?ref=123"
              required
              className={`w-full bg-slate-950 border rounded-xl px-3.5 py-2 text-xs transition-colors ${affUrlBlacklistError?.isError
                ? 'border-rose-500 bg-rose-500/10 text-rose-300 focus:outline-none'
                : 'border-slate-800 text-white'
                }`}
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Trang sản phẩm gốc (dùng lấy dữ liệu)</label>
            <input
              type="url"
              value={newAffProductUrl}
              onChange={(e) => setNewAffProductUrl(e.target.value)}
              placeholder="https://binance.com hoặc https://scalenut.com"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-cyan-300 font-mono"
            />
            <p className="text-[10px] text-slate-500 mt-1">Trang chủ sản phẩm không chứa ref code dùng để Jina AI cào dữ liệu làm nguyên liệu viết bài.</p>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Mức hoa hồng & thời hạn cookie</label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={newAffCommission}
                onChange={(e) => setNewAffCommission(e.target.value)}
                placeholder="Ví dụ: 10%"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
              />
              <input
                type="text"
                value={newAffCookie}
                onChange={(e) => setNewAffCookie(e.target.value)}
                placeholder="Ví dụ: 30 ngày"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>
          </div>
        </div>

        {affUrlBlacklistError?.isError && (
          <div className="text-xs text-rose-400 font-bold bg-rose-500/10 border border-rose-500/30 p-3 rounded-xl flex items-start gap-2 animate-in fade-in">
            <AlertTriangle size={18} className="shrink-0 text-rose-400 mt-0.5" />
            <div>
              <p>🛑 Không thể thêm link! Domain <strong>{affUrlBlacklistError.matchedDomain}</strong> (Dự án: {affUrlBlacklistError.projectName}) đã nằm trong Blacklist.</p>
              <p className="text-[11px] font-normal text-rose-300/80 mt-0.5">Lý do: {affUrlBlacklistError.reason}</p>
            </div>
          </div>
        )}

        <LuxuryButton
          type="submit"
          disabled={affUrlBlacklistError?.isError}
          className={`py-2 text-xs ${affUrlBlacklistError?.isError ? 'opacity-40 cursor-not-allowed' : ''}`}
        >
          Lưu chiến dịch affiliate
        </LuxuryButton>
      </form>

      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-950/50 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-800">
              <th className="p-4 font-medium">Tên chiến dịch</th>
              <th className="p-4 font-medium">Hoa hồng</th>
              <th className="p-4 font-medium">Thời hạn cookie</th>
              <th className="p-4 font-medium">Tổng lượt nhấp</th>
              <th className="p-4 font-medium">Liên kết theo dõi</th>
              <th className="p-4 font-medium text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {affiliateLinksList.map((link) => (
              <tr key={link.id} className="border-b border-slate-800 hover:bg-white/[0.02] transition-colors">
                <td className="p-4 font-medium text-white">
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{link.name}</span>
                    {link.status === 'blacklisted' && (
                      <span className="bg-rose-500/10 text-rose-400 text-[10px] font-bold px-2 py-0.5 rounded border border-rose-500/20">
                        ĐÃ CHẶN
                      </span>
                    )}
                    {link.status === 'inactive' && (
                      <span className="bg-slate-500/10 text-slate-400 text-[10px] font-bold px-2 py-0.5 rounded border border-slate-600/40">
                        TẠM DỪNG
                      </span>
                    )}
                  </div>
                  {link.productUrl && (
                    <span className="text-[11px] text-cyan-400 font-mono truncate max-w-[180px] block opacity-80 mt-0.5">
                      🌐 {link.productUrl}
                    </span>
                  )}
                </td>
                <td className="p-4">
                  <span className="text-emerald-400 font-medium bg-emerald-400/10 px-2.5 py-1 rounded-md text-xs border border-emerald-400/20">
                    {link.commission || 'N/A'}
                  </span>
                </td>
                <td className="p-4 text-amber-400 text-xs flex items-center gap-1.5">
                  <Clock size={14} /> {link.cookie || '30 ngày'}
                </td>
                <td className="p-4">
                  <span className="text-sky-400 font-medium bg-sky-400/10 px-2.5 py-1 rounded-md text-xs border border-sky-400/20 inline-flex items-center gap-1">
                    <MousePointerClick size={13} /> {(link.clickCount || link.click_count || 0).toLocaleString()}
                  </span>
                </td>
                <td className="p-4 max-w-[200px]">
                  <code className="text-xs text-slate-400 bg-slate-950 px-2 py-1 rounded truncate block border border-slate-800 font-mono">
                    {link.baseUrl}
                  </code>
                </td>
                <td className="p-4 text-right flex justify-end gap-2 items-center">
                  <button
                    onClick={() => handleQuickBlacklist(link.id, link.name)}
                    className="p-1.5 text-xs bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-lg flex items-center gap-1 font-semibold transition-colors"
                    title="Đưa vào danh sách chặn"
                  >
                    <ShieldAlert size={14} /> Chặn
                  </button>
                  <button onClick={() => handleDeleteAffiliateLink(link.id)} className="p-2 text-slate-400 hover:text-red-400" title="Xóa chiến dịch">
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  // Link & Blacklist Management Center
  const BlacklistView = () => {
    const filteredBlacklist = blacklistList.filter((b) => {
      const q = blSearchQuery.toLowerCase();
      return (
        (b.projectName || '').toLowerCase().includes(q) ||
        (b.extractedDomain || '').toLowerCase().includes(q) ||
        (b.reason || '').toLowerCase().includes(q)
      );
    });

    return (
      <div className="space-y-6 animate-in fade-in duration-500 pb-10">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">
              <ShieldAlert size={26} className="text-rose-500" /> Link Management & Blacklist Interceptor
            </h2>
            <p className="text-slate-400 text-sm">
              Tự động bóc tách Domain gốc, đánh chặn link lừa đảo/bùng hoa hồng thời gian thực và làm sạch dữ liệu bài viết.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowImportSheetModal(true)}
              className="px-4 py-2.5 rounded-xl font-bold text-xs bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/20 flex items-center gap-2 transition-all cursor-pointer"
            >
              <FileSpreadsheet size={16} /> 📥 Nạp Cả Sheet Google (Tự Động 100%)
            </button>
            <button
              type="button"
              disabled={isReSweeping}
              onClick={handleReSweepBlacklist}
              title="Re-run the blacklist sweep and restore campaigns no longer blocked"
              aria-label="Re-run the blacklist sweep and restore campaigns no longer blocked"
              className="px-4 py-2.5 rounded-xl font-bold text-xs bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/20 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw size={16} className={isReSweeping ? 'animate-spin' : ''} />
              {isReSweeping ? 'Re-sweeping…' : 'Re-sweep blacklist'}
            </button>
            <LuxuryButton onClick={() => setShowAddBlacklistModal(true)} className="py-2.5 px-4 text-xs">
              <Plus size={16} /> Thêm Domain Cấm
            </LuxuryButton>
          </div>
        </div>

        {/* Sub-Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-800/80 pb-3">
          <button
            type="button"
            onClick={() => setActiveBlacklistTab('repository')}
            className={`px-4 py-2 rounded-xl font-semibold text-xs transition-all flex items-center gap-2 ${activeBlacklistTab === 'repository'
              ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
              }`}
          >
            <ShieldAlert size={16} /> Tab 1: Danh sách Blacklist ({blacklistList.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveBlacklistTab('rules')}
            className={`px-4 py-2 rounded-xl font-semibold text-xs transition-all flex items-center gap-2 ${activeBlacklistTab === 'rules'
              ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
              }`}
          >
            <Sliders size={16} /> Tab 2: Cấu hình Quy tắc Chặn
          </button>
        </div>

        {activeBlacklistTab === 'repository' && (
          <div className="space-y-4">
            {/* Search Filter */}
            <div className="flex items-center justify-between gap-4 bg-slate-900/50 border border-slate-800 p-4 rounded-2xl backdrop-blur-sm">
              <div className="relative flex-1 max-w-md">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={blSearchQuery}
                  onChange={(e) => setBlSearchQuery(e.target.value)}
                  placeholder="Tìm kiếm theo tên dự án, domain, lý do..."
                  className="w-full bg-slate-950 border border-slate-700/50 rounded-xl pl-10 pr-4 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                />
              </div>
              <span className="text-xs text-slate-500 font-mono">Hiển thị {filteredBlacklist.length} / {blacklistList.length} domain cấm</span>
            </div>

            {/* Table */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-950/50 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-800">
                    <th className="p-4 font-medium">Tên Dự Án & URL Gốc</th>
                    <th className="p-4 font-medium">Root Domain Tự Bóc Tách</th>
                    <th className="p-4 font-medium">Quy Tắc</th>
                    <th className="p-4 font-medium">Lý Do Chặn</th>
                    <th className="p-4 font-medium">Quốc Gia Giới Hạn</th>
                    <th className="p-4 font-medium text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="text-xs">
                  {filteredBlacklist.length > 0 ? (
                    filteredBlacklist.map((item) => (
                      <tr key={item.id} className="border-b border-slate-800 hover:bg-white/[0.02] transition-colors">
                        <td className="p-4">
                          <p className="font-bold text-white">{item.projectName || 'Chưa đặt tên'}</p>
                          <span className="text-slate-500 font-mono text-[11px] truncate max-w-[200px] block">{item.websiteUrl}</span>
                        </td>
                        <td className="p-4">
                          <span className="bg-rose-500/10 text-rose-400 border border-rose-500/30 px-2.5 py-1 rounded-md font-mono font-bold">
                            {item.extractedDomain}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${item.matchType === 'domain' ? 'bg-purple-500/10 text-purple-300 border border-purple-500/20' : 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/20'}`}>
                            {item.matchType === 'domain' ? 'Domain Wildcard' : 'Exact URL'}
                          </span>
                        </td>
                        <td className="p-4 text-slate-300 max-w-[220px]">
                          {item.reason}
                        </td>
                        <td className="p-4">
                          <div className="flex flex-wrap gap-1 max-w-[180px]">
                            {item.blockedCountries && item.blockedCountries.length > 0 ? (
                              item.blockedCountries.map((c: string, idx: number) => (
                                <span key={idx} className="bg-slate-800 text-slate-300 border border-slate-700 text-[10px] px-1.5 py-0.5 rounded">
                                  {c}
                                </span>
                              ))
                            ) : (
                              <span className="text-slate-500 text-[10px]">Tất cả quốc gia</span>
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-right">
                          <button onClick={() => handleDeleteBlacklist(item.id)} className="p-2 text-slate-400 hover:text-rose-400" title="Xóa khỏi Blacklist">
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-500">
                        Chưa có domain cấm nào trong Blacklist. Bấm "Nạp Cả Sheet Google" để nạp tự động toàn bộ!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeBlacklistTab === 'rules' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm space-y-3">
              <div className="flex items-center gap-2 text-amber-400 font-bold">
                <ShieldAlert size={20} />
                <h3>Quy Tắc 1: Chặn Theo Domain (Khuyên Dùng)</h3>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Khi thêm domain (ví dụ: <code className="text-amber-300">badsite.com</code>), hệ thống sẽ tự động bóc tách root domain và đánh chặn tất cả các link con như <code className="text-slate-300">badsite.com/register</code>, <code className="text-slate-300">sub.badsite.com</code>.
              </p>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs text-emerald-400 font-mono">
                ✓ Trạng thái: Đang hoạt động tự động 100%
              </div>
            </div>

            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm space-y-3">
              <div className="flex items-center gap-2 text-cyan-400 font-bold">
                <Sliders size={20} />
                <h3>Quy Tắc 2: Chặn Chính Xác URL (Exact Match)</h3>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Chỉ chặn chính xác đường dẫn cụ thể được khai báo trong hệ thống. Thích hợp khi 1 trang cụ thể bị lỗi nhưng toàn bộ domain gốc vẫn hoạt động bình thường.
              </p>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs text-cyan-400 font-mono">
                ✓ Trạng thái: Hỗ trợ tùy chọn khi thêm thủ công
              </div>
            </div>
          </div>
        )}

        {/* Modal Nạp Tự Động Từ Google Sheet URL */}
        {showImportSheetModal && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-lg shadow-2xl space-y-4">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <FileSpreadsheet size={20} className="text-cyan-400" /> Nạp Tự Động Toàn Bộ 1 Sheet Google
                </h3>
                <button onClick={() => setShowImportSheetModal(false)} className="text-slate-400 hover:text-white">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Đường Dẫn Google Sheet (Public / Cho phép xem) *
                  </label>
                  <input
                    type="url"
                    value={importSheetUrl}
                    onChange={(e) => setImportSheetUrl(e.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/d/1HNAJ6F.../edit#gid=802654639"
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-cyan-300 font-mono focus:outline-none focus:border-cyan-500"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    💡 Hệ thống sẽ tự động bóc tách file CSV từ Google Sheet, đọc từng hàng, bóc tách root domain và lưu hàng loạt vào MongoDB.
                  </p>
                </div>

                <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800/80 text-xs text-slate-400 space-y-1">
                  <p className="text-slate-200 font-bold">Cấu trúc các cột tự động nhận diện:</p>
                  <p>• Cột A: Tên Dự Án (ví dụ: NordVPN)</p>
                  <p>• Cột B: Website URL (ví dụ: https://nordvpn.com)</p>
                  <p>• Cột C: Lý do cấm (ví dụ: Bắt Ads - Không trả tiền)</p>
                  <p>• Cột H: Quốc gia cấm (ví dụ: Bồ Đào Nha, Ba Lan...)</p>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowImportSheetModal(false)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-white"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={isImportingSheet}
                  onClick={handleImportGoogleSheetUrl}
                  className="px-5 py-2.5 rounded-xl font-bold text-xs bg-cyan-500 text-slate-950 hover:bg-cyan-400 transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-cyan-500/20"
                >
                  {isImportingSheet ? (
                    <>
                      <div className="w-4 h-4 rounded-full border-2 border-slate-950 border-t-transparent animate-spin"></div>
                      <span>Đang nạp toàn bộ Sheet...</span>
                    </>
                  ) : (
                    <>
                      <Upload size={16} /> Bắt Đầu Nạp Nhanh 100%
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Thêm Domain Blacklist Thủ Công */}
        {showAddBlacklistModal && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-lg shadow-2xl">
              <div className="flex justify-between items-center mb-4 border-b border-slate-800 pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <ShieldAlert size={18} className="text-rose-500" /> Thêm Domain / Link Vào Blacklist
                </h3>
                <button onClick={() => setShowAddBlacklistModal(false)} className="text-slate-400 hover:text-white">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleSaveBlacklist} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Tên Dự Án / Platform Name</label>
                  <input
                    type="text"
                    value={blProjectName}
                    onChange={(e) => setBlProjectName(e.target.value)}
                    placeholder="e.g. NordVPN, Scalenut..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Website URL Hoặc Domain Cấm *</label>
                  <input
                    type="text"
                    value={blWebsiteUrl}
                    onChange={(e) => setBlWebsiteUrl(e.target.value)}
                    placeholder="https://badsite.com/register hoặc badsite.com"
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-rose-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Lý Do Chặn *</label>
                  <input
                    type="text"
                    value={blReason}
                    onChange={(e) => setBlReason(e.target.value)}
                    placeholder="Bắt Ads - Không trả tiền, Sàn lừa đảo..."
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Quốc Gia Bị Giới Hạn / Cấm</label>
                  <input
                    type="text"
                    value={blBlockedCountries}
                    onChange={(e) => setBlBlockedCountries(e.target.value)}
                    placeholder="Phân cách bằng dấu phẩy: Bồ Đào Nha, Ba Lan, Đức..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Quy Tắc Đánh Chặn</label>
                  <select
                    value={blMatchType}
                    onChange={(e: any) => setBlMatchType(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
                  >
                    <option value="domain">Chặn Toàn Bộ Root Domain & Subdomain (Wildcard)</option>
                    <option value="exact_url">Chặn Chính Xác URL Này</option>
                  </select>
                </div>
                <div className="pt-2 flex justify-end gap-3">
                  <button type="button" onClick={() => setShowAddBlacklistModal(false)} className="px-4 py-2 text-xs text-slate-400 hover:text-white">
                    Hủy
                  </button>
                  <LuxuryButton type="submit" className="py-2 px-5 text-xs bg-rose-600 hover:bg-rose-500 text-white">
                    Lưu Vào Blacklist & Sweeper Ngầm
                  </LuxuryButton>
                </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );

  };

  // Categories & Sub-Categories View
  const CategoriesView = () => (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">Danh mục sản phẩm</h2>
          <p className="text-slate-400 text-sm">Sắp xếp danh mục chính, danh mục phụ, đường dẫn và thông tin SEO.</p>
        </div>
        <LuxuryButton
          onClick={() => {
            setEditingCategoryObj(null);
            setCatName(''); setCatSlug(''); setCatDesc(''); setCatMetaTitle(''); setCatMetaDesc('');
            setCatHomepageImageUrl(''); setCatShowOnHomepage(false); setCatNavOrder('0');
            setShowCategoryModal(true);
          }}
        >
          <Plus size={18} /> Thêm danh mục chính
        </LuxuryButton>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {categoriesList.map((cat: any) => (
          <div key={cat.id} className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm space-y-4">
            <div className="flex justify-between items-start border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400">
                  <FolderTree size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-white">{cat.name}</h3>
                    <span className="bg-slate-800 text-amber-300 text-xs px-2.5 py-0.5 rounded-full font-mono">
                      /{cat.slug}
                    </span>
                    {cat.showOnHomepage && <span className="bg-emerald-400/10 text-emerald-400 text-[10px] px-2 py-0.5 rounded-full font-bold">Header #{Number(cat.navOrder || 0) + 1}</span>}
                  </div>
                  {cat.description && <p className="text-xs text-slate-400 mt-1">{cat.description}</p>}
                  {(cat.metaTitle || cat.metaDescription) && (
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-emerald-400">
                      <Sparkles size={12} /> Đã cấu hình thông tin SEO
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setEditingSubCategoryObj(null);
                    setSubCatParentId(cat.id);
                    setSubCatName(''); setSubCatSlug(''); setSubCatDesc(''); setSubCatMetaTitle(''); setSubCatMetaDesc('');
                    setShowSubCategoryModal(true);
                  }}
                  className="px-3 py-1.5 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 rounded-lg text-xs font-semibold hover:bg-cyan-500/20 flex items-center gap-1.5 transition-all"
                >
                  <Plus size={14} /> Thêm danh mục phụ
                </button>
                <button
                  onClick={() => {
                    setEditingCategoryObj(cat);
                    setCatName(cat.name || '');
                    setCatSlug(cat.slug || '');
                    setCatDesc(cat.description || '');
                    setCatMetaTitle(cat.metaTitle || '');
                    setCatMetaDesc(cat.metaDescription || '');
                    setCatHomepageImageUrl(cat.homepageImageUrl || '');
                    setCatShowOnHomepage(Boolean(cat.showOnHomepage));
                    setCatNavOrder(String(cat.navOrder ?? 0));
                    setShowCategoryModal(true);
                  }}
                  className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                  title="Sửa danh mục"
                >
                  <Edit size={16} />
                </button>
                <button
                  onClick={() => handleDeleteCategory(cat.id)}
                  className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                  title="Xóa danh mục"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            {/* Sub-categories List */}
            <div className="pl-4 pt-2">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Layers size={14} className="text-cyan-400" /> Danh mục phụ ({cat.subCategories?.length || 0})
              </h4>
              {cat.subCategories && cat.subCategories.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {cat.subCategories.map((sub: any) => (
                    <div
                      key={sub.id}
                      className="flex items-center justify-between p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 hover:border-slate-700 transition-colors"
                    >
                      <div className="overflow-hidden">
                        <p className="text-sm font-medium text-slate-200 truncate">{sub.name}</p>
                        <p className="text-[11px] text-slate-500 font-mono truncate">/{sub.slug}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setEditingSubCategoryObj(sub);
                            setSubCatParentId(cat.id);
                            setSubCatName(sub.name || '');
                            setSubCatSlug(sub.slug || '');
                            setSubCatDesc(sub.description || '');
                            setSubCatMetaTitle(sub.metaTitle || '');
                            setSubCatMetaDesc(sub.metaDescription || '');
                            setShowSubCategoryModal(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-white"
                        >
                          <Edit size={14} />
                        </button>
                        <button onClick={() => handleDeleteSubCategory(sub.id)} className="p-1.5 text-slate-400 hover:text-red-400">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-600 italic">Danh mục {cat.name} chưa có mục phụ. Hãy bấm “Thêm danh mục phụ” để tạo.</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Main Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="flex justify-between items-center mb-4 border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <FolderTree size={20} className="text-amber-400" />
                {editingCategoryObj ? 'Sửa danh mục chính' : 'Thêm danh mục chính'}
              </h3>
              <button onClick={() => setShowCategoryModal(false)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSaveCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Tên danh mục *</label>
                <input
                  type="text"
                  value={catName}
                  onChange={(e) => {
                    setCatName(e.target.value);
                    if (!catSlug || !editingCategoryObj) {
                      setCatSlug(e.target.value.toLowerCase().trim().replace(/\s+/g, '-'));
                    }
                  }}
                  placeholder="e.g. Quỹ Đầu Tư REITs"
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Đường dẫn URL *</label>
                <input
                  type="text"
                  value={catSlug}
                  onChange={(e) => setCatSlug(e.target.value)}
                  placeholder="quy-dau-tu-reits"
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-amber-500 font-mono text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Mô tả</label>
                <textarea
                  rows={2}
                  value={catDesc}
                  onChange={(e) => setCatDesc(e.target.value)}
                  placeholder="Category overview..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[.04] p-4 space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <div><p className="text-xs font-bold text-emerald-400">Hiển thị trên storefront</p><p className="mt-0.5 text-[11px] text-slate-500">Dùng danh mục này trong header và khối danh mục homepage.</p></div>
                  <input type="checkbox" checked={catShowOnHomepage} onChange={(e) => setCatShowOnHomepage(e.target.checked)} className="h-4 w-4 accent-emerald-400" />
                </div>
                <div className="grid gap-3 sm:grid-cols-[1fr_100px]">
                  <div><label className="block text-[11px] font-semibold text-slate-400 mb-1">Ảnh đại diện homepage</label><input type="url" value={catHomepageImageUrl} onChange={(e) => setCatHomepageImageUrl(e.target.value)} placeholder="https://media.example.com/category.webp" className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white" /></div>
                  <div><label className="block text-[11px] font-semibold text-slate-400 mb-1">Thứ tự</label><input type="number" min="0" value={catNavOrder} onChange={(e) => setCatNavOrder(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white" /></div>
                </div>
              </div>
              <div className="border-t border-slate-800 pt-3 space-y-3">
                <p className="text-xs font-bold text-amber-400 flex items-center gap-1"><Sparkles size={14} /> Thông tin SEO danh mục</p>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Tiêu đề SEO</label>
                  <input
                    type="text"
                    value={catMetaTitle}
                    onChange={(e) => setCatMetaTitle(e.target.value)}
                    placeholder="Tối ưu SEO tiêu đề danh mục..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Mô tả SEO</label>
                  <textarea
                    rows={2}
                    value={catMetaDesc}
                    onChange={(e) => setCatMetaDesc(e.target.value)}
                    placeholder="Mô tả SEO danh mục..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white resize-none"
                  />
                </div>
              </div>
              <div className="pt-2 flex justify-end gap-3">
                <button type="button" onClick={() => setShowCategoryModal(false)} className="px-4 py-2 text-xs text-slate-400 hover:text-white">
                  Hủy
                </button>
                <LuxuryButton type="submit" className="py-2 px-5 text-xs">
                  Lưu danh mục
                </LuxuryButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sub-Category Modal */}
      {showSubCategoryModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="flex justify-between items-center mb-4 border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Layers size={20} className="text-cyan-400" />
                {editingSubCategoryObj ? 'Sửa danh mục phụ' : 'Thêm danh mục phụ'}
              </h3>
              <button onClick={() => setShowSubCategoryModal(false)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSaveSubCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Danh mục cha *</label>
                <select
                  value={subCatParentId}
                  onChange={(e) => setSubCatParentId(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="">Chọn danh mục cha...</option>
                  {categoriesList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Tên danh mục phụ *</label>
                <input
                  type="text"
                  value={subCatName}
                  onChange={(e) => {
                    setSubCatName(e.target.value);
                    if (!subCatSlug || !editingSubCategoryObj) {
                      setSubCatSlug(e.target.value.toLowerCase().trim().replace(/\s+/g, '-'));
                    }
                  }}
                  placeholder="e.g. Crypto Staking"
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Đường dẫn URL *</label>
                <input
                  type="text"
                  value={subCatSlug}
                  onChange={(e) => setSubCatSlug(e.target.value)}
                  placeholder="crypto-staking"
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-amber-500 font-mono text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Mô tả</label>
                <textarea
                  rows={2}
                  value={subCatDesc}
                  onChange={(e) => setSubCatDesc(e.target.value)}
                  placeholder="Sub-category overview..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>
              <div className="border-t border-slate-800 pt-3 space-y-3">
                <p className="text-xs font-bold text-cyan-400 flex items-center gap-1"><Sparkles size={14} /> Thông tin SEO danh mục phụ</p>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Tiêu đề SEO</label>
                  <input
                    type="text"
                    value={subCatMetaTitle}
                    onChange={(e) => setSubCatMetaTitle(e.target.value)}
                    placeholder="Mô tả SEO tiêu đề sub-category..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Mô tả SEO</label>
                  <textarea
                    rows={2}
                    value={subCatMetaDesc}
                    onChange={(e) => setSubCatMetaDesc(e.target.value)}
                    placeholder="Mô tả SEO sub-category..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white resize-none"
                  />
                </div>
              </div>
              <div className="pt-2 flex justify-end gap-3">
                <button type="button" onClick={() => setShowSubCategoryModal(false)} className="px-4 py-2 text-xs text-slate-400 hover:text-white">
                  Hủy
                </button>
                <LuxuryButton type="submit" className="py-2 px-5 text-xs">
                  Lưu danh mục phụ
                </LuxuryButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );

  // Settings & SEO / GEO / Theme View
  const SettingsView = () => (
    <form onSubmit={handleSaveSettings} className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="flex justify-between items-end border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">Cấu hình website</h2>
          <p className="text-slate-400 text-sm">Tùy chỉnh nhận diện, giao diện, thông tin tìm kiếm và dữ liệu dành cho công cụ AI.</p>
        </div>
        <LuxuryButton type="submit" className="py-2.5 px-6">
          <CheckCircle2 size={18} /> Lưu toàn bộ cấu hình
        </LuxuryButton>
      </div>

      {/* Sub-tab Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-800/80 pb-3">
        <button
          type="button"
          onClick={() => setSettingsSection('appearance')}
          className={`px-4 py-2 rounded-xl font-semibold text-xs transition-all flex items-center gap-2 ${settingsSection === 'appearance'
            ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
            : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
            }`}
        >
          <Palette size={16} /> Giao diện & màu sắc
        </button>
        <button
          type="button"
          onClick={() => setSettingsSection('seo_geo')}
          className={`px-4 py-2 rounded-xl font-semibold text-xs transition-all flex items-center gap-2 ${settingsSection === 'seo_geo'
            ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
            : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
            }`}
        >
          <Globe size={16} /> SEO & dữ liệu AI
        </button>
      </div>

      {settingsSection === 'appearance' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 animate-in fade-in duration-300">
          {/* Theme & Palette */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm space-y-5">
            <h3 className="text-white font-medium flex items-center gap-2 border-b border-slate-800 pb-3">
              <Palette size={18} className="text-amber-400" /> Bảng màu giao diện
            </h3>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-2">Mẫu màu có sẵn</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { name: 'Đá phiến & hổ phách (mặc định)', primary: '#0f172a', accent: '#f59e0b', mode: 'dark' },
                  { name: 'Xanh ngọc công nghệ', primary: '#064e3b', accent: '#10b981', mode: 'dark' },
                  { name: 'Xanh lam sapphire', primary: '#1e3a8a', accent: '#3b82f6', mode: 'dark' },
                  { name: 'Đỏ ruby', primary: '#881337', accent: '#f43f5e', mode: 'dark' },
                  { name: 'Cam hoàng hôn', primary: '#7c2d12', accent: '#f97316', mode: 'dark' },
                ].map((p) => (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => setSettingsData({ ...settingsData, primaryColor: p.primary, accentColor: p.accent, themeMode: p.mode })}
                    className="p-3 bg-slate-950 border border-slate-800 rounded-xl hover:border-amber-500/50 text-left transition-all group"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-4 h-4 rounded-full border border-white/20 shadow" style={{ backgroundColor: p.primary }}></span>
                      <span className="w-4 h-4 rounded-full border border-white/20 shadow" style={{ backgroundColor: p.accent }}></span>
                    </div>
                    <p className="text-[11px] font-semibold text-slate-300 group-hover:text-amber-400 transition-colors">{p.name}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Màu chính (Hex)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={settingsData?.primaryColor || '#0f172a'}
                    onChange={(e) => setSettingsData({ ...settingsData, primaryColor: e.target.value })}
                    className="w-10 h-10 rounded-lg cursor-pointer bg-slate-950 border border-slate-700"
                  />
                  <input
                    type="text"
                    value={settingsData?.primaryColor || '#0f172a'}
                    onChange={(e) => setSettingsData({ ...settingsData, primaryColor: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Màu nhấn / nút hành động (Hex)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={settingsData?.accentColor || '#f59e0b'}
                    onChange={(e) => setSettingsData({ ...settingsData, accentColor: e.target.value })}
                    className="w-10 h-10 rounded-lg cursor-pointer bg-slate-950 border border-slate-700"
                  />
                  <input
                    type="text"
                    value={settingsData?.accentColor || '#f59e0b'}
                    onChange={(e) => setSettingsData({ ...settingsData, accentColor: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Chế độ giao diện</label>
                <select
                  value={settingsData?.themeMode || 'dark'}
                  onChange={(e) => setSettingsData({ ...settingsData, themeMode: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2.5 text-xs text-white"
                >
                  <option value="dark">Tối cao cấp (mặc định)</option>
                  <option value="light">Sáng</option>
                  <option value="emerald">Xanh ngọc</option>
                  <option value="amber">Vàng hổ phách</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Phông chữ</label>
                <select
                  value={settingsData?.fontFamily || 'Inter'}
                  onChange={(e) => setSettingsData({ ...settingsData, fontFamily: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2.5 text-xs text-white"
                >
                  <option value="Inter">Inter (hiện đại, gọn gàng)</option>
                  <option value="Roboto">Roboto (không chân cổ điển)</option>
                  <option value="Outfit">Outfit (hình học hiện đại)</option>
                  <option value="Plus Jakarta Sans">Plus Jakarta Sans</option>
                </select>
              </div>
            </div>
          </div>

          {/* Branding & Visual Assets */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm space-y-5">
            <h3 className="text-white font-medium flex items-center gap-2 border-b border-slate-800 pb-3">
              <Layout size={18} className="text-cyan-400" /> Nhận diện & hình ảnh thương hiệu
            </h3>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">URL logo đầu trang</label>
              <input
                type="text"
                value={settingsData?.logoUrl || ''}
                onChange={(e) => setSettingsData({ ...settingsData, logoUrl: e.target.value })}
                placeholder="https://example.com/logo.png (để trống sẽ dùng logo chữ)"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-xs text-white"
              />
              {settingsData?.logoUrl && (
                <div className="mt-2 p-2 bg-slate-950 rounded-lg border border-slate-800 flex items-center gap-2">
                  <span className="text-[10px] text-slate-500">Xem trước:</span>
                  <img src={settingsData.logoUrl} alt="Xem trước logo" className="h-6 object-contain" />
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">URL biểu tượng favicon</label>
              <input
                type="text"
                value={settingsData?.faviconUrl || ''}
                onChange={(e) => setSettingsData({ ...settingsData, faviconUrl: e.target.value })}
                placeholder="https://example.com/favicon.ico"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Nội dung thông báo đầu trang</label>
              <input
                type="text"
                value={settingsData?.bannerText || ''}
                onChange={(e) => setSettingsData({ ...settingsData, bannerText: e.target.value })}
                placeholder="🔥 Nhập thông báo hiển thị ở thanh đầu trang..."
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Bản quyền & giới thiệu cuối trang</label>
              <textarea
                rows={2}
                value={settingsData?.footerText || ''}
                onChange={(e) => setSettingsData({ ...settingsData, footerText: e.target.value })}
                placeholder="© 2026 GoodPick. Bảo lưu mọi quyền..."
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-xs text-white resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">CSS tùy chỉnh cho nhà phát triển</label>
              <textarea
                rows={3}
                value={settingsData?.customCss || ''}
                onChange={(e) => setSettingsData({ ...settingsData, customCss: e.target.value })}
                placeholder="/* Kiểu CSS bổ sung */ .custom-class { color: red; }"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-xs text-emerald-400 font-mono resize-none"
              />
            </div>
          </div>
        </div>
      )}

      {settingsSection === 'seo_geo' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 animate-in fade-in duration-300">
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm space-y-5">
            <h3 className="text-white font-medium flex items-center gap-2 border-b border-slate-800 pb-3">
              <Globe size={18} className="text-amber-400" /> Thông tin tìm kiếm cốt lõi (SEO)
            </h3>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">Tiêu đề toàn website</label>
              <input
                type="text"
                value={settingsData?.siteTitle || ''}
                onChange={(e) => setSettingsData({ ...settingsData, siteTitle: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-amber-500 shadow-inner text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">Mô tả SEO</label>
              <textarea
                rows={3}
                value={settingsData?.metaDescription || ''}
                onChange={(e) => setSettingsData({ ...settingsData, metaDescription: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-amber-500 shadow-inner resize-none text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2">Nhóm từ khóa mục tiêu</label>
              <input
                type="text"
                value={settingsData?.focusKeywords || ''}
                onChange={(e) => setSettingsData({ ...settingsData, focusKeywords: e.target.value })}
                placeholder="ưu đãi công nghệ, đồ gia dụng, dụng cụ làm vườn, hướng dẫn mua sắm"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-xs text-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2">Tên miền chuẩn (canonical)</label>
                <input
                  type="text"
                  value={settingsData?.canonicalUrl || ''}
                  onChange={(e) => setSettingsData({ ...settingsData, canonicalUrl: e.target.value })}
                  placeholder="https://goodpick.vn"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2">URL ảnh chia sẻ mạng xã hội</label>
                <input
                  type="text"
                  value={settingsData?.ogImageUrl || ''}
                  onChange={(e) => setSettingsData({ ...settingsData, ogImageUrl: e.target.value })}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                />
              </div>
            </div>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm space-y-5">
            <h3 className="text-white font-medium flex items-center gap-2 border-b border-slate-800 pb-3">
              <MapPin size={18} className="text-cyan-400" /> Dữ liệu khu vực & trình thu thập AI
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2">Ngôn ngữ (hreflang)</label>
                <select
                  value={settingsData?.hreflang || 'en-US'}
                  onChange={(e) => setSettingsData({ ...settingsData, hreflang: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2.5 text-xs text-white"
                >
                  <option value="en-US">Tiếng Anh (en-US)</option>
                  <option value="vi-VN">Tiếng Việt (vi-VN)</option>
                  <option value="ja-JP">Tiếng Nhật (ja-JP)</option>
                  <option value="de-DE">Tiếng Đức (de-DE)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2">Mã quốc gia mục tiêu</label>
                <input
                  type="text"
                  value={settingsData?.geoTarget || 'GLOBAL'}
                  onChange={(e) => setSettingsData({ ...settingsData, geoTarget: e.target.value })}
                  placeholder="US, VN, DE, GLOBAL"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Mã khu vực (geo.region)</label>
                <input
                  type="text"
                  value={settingsData?.geoRegionName || 'US-NY'}
                  onChange={(e) => setSettingsData({ ...settingsData, geoRegionName: e.target.value })}
                  placeholder="US-NY or VN-HN"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Tên thành phố (geo.placename)</label>
                <input
                  type="text"
                  value={settingsData?.geoPlacename || 'New York'}
                  onChange={(e) => setSettingsData({ ...settingsData, geoPlacename: e.target.value })}
                  placeholder="New York or Hanoi"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Vĩ độ</label>
                <input
                  type="number"
                  step="any"
                  value={settingsData?.geoLatitude || 40.7128}
                  onChange={(e) => setSettingsData({ ...settingsData, geoLatitude: parseFloat(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Kinh độ</label>
                <input
                  type="number"
                  step="any"
                  value={settingsData?.geoLongitude || -74.0060}
                  onChange={(e) => setSettingsData({ ...settingsData, geoLongitude: parseFloat(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Mã đo lường Google Analytics (GA4)</label>
              <input
                type="text"
                value={settingsData?.googleAnalyticsId || ''}
                onChange={(e) => setSettingsData({ ...settingsData, googleAnalyticsId: e.target.value })}
                placeholder="G-XXXXXXXXXX"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono"
              />
              <p className="text-[11px] text-slate-500 mt-1">Lấy Measurement ID từ Google Analytics 4 (Admin &gt; Data Streams). Để trống để tắt tracking.</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Google Search Console Verification</label>
              <input
                type="text"
                value={settingsData?.googleSiteVerification || ''}
                onChange={(e) => setSettingsData({ ...settingsData, googleSiteVerification: e.target.value })}
                placeholder="Chuỗi content của thẻ meta google-site-verification"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Search Console &gt; Settings &gt; Ownership verification &gt; HTML tag — chỉ dán giá trị <code>content=&quot;...&quot;</code>, hệ thống tự render thẻ meta.
              </p>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-medium text-slate-400">Dữ liệu có cấu trúc JSON-LD</label>
                <button
                  type="button"
                  onClick={generateDefaultSchemaJsonLd}
                  className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1 font-semibold"
                >
                  <Sparkles size={12} /> Tự tạo dữ liệu mẫu
                </button>
              </div>
              <textarea
                rows={4}
                value={settingsData?.schemaJsonld || ''}
                onChange={(e) => setSettingsData({ ...settingsData, schemaJsonld: e.target.value })}
                placeholder='{"@context": "https://schema.org", "@type": "Organization", ...}'
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-xs text-amber-300 font-mono resize-none"
              />
            </div>
          </div>
        </div>
      )}
    </form>
  );

  // Subscribers Management & Lead Export View
  const SubscribersView = () => {
    const filteredSubscribers = subscribersList.filter((s) =>
      s.email.toLowerCase().includes(subscriberSearchQuery.toLowerCase().trim())
    );

    const exportToCsv = () => {
      if (subscribersList.length === 0) {
        alert('Chưa có người đăng ký để xuất dữ liệu.');
        return;
      }
      const headers = ['ID', 'Email Address', 'Subscription Status', 'Subscribed Date', 'Last Digest'];
      const rows = subscribersList.map((s) => [
        s.id,
        `"${s.email}"`,
        `"${s.status || 'active'}"`,
        `"${s.subscribedAt || ''}"`,
        `"${s.lastDigestAt || ''}"`,
      ]);
      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `subscribers_leads_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };

    return (
      <div className="space-y-6 animate-in fade-in duration-500 pb-10">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">Người đăng ký nhận tin</h2>
            <p className="text-slate-400 text-sm">Quản lý người đọc, trạng thái xác nhận, bản tin hằng ngày và yêu cầu hủy đăng ký.</p>
          </div>
          <LuxuryButton onClick={exportToCsv} className="py-2.5 px-5">
            <Download size={18} /> Xuất danh sách (.CSV)
          </LuxuryButton>
        </div>

        {/* Daily dispatch control */}
        <section className="relative overflow-hidden rounded-2xl border border-amber-500/20 bg-[#0b0b0e] shadow-[0_20px_70px_rgba(0,0,0,0.28)]">
          <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-amber-300 via-amber-500 to-transparent" />
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_auto] gap-6 p-6 sm:p-7">
            <div>
              <div className="flex flex-wrap items-center gap-3 mb-5">
                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-400">
                  <Radio size={11} className="animate-pulse" /> Gửi tự động hằng ngày
                </span>
                <span className="text-xs font-mono text-slate-500">00:00 GMT+12 · tổng hợp ngày trước đó</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-600">Người nhận</p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums text-white">{(subscribersStats?.totalSubscribers || 0).toLocaleString()}</p>
                  <p className="text-xs text-slate-500">Đang hoạt động và đã xác nhận</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-600">Chờ xác nhận</p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums text-amber-300">{(subscribersStats?.pendingCount || 0).toLocaleString()}</p>
                  <p className="text-xs text-slate-500">Chưa được nhận bản tin</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-600">Lần gửi gần nhất</p>
                  <p className="mt-2 text-sm font-mono text-slate-200">
                    {subscribersStats?.lastDispatchAt
                      ? new Date(subscribersStats.lastDispatchAt).toLocaleString()
                      : 'Chưa gửi bản tin nào'}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex flex-col justify-center xl:items-end gap-3 xl:border-l xl:border-slate-800 xl:pl-7">
              <LuxuryButton
                onClick={handleSendInsiderDigestNow}
                disabled={sendingInsiderDigest || !(subscribersStats?.totalSubscribers > 0)}
                className="min-w-[210px] py-3 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {sendingInsiderDigest
                  ? <><Loader2 size={16} className="animate-spin" /> Đang gửi bản tin...</>
                  : <><Send size={16} /> Gửi bản tin ngay</>}
              </LuxuryButton>
              <p className="max-w-[260px] text-[11px] leading-relaxed text-slate-500 xl:text-right">Gửi ngay bản tổng hợp hôm nay. Lịch gửi tự động tiếp theo vẫn được giữ nguyên.</p>
            </div>
          </div>
          {insiderDispatchNotice && (
            <div
              className={`border-t px-6 py-3 text-xs font-medium ${insiderDispatchNotice.type === 'success'
                ? 'border-emerald-500/20 bg-emerald-500/[0.07] text-emerald-300'
                : 'border-rose-500/20 bg-rose-500/[0.07] text-rose-300'
              }`}
              role="status"
              aria-live="polite"
            >
              {insiderDispatchNotice.text}
            </div>
          )}
        </section>

        {/* Lead KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard title="Mới hôm nay" value={(subscribersStats?.countToday || 0).toLocaleString()} icon={Sparkles} subtext="Đã xác nhận trong ngày" />
          <StatCard title="Mới trong tuần" value={(subscribersStats?.countThisWeek || 0).toLocaleString()} icon={TrendingUp} subtext="Đã xác nhận trong 7 ngày" />
          <StatCard title="Đã hủy đăng ký" value={(subscribersStats?.unsubscribedCount || 0).toLocaleString()} icon={X} subtext="Không còn nhận bản tin" />
        </div>

        {/* Search Bar */}
        <div className="flex items-center justify-between gap-4 bg-slate-900/50 border border-slate-800 p-4 rounded-2xl backdrop-blur-sm">
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={subscriberSearchQuery}
              onChange={(e) => setSubscriberSearchQuery(e.target.value)}
              placeholder="Tìm theo địa chỉ email..."
              className="w-full bg-slate-950 border border-slate-700/50 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
            />
          </div>
          <span className="text-xs text-slate-500 font-mono">Hiển thị {filteredSubscribers.length}/{subscribersList.length} người</span>
        </div>

        {/* Subscribers Table */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950/50 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-800">
                <th className="p-4 font-medium">Email người đăng ký</th>
                <th className="p-4 font-medium">Ngày đăng ký</th>
                <th className="p-4 font-medium">Trạng thái</th>
                <th className="p-4 font-medium text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {filteredSubscribers.length > 0 ? (
                filteredSubscribers.map((sub: any) => (
                  <tr key={sub.id} className="border-b border-slate-800 hover:bg-white/[0.02] transition-colors">
                    <td className="p-4 font-medium text-white flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                        <Mail size={16} />
                      </div>
                      <span className="font-mono text-sm">{sub.email}</span>
                    </td>
                    <td className="p-4 text-xs text-slate-400 font-mono">
                      {sub.subscribedAt ? new Date(sub.subscribedAt).toLocaleString() : 'N/A'}
                    </td>
                    <td className="p-4">
                      <span
                        className={`text-xs font-semibold px-2.5 py-1 rounded-full border flex items-center gap-1.5 w-max ${
                          sub.status === 'active'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : sub.status === 'unsubscribed'
                              ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                              : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        }`}
                        title={sub.lastDigestAt
                          ? `Bản tin gần nhất: ${new Date(sub.lastDigestAt).toLocaleString()}`
                          : `Trạng thái email: ${sub.emailStatus || 'đã gửi'}`}
                      >
                        {sub.status === 'active'
                          ? <CheckCircle2 size={12} />
                          : sub.status === 'unsubscribed'
                            ? <X size={12} />
                            : <Clock size={12} />}
                        {sub.status === 'active'
                          ? 'Đang hoạt động'
                          : sub.status === 'unsubscribed'
                            ? 'Đã hủy đăng ký'
                            : 'Chờ xác nhận'}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button onClick={() => handleDeleteSubscriber(sub.id)} className="p-2 text-slate-400 hover:text-red-400" title="Xóa người đăng ký">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-500 text-sm">
                    Không tìm thấy người đăng ký phù hợp với “{subscriberSearchQuery}”.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderContent = () => {

    if (activeTab === 'dashboard') return <DashboardView />;
    if (activeTab === 'products') return <ProductManager categories={categoriesList} />;
    if (activeTab === 'stores' && currentUser.role === 'admin') return <StoreManager categories={categoriesList} />;
    if (activeTab === 'insights' && currentUser.role === 'admin') return <InsightsView />;
    if (activeTab === 'subscribers' && currentUser.role === 'admin') return <SubscribersView />;
    // CategoriesView is declared inside this dashboard and reads the parent's form
    // state. Calling it as a render helper keeps the modal inputs mounted while a
    // keystroke updates that state; rendering <CategoriesView /> would create a new
    // component type on every dashboard render and drop input focus after each key.
    if (activeTab === 'categories' && currentUser.role === 'admin') return CategoriesView();
    if (activeTab === 'users' && currentUser.role === 'admin') return <UsersView />;
    if (activeTab === 'links' && currentUser.role === 'admin') return <LinksView />;
    if (activeTab === 'blacklist' && currentUser.role === 'admin') return <BlacklistView />;
    if (activeTab === 'settings' && currentUser.role === 'admin') return <SettingsView />;

    // D-13: a known admin-only tab reached by a non-admin (e.g. via URL) renders the
    // permission contract — never the generic "Under Construction..." placeholder and
    // never another user's data. UI hiding is cosmetic; the backing routes keep their
    // 403 (proven by tests/api/cms-rbac-affiliate-403.test.ts).
    if (currentUser.role !== 'admin' && ADMIN_ONLY_TABS.has(activeTab)) {
      return (
        <div className="flex flex-col items-center justify-center h-64 gap-3 text-center">
          <div className="flex items-center gap-2 text-rose-400">
            <ShieldAlert size={20} />
            <span className="text-sm font-bold">Không có quyền truy cập</span>
          </div>
          <p className="text-slate-400 text-sm">Tài khoản của bạn không được phép mở khu vực này.</p>
          <button
            onClick={() => navigate({ tab: 'products' })}
            className="text-xs font-bold text-rose-400 hover:text-rose-300 underline underline-offset-4"
          >
            Quay lại sản phẩm
          </button>
        </div>
      );
    }

    return <div className="text-slate-500 flex items-center justify-center h-64 text-sm">Tính năng đang được hoàn thiện...</div>;
  };

  const NavItem = ({ id, icon: Icon, label, requiredRole }: any) => {
    if (requiredRole && currentUser.role !== requiredRole) return null;
    const isActive = activeTab === id;
    return (
      <button
        onClick={() => navigate({ tab: id })}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 font-medium text-sm cursor-pointer ${isActive
          ? 'bg-gradient-to-r from-amber-500/15 to-transparent text-amber-400 border border-amber-500/20 shadow-[0_0_15px_rgba(251,191,36,0.05)]'
          : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
          }`}
      >
        <Icon size={18} className={isActive ? 'text-amber-400' : 'text-slate-500'} /> {label}
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-[#060608] font-sans selection:bg-amber-500/30 text-slate-300">
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-cyan-900/10 blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-amber-900/10 blur-[120px]"></div>
      </div>

        <div className="relative z-10 flex h-screen overflow-hidden">
          {/* Sidebar */}
          <aside className="w-64 bg-[#0a0a0c]/80 backdrop-blur-xl border-r border-slate-800/60 flex flex-col shadow-2xl">
            <div className="h-20 flex items-center px-6 border-b border-slate-800/60">
              <Link href="/" className="text-xl font-bold tracking-tighter text-white flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-300 to-yellow-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
                  <span className="text-slate-900 font-bold text-lg">G</span>
                </div>
                GOOD<span className="text-emerald-400 font-light">PICK</span> <span className="text-[9px] tracking-widest text-slate-500">CMS</span>
              </Link>
            </div>

            <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto custom-scrollbar">
              <NavItem id="dashboard" icon={LayoutDashboard} label="Tổng quan kinh doanh" />
              <div className="pt-4 pb-2 px-4 text-[10px] font-bold text-slate-600 uppercase tracking-widest">Nội dung bán hàng</div>
              <NavItem id="products" icon={Package} label="Sản phẩm & ưu đãi" />
              <NavItem id="stores" icon={Tag} label="Store & coupon" requiredRole="admin" />

              {currentUser.role === 'admin' && (
                <>
                  <NavItem id="insights" icon={TrendingUp} label="Phân tích SEO" requiredRole="admin" />
                  <div className="pt-4 pb-2 px-4 text-[10px] font-bold text-slate-600 uppercase tracking-widest">Vận hành hệ thống</div>
                  <NavItem id="subscribers" icon={Mail} label="Người đăng ký" requiredRole="admin" />
                  <NavItem id="categories" icon={FolderTree} label="Danh mục sản phẩm" requiredRole="admin" />
                  <NavItem id="users" icon={Users} label="Tài khoản & phân quyền" requiredRole="admin" />
                  <NavItem id="blacklist" icon={ShieldAlert} label="An toàn liên kết" requiredRole="admin" />
                  <NavItem id="links" icon={LinkIcon} label="Link affiliate cũ" requiredRole="admin" />
                  <NavItem id="settings" icon={Settings} label="Cấu hình website" requiredRole="admin" />
                </>
              )}
            </nav>

            <div className="p-4 border-t border-slate-800/60 bg-slate-950/30">
              <div className="flex items-center gap-3 px-4 py-3 bg-slate-900/80 rounded-xl border border-slate-800">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-yellow-600 text-slate-950 flex items-center justify-center font-bold shadow-inner">
                  {currentUser.avatar || currentUser.username[0].toUpperCase()}
                </div>
                <div className="flex-1 overflow-hidden">
                  <p className="text-sm font-medium text-white truncate">{currentUser.name || currentUser.username}</p>
                  <p className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">{roleLabel(currentUser.role)}</p>
                </div>
              </div>
            </div>
          </aside>

          {/* Main Area */}
          <main className="flex-1 flex flex-col overflow-hidden">
            <header className="h-20 bg-[#0a0a0c]/50 backdrop-blur-md border-b border-slate-800/60 flex items-center justify-between px-8 relative z-20">
              <div className="flex items-center gap-4 text-slate-400 w-1/2">
                <div className="relative w-full max-w-md hidden md:block">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Tìm sản phẩm, store hoặc thành viên..."
                    className="w-full bg-slate-900/50 border border-slate-700/50 rounded-full pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-amber-500 transition-colors shadow-inner"
                  />
                </div>
              </div>

              <div className="flex items-center gap-6">
                <Link href="/" target="_blank" className="text-xs text-slate-400 hover:text-amber-400 flex items-center gap-1">
                  Xem website <Globe size={14} />
                </Link>
                <div className="w-px h-6 bg-slate-800"></div>
                <button onClick={handleLogout} className="text-slate-400 hover:text-red-400 p-2 rounded-full hover:bg-red-400/10 transition-colors" title="Đăng xuất">
                  <LogOut size={18} />
                </button>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
              <div className="max-w-7xl mx-auto">{renderContent()}</div>
            </div>
          </main>
        </div>

      {/* D-03: shared auth-fetch toast. Error toasts persist until dismissed
          (rose border); success auto-dismisses (~3s). A 401 clears the token
          and offers a Sign in action. */}
      {cmsToast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-5 right-5 z-[60] max-w-sm break-words rounded-2xl border px-5 py-3 text-xs shadow-2xl flex items-start gap-3 ${
            cmsToast.type === 'success'
              ? 'bg-slate-900 text-white border-emerald-500/40'
              : 'bg-slate-900 text-white border-rose-500/50'
          }`}
        >
          {cmsToast.type === 'success' ? (
            <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle size={16} className="text-rose-400 shrink-0 mt-0.5" />
          )}
          <div className="flex-1 min-w-0">
            <p className="leading-relaxed">{cmsToast.text}</p>
            {cmsToast.showSignIn && (
              <Link
                href="/admin/login"
                className="mt-1.5 inline-block font-bold text-amber-400 hover:text-amber-300"
              >
                Đăng nhập lại
              </Link>
            )}
          </div>
          <button
            type="button"
            onClick={() => setCmsToast(null)}
            aria-label="Dismiss notification"
            className="text-slate-500 hover:text-white shrink-0"
          >
            <X size={14} />
          </button>
        </div>
      )}

    </div>
  );
}
