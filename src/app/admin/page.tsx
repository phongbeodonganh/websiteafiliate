'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { sanitizeArticleContent } from '@/lib/sanitize';
import { generateObjectId } from '@/lib/utils';
import { cmsFetch, errorMessageForResponse } from '@/lib/cms-fetch';
import { ARTICLE_CONTENT_TYPES, isArticleContentType, articleContentTypeLabel, type ArticleContentType } from '@/lib/article-content-types';
import RichTextEditor from '@/components/admin/RichTextEditor';
import {
  LayoutDashboard,
  FileText,
  Link as LinkIcon,
  Settings,
  User,
  LogOut,
  Plus,
  Edit,
  Trash2,
  Eye,
  BarChart3,
  TrendingUp,
  MousePointerClick,
  CheckCircle2,
  CircleDashed,
  Globe,
  Search,
  ChevronRight,
  Image as ImageIcon,
  Users,
  Trophy,
  Activity,
  ArrowUpRight,
  DollarSign,
  Clock,
  Shield,
  MapPin,
  Share2,
  Code,
  X,
  Sparkles,
  Tag,
  Star,
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
} from 'lucide-react';

// D-13: the admin-only CMS tab ids. Used both by `renderContent` (permission-denied
// fallback for a non-admin that reaches one via URL) and as the single source of
// truth for which tabs only an admin may see. Every backing route keeps its 403 —
// this set is a UI contract, not the access control.
const ADMIN_ONLY_TABS = new Set(['insights', 'subscribers', 'categories', 'users', 'links', 'blacklist', 'settings']);

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
                aria-label={`About ${title}`}
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
  formatValue = (v: number) => v.toLocaleString('en-US'),
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
    return <p className="text-slate-500 text-xs py-8 text-center">Not enough data to display this chart.</p>;
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
  const [articlesList, setArticlesList] = useState<any[]>([]);
  const [articleTypeFilter, setArticleTypeFilter] = useState('all');
  const [editingArticle, setEditingArticle] = useState<any>(null);
  const [previewArticle, setPreviewArticle] = useState<any>(null);
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

  // Category & Subcategory Modal States
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategoryObj, setEditingCategoryObj] = useState<any>(null);
  const [catName, setCatName] = useState('');
  const [catSlug, setCatSlug] = useState('');
  const [catDesc, setCatDesc] = useState('');
  const [catMetaTitle, setCatMetaTitle] = useState('');
  const [catMetaDesc, setCatMetaDesc] = useState('');

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

  // AI Auto Article Generator States
  const [showAiGenerateModal, setShowAiGenerateModal] = useState(false);
  const [aiModalCampaign, setAiModalCampaign] = useState<any>(null);
  const [aiModalTopic, setAiModalTopic] = useState('');
  const [aiModalBaseUrl, setAiModalBaseUrl] = useState('');
  const [aiModalProductUrl, setAiModalProductUrl] = useState('');
  const [aiModalLanguage, setAiModalLanguage] = useState<'vi-VN' | 'en-US'>('vi-VN');
  const [aiModalApiKey, setAiModalApiKey] = useState('');
  const [isGeneratingAiArticle, setIsGeneratingAiArticle] = useState(false);

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
  const [blReason, setBlReason] = useState('Unpaid commissions');
  const [blBlockedCountries, setBlBlockedCountries] = useState('Portugal, Croatia, Poland, Belgium, Germany');
  const [blMatchType, setBlMatchType] = useState<'domain' | 'exact_url'>('domain');
  const [blSearchQuery, setBlSearchQuery] = useState('');

  // Settings Sub-Tab
  const [settingsSection, setSettingsSection] = useState<'appearance' | 'seo_geo' | 'code'>('appearance');

  const router = useRouter();
  const searchParams = useSearchParams();

  // FE-01: Đồng bộ state điều hướng (tab / bài đang sửa / bài đang preview) vào
  // query string, để nút Back/Forward trình duyệt lùi lại đúng từng bước UI thay
  // vì thoát hẳn khỏi /admin.
  const buildAdminUrl = (tab: string, editId?: string, previewId?: string) => {
    const params = new URLSearchParams();
    if (tab !== 'dashboard') params.set('tab', tab);
    if (editId) params.set('edit', editId);
    if (previewId) params.set('preview', previewId);
    const qs = params.toString();
    return qs ? `/admin?${qs}` : '/admin';
  };

  const navigate = (
    next: { tab?: string; editingArticle?: any; previewArticle?: any },
    options: { replace?: boolean } = {}
  ) => {
    const tab = next.tab ?? activeTab;
    const nextEditing = 'editingArticle' in next ? next.editingArticle : null;
    const nextPreview = 'previewArticle' in next ? next.previewArticle : null;

    setActiveTab(tab);
    setEditingArticle(nextEditing);
    setPreviewArticle(nextPreview);

    const url = buildAdminUrl(
      tab,
      nextEditing ? nextEditing.id || 'new' : undefined,
      nextPreview?.id
    );
    if (options.replace) router.replace(url, { scroll: false });
    else router.push(url, { scroll: false });
  };

  // Restore Draft state từ URL khi bấm Back/Forward (hoặc khi mở thẳng link có sẵn
  // query string). Chạy sau mọi navigate() ở trên cũng vô hại vì lúc đó state
  // local đã khớp URL sẵn rồi (early-return bên dưới).
  useEffect(() => {
    const urlTab = searchParams.get('tab') || 'dashboard';
    const urlEditId = searchParams.get('edit');
    const urlPreviewId = searchParams.get('preview');

    const currentEditId = editingArticle ? editingArticle.id || 'new' : null;
    const currentPreviewId = previewArticle?.id || null;

    if (urlTab === activeTab && urlEditId === currentEditId && urlPreviewId === currentPreviewId) {
      return;
    }

    setActiveTab(urlTab);

    if (urlEditId === 'new') {
      setEditingArticle({});
    } else if (urlEditId) {
      const found = articlesList.find((a) => a.id === urlEditId);
      if (found) setEditingArticle(found);
      // Chưa tìm thấy (articlesList chưa load xong) — giữ nguyên, effect sẽ chạy
      // lại khi articlesList cập nhật (đã có trong dependency array).
    } else {
      setEditingArticle(null);
    }

    if (urlPreviewId) {
      const found = articlesList.find((a) => a.id === urlPreviewId);
      if (found) setPreviewArticle(found);
    } else {
      setPreviewArticle(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, articlesList]);

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

    fetch('/api/v1/cms/articles', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => d.status === 'success' && setArticlesList(d.data));

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
        alert(`Added "${data.data.extractedDomain}" to the blacklist.\nUpdated ${data.data.sweep?.totalUpdatedLinks || 0} affected campaigns.`);
        setShowAddBlacklistModal(false);
        setBlProjectName('');
        setBlWebsiteUrl('');
        loadAllData();
      } else {
        alert(`Error: ${data.message}`);
      }
    } catch {
      alert('Unable to add this domain to the blacklist.');
    }
  };

  const handleQuickBlacklist = async (campaignId: string, campaignName: string) => {
    const reasonPrompt = prompt(`Add campaign "${campaignName}" to the blacklist?\nEnter a reason (e.g. unpaid commissions):`, 'Unpaid commissions');
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
        alert(`Campaign "${campaignName}" was added to the blacklist (domain: ${data.data.domainBlacklisted}).\nUpdated ${data.data.sweptCount} campaigns.`);
        loadAllData();
      } else {
        alert(`Error: ${data.message}`);
      }
    } catch {
      alert('Unable to blacklist this campaign.');
    }
  };

  const handleDeleteBlacklist = async (id: string) => {
    if (!confirm('Remove this domain or URL from the blacklist?')) return;
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`/api/v1/cms/blacklist?id=${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) loadAllData();
    } catch {
      alert('Unable to remove this entry from the blacklist.');
    }
  };

  const handleImportGoogleSheetUrl = async () => {
    if (!importSheetUrl) {
      showCmsToast('error', 'Paste a public Google Sheet URL to import.');
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
        `Imported ${n} domain${n === 1 ? '' : 's'} from the Google Sheet. The retroactive sweep is running in the background — affected campaigns will appear as blacklisted shortly.`
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
        showCmsToast('success', 'Re-sweep complete. No campaigns needed changing.');
      } else {
        showCmsToast(
          'success',
          `Re-sweep complete. Swept ${swept} campaign${swept === 1 ? '' : 's'} to blacklisted; restored ${restored} campaign${restored === 1 ? '' : 's'} to active.`
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
      { projectName: 'dozarplati', websiteUrl: 'https://dozarplati.com/', reason: 'Unpaid commissions' },
      { projectName: 'NordVPN', websiteUrl: 'https://nordvpn.com', reason: 'Unpaid commissions' },
      { projectName: 'finbo', websiteUrl: 'https://www.finbo.pl/', reason: 'Unpaid commissions' },
      { projectName: 'nichescraper', websiteUrl: 'https://nichescraper.com/affiliate.php', reason: 'Unpaid commissions' },
      { projectName: 'alidropship', websiteUrl: 'https://affiliates.alidropship.com/', reason: 'Unpaid commissions' },
      { projectName: 'supergrosz', websiteUrl: 'https://supergrosz.pl/', reason: 'Unpaid commissions' },
      { projectName: 'smart pozyczka', websiteUrl: 'https://smartpozyczka.pl/', reason: 'Unpaid commissions' },
      { projectName: 'Hostinger', websiteUrl: 'https://hostinger.com/', reason: 'Unpaid commissions' },
      { projectName: 'flowxo', websiteUrl: 'https://flowxo.com/', reason: 'Unpaid commissions' },
      { projectName: 'Scalenut', websiteUrl: 'https://www.scalenut.com/', reason: 'Unpaid commissions' },
      { projectName: 'getresponse', websiteUrl: 'getresponse.com/vn/affiliate-programs', reason: 'Unpaid commissions' },
      { projectName: 'graphy', websiteUrl: 'https://graphy.com/partners', reason: 'Unpaid commissions' },
      { projectName: 'Liquidweb', websiteUrl: 'liquidweb.com', reason: 'Unpaid commissions' },
      { projectName: 'iPage', websiteUrl: 'https://www.ipage.com/', reason: 'Unpaid commissions' },
      { projectName: 'Pixpa', websiteUrl: 'https://www.pixpa.com/', reason: 'Unpaid commissions' },
      { projectName: 'Bluehost', websiteUrl: 'https://www.bluehost.com/', reason: 'Unpaid commissions' },
      { projectName: 'Semrush', websiteUrl: 'https://www.semrush.com/', reason: 'Unpaid commissions' },
      { projectName: 'Wix', websiteUrl: 'https://vi.wix.com/', reason: 'Unpaid commissions' },
      { projectName: 'Grammarly', websiteUrl: 'https://www.grammarly.com/', reason: 'Unpaid commissions' },
      { projectName: 'Teachable', websiteUrl: 'https://teachable.com/', reason: 'Unpaid commissions', blockedCountries: 'Portugal, Croatia, Poland, Belgium, Germany, Italy, Austria, Spain' },
    ];

    try {
      const res = await fetch('/api/v1/cms/blacklist/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ items: sampleSheetData }),
      });
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        alert(`Sample spreadsheet imported successfully.\nSaved ${data.data.totalImported} blocked domains and updated ${data.data.totalSweptCampaigns} campaigns.`);
        loadAllData();
      } else {
        alert(`Error: ${data.message}`);
      }
    } catch {
      alert('Unable to import the sample spreadsheet.');
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
    if (!confirm('Delete this subscriber?')) return;
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`/api/v1/cms/subscribers/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) loadSubscribersData();
    } catch (err) {
      alert('Unable to delete the subscriber.');
    }
  };

  const handleSendInsiderDigestNow = async () => {
    const activeRecipients = subscribersStats?.totalSubscribers || 0;
    if (activeRecipients === 0) {
      setInsiderDispatchNotice({ type: 'error', text: 'No active Insider recipients are available.' });
      return;
    }
    if (!confirm(`Send today's Insider digest to ${activeRecipients.toLocaleString('en-US')} active recipient${activeRecipients === 1 ? '' : 's'} now? This manual send will not replace or suppress the next scheduled cron digest.`)) return;

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
        throw new Error(payload.message || 'The digest could not be sent.');
      }

      const result = payload.data || {};
      const text = result.skipped === 'no_articles'
        ? 'No published articles are available for this digest.'
        : result.sent === 0
          ? 'No active Insider recipients were found when the dispatch started.'
          : `Digest sent to ${result.sent.toLocaleString('en-US')} Insider${result.sent === 1 ? '' : 's'} in ${result.batches.toLocaleString('en-US')} Resend batch${result.batches === 1 ? '' : 'es'}. The next scheduled cron digest remains active.`;
      setInsiderDispatchNotice({ type: 'success', text });
      loadSubscribersData();
    } catch (error) {
      setInsiderDispatchNotice({
        type: 'error',
        text: error instanceof Error ? error.message : 'The digest could not be sent.',
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
        alert('Team member added successfully.');
        setShowAddUserModal(false);
        setNewUsername('');
        setNewPassword('');
        setNewName('');
        loadUsersData();
      } else {
        alert(`Error: ${data.message}`);
      }
    } catch (err) {
      alert('Unable to add the team member.');
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

      showCmsToast('success', 'Team member updated.');
      setShowEditUserModal(false);
      setEditingUser(null);
      loadUsersData();
    } finally {
      setSavingEditUser(false);
    }
  };

  const handleOpenAiModal = (campaign?: any) => {
    if (campaign) {
      setAiModalCampaign(campaign);
      setAiModalTopic(`In-Depth Review of ${campaign.name} - Features and Pricing`);
      setAiModalBaseUrl(campaign.baseUrl || campaign.base_url || '');
      setAiModalProductUrl(campaign.productUrl || campaign.product_url || campaign.baseUrl || campaign.base_url || '');
    } else {
      setAiModalCampaign(null);
      setAiModalTopic('');
      setAiModalBaseUrl('');
      setAiModalProductUrl('');
    }
    setShowAiGenerateModal(true);
  };

  const handleSelectCampaignForAiModal = (campaignIdStr: string) => {
    if (!campaignIdStr) {
      setAiModalCampaign(null);
      setAiModalBaseUrl('');
      setAiModalProductUrl('');
      return;
    }
    const found = affiliateLinksList.find((c) => c.id === campaignIdStr || c._id === campaignIdStr);
    if (found) {
      setAiModalCampaign(found);
      setAiModalTopic(`In-Depth Review of ${found.name} - Features and Pricing`);
      setAiModalBaseUrl(found.baseUrl || found.base_url || '');
      setAiModalProductUrl(found.productUrl || found.product_url || found.baseUrl || found.base_url || '');
    }
  };

  const handleGenerateAiArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGeneratingAiArticle(true);
    const token = localStorage.getItem('token');
    try {
      const finalBaseUrl = aiModalBaseUrl || aiModalCampaign?.baseUrl || aiModalCampaign?.base_url;
      const finalProductUrl = aiModalProductUrl || aiModalCampaign?.productUrl || aiModalCampaign?.product_url || finalBaseUrl;

      const res = await fetch('/api/v1/cms/ai/generate-article', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          campaignId: aiModalCampaign?.id,
          customTopic: aiModalTopic,
          customProductUrl: finalProductUrl,
          customBaseUrl: finalBaseUrl,
          customName: aiModalCampaign?.name,
          language: aiModalLanguage,
          userApiKey: aiModalApiKey,
        }),
      });
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        alert(`Article generated successfully.\n\nTitle: "${data.data.title}"\nStatus: Draft\nProduct information was retrieved and links were checked against the blacklist.`);
        setShowAiGenerateModal(false);
        loadAllData();
        // Switch to Articles tab and open edit mode
        navigate({
          tab: 'articles',
          editingArticle: {
            id: data.data.articleId,
            title: data.data.title,
            slug: data.data.slug,
            content: data.data.content,
            excerpt: data.data.excerpt,
            metaTitle: data.data.seo_meta?.meta_title || '',
            metaDescription: data.data.seo_meta?.meta_description || '',
            focusKeyword: data.data.seo_meta?.focus_keywords?.[0] || '',
            keyTakeaways: Array.isArray(data.data.geo_data?.key_takeaways)
              ? data.data.geo_data.key_takeaways.join('\n')
              : data.data.geo_data?.key_takeaways || '',
            entities: Array.isArray(data.data.geo_data?.entities)
              ? data.data.geo_data.entities.join(', ')
              : data.data.geo_data?.entities || '',
            faqSchema: data.data.faqSchema || data.data.geo_data?.faq_list || [],
            faqSchemaJsonld: data.data.geo_data?.faq_schema_jsonld || '',
            status: 'draft',
          },
        });
      } else {
        alert(`Unable to generate the article: ${data.message}`);
      }
    } catch {
      alert('Unable to connect to the article generation service.');
    } finally {
      setIsGeneratingAiArticle(false);
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
        alert('Affiliate campaign added successfully.');
        setNewAffName('');
        setNewAffUrl('');
        setNewAffProductUrl('');
        loadAllData();
      } else {
        alert(data.message);
      }
    } catch (err) {
      alert('Unable to add the affiliate link.');
    }
  };

  const handleDeleteAffiliateLink = async (id: number) => {
    if (!confirm('Are you sure you want to delete this campaign?')) return;
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`/api/v1/cms/affiliate-links/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) loadAllData();
    } catch (err) {
      alert('Unable to delete the campaign.');
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
        alert('Settings saved successfully.');
      } else {
        alert(`Error: ${data.message}`);
      }
    } catch (err) {
      alert('Unable to save settings.');
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
        alert(editingCategoryObj?.id ? 'Category updated successfully.' : 'Category created successfully.');
        setShowCategoryModal(false);
        setEditingCategoryObj(null);
        setCatName(''); setCatSlug(''); setCatDesc(''); setCatMetaTitle(''); setCatMetaDesc('');
        loadAllData();
      } else {
        alert(`Error: ${data.message}`);
      }
    } catch (err) {
      alert('Unable to save the category.');
    }
  };

  const handleDeleteCategory = async (id: number) => {
    if (!confirm('Are you sure you want to delete this main category? Linked subcategories will be removed.')) return;
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`/api/v1/cms/categories/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) loadAllData();
    } catch (err) {
      alert('Unable to delete the category.');
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
        alert(editingSubCategoryObj?.id ? 'Subcategory updated successfully.' : 'Subcategory created successfully.');
        setShowSubCategoryModal(false);
        setEditingSubCategoryObj(null);
        setSubCatName(''); setSubCatSlug(''); setSubCatDesc(''); setSubCatMetaTitle(''); setSubCatMetaDesc('');
        loadAllData();
      } else {
        alert(`Error: ${data.message}`);
      }
    } catch (err) {
      alert('Failed to save subcategory');
    }
  };

  const handleDeleteSubCategory = async (id: number) => {
    if (!confirm('Are you sure you want to delete this subcategory?')) return;
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`/api/v1/cms/sub-categories/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) loadAllData();
    } catch (err) {
      alert('Error deleting subcategory');
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
          <span>Loading your workspace...</span>
        </div>
      </div>
    );
  }

  // --- VIEWS ---

  // Dashboard Overview
  // These helpers contain no hooks. Invoke them directly to keep the DOM stable
  // when a controlled field updates state in this page.
  const renderDashboardView = () => {
    const totalViews = dashboardData?.totalViews || 0;
    const totalClicks = dashboardData?.totalClicks || 0;
    const totalRevenue = dashboardData?.totalRevenue || 0;
    const conversionRate = dashboardData?.conversionRate || 0;
    const topArticles = dashboardData?.topArticles || [];
    const topEditors = dashboardData?.topEditors || [];

    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">
            {currentUser.role === 'admin' ? 'Global KPI Dashboard' : 'Personal Performance Overview'}
          </h2>
          <p className="text-slate-400 text-sm">Monitor traffic, click-through rates, and estimated commissions.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard title="Total Page Views" value={totalViews.toLocaleString('en-US')} icon={Eye} trend="+14.2%" subtext="vs last month" />
          <StatCard title="Affiliate Clicks" value={totalClicks.toLocaleString('en-US')} icon={MousePointerClick} trend="+9.5%" subtext="Verified tracking" />
          <StatCard title="Conversion CTR" value={`${conversionRate}%`} icon={Activity} trend="+1.4%" subtext="Global average" />
          <StatCard title="Est. Revenue" value={`$${totalRevenue.toLocaleString('en-US')}`} icon={DollarSign} trend="+18.7%" subtext="Pending audit" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Articles */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-white font-medium flex items-center gap-2">
                <Activity size={18} className="text-amber-400" /> Top-Performing Articles
              </h3>
              <button onClick={() => navigate({ tab: 'articles' })} className="text-xs text-amber-400 hover:text-amber-300">
                View All
              </button>
            </div>
            <div className="space-y-4 flex-1">
              {topArticles.map((article: any, idx: number) => (
                <div
                  key={article.id}
                  className="group flex items-center justify-between p-4 bg-slate-950/50 rounded-xl border border-slate-800/50 hover:border-amber-500/30 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${idx === 0
                        ? 'bg-amber-500/20 text-amber-400'
                        : idx === 1
                          ? 'bg-slate-300/20 text-slate-300'
                          : idx === 2
                            ? 'bg-amber-700/20 text-amber-600'
                            : 'bg-slate-800 text-slate-500'
                        }`}
                    >
                      #{idx + 1}
                    </div>
                    <div>
                      <p className="text-white text-sm font-medium line-clamp-1 group-hover:text-amber-400 transition-colors">
                        {article.title}
                      </p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Eye size={12} /> {article.viewCount?.toLocaleString('en-US')}
                        </span>
                        <span className="flex items-center gap-1 text-emerald-400/70">
                          <MousePointerClick size={12} /> {article.clicks?.toLocaleString('en-US')} clicks
                        </span>
                      </div>
                    </div>
                  </div>
                  <ArrowUpRight size={16} className="text-slate-600 group-hover:text-amber-400 transition-colors" />
                </div>
              ))}
            </div>
          </div>

          {/* Leaderboard (Admin Only) */}
          {currentUser.role === 'admin' ? (
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm flex flex-col relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-bl-full pointer-events-none"></div>
              <div className="flex items-center justify-between mb-6 relative z-10">
                <h3 className="text-white font-medium flex items-center gap-2">
                  <Trophy size={18} className="text-amber-400" /> Top Content Creators
                </h3>
              </div>
              <div className="space-y-4 flex-1 relative z-10">
                {topEditors.map((stat: any) => (
                  <div key={stat.user.id} className="flex flex-col p-4 bg-slate-950/50 rounded-xl border border-slate-800/50">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-yellow-600 text-slate-950 flex items-center justify-center font-bold shadow-inner">
                          {stat.user.avatar}
                        </div>
                        <div>
                          <p className="text-white text-sm font-medium">{stat.user.name}</p>
                          <p className="text-xs text-amber-400/80 uppercase tracking-wider">@{stat.user.username} ({stat.user.role})</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-emerald-400">{stat.clicks.toLocaleString('en-US')} Clicks</p>
                        <p className="text-xs text-slate-500">{stat.views.toLocaleString('en-US')} Views</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm flex flex-col justify-center items-center text-slate-400 text-center">
              <Shield size={48} className="text-amber-400/30 mb-3" />
              <p className="font-semibold text-white">Your Workspace</p>
              <p className="text-xs text-slate-500 max-w-xs mt-1">Your workspace includes only articles created by your account (@{currentUser.username}).</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  // SEO Insights View (GA4 + GSC)
  const renderInsightsView = () => {
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
            <h2 className="text-2xl font-bold text-white mb-1">SEO Insights</h2>
            <p className="text-slate-400 text-sm">Google Analytics 4 and Search Console data for the last {insightsDays} days.</p>
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
              <option value={7}>Last 7 days</option>
              <option value={28}>Last 28 days</option>
              <option value={90}>Last 90 days</option>
            </select>
            <button
              onClick={() => loadInsightsData(true)}
              disabled={insightsLoading}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs bg-slate-900 border border-slate-700 text-slate-300 hover:text-white hover:border-amber-500/40 transition-all disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw size={14} className={insightsLoading ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>
        </div>

        {insightsConfigured === false && (
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-6 flex items-start gap-4">
            <AlertTriangle size={24} className="text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-white font-semibold mb-1">Analytics integrations are not configured</p>
              <p className="text-slate-400 text-sm mb-2">
                Set the following environment variables on the server to connect your Google service account:
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
            <Loader2 size={18} className="animate-spin" /> Loading Google Analytics and Search Console data...
          </div>
        )}

        {insightsConfigured && insightsData && (
          <div className={`space-y-6 transition-opacity duration-200 ${insightsLoading ? 'opacity-50' : 'opacity-100'}`}>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <StatCard
                title={`Organic Clicks (${insightsDays}d)`}
                value={totals.clicks.toLocaleString('en-US')}
                icon={MousePointerClick}
                subtext="Google Search Console"
                info="The number of clicks to your site from organic Google search results. Paid search clicks are excluded."
              />
              <StatCard
                title={`Impressions (${insightsDays}d)`}
                value={totals.impressions.toLocaleString('en-US')}
                icon={Eye}
                subtext="Google Search Console"
                info="The number of times your pages appeared in Google search results. High impressions with few clicks may indicate an opportunity to improve titles, descriptions, or rankings."
              />
              <StatCard
                title="Avg. CTR"
                value={`${avgCtr.toFixed(2)}%`}
                icon={Activity}
                subtext="Clicks / Impressions"
                info="Click-through rate is clicks divided by impressions. A low rate may reflect search position or titles and descriptions that need improvement."
              />
              <StatCard
                title="Avg. Position"
                value={avgPosition.toFixed(1)}
                icon={Search}
                subtext="Average Position"
                info="The average position of your pages in Google search results. Position 1 is the highest ranking; lower numbers indicate better rankings."
              />
            </div>

            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm">
              <h3 className="text-white font-medium flex items-center gap-2 mb-5">
                <TrendingUp size={18} className="text-amber-400" /> Organic Performance Trend
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <p className="text-xs font-semibold text-amber-400/90 uppercase tracking-wider mb-2">Daily Clicks</p>
                  <TrendLineChart data={clicksSeries} color="#f59e0b" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-cyan-400/90 uppercase tracking-wider mb-2">Daily Impressions</p>
                  <TrendLineChart data={impressionsSeries} color="#22d3ee" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm">
                <h3 className="text-white font-medium flex items-center gap-2 mb-4">
                  <Search size={18} className="text-cyan-400" /> Quick-Win Keywords
                </h3>
                <p className="text-xs text-slate-500 mb-4">Queries ranking in positions 8–20 with high impressions. Optimize related pages to improve their chances of reaching the top 10.</p>
                <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
                  {quickWins.length > 0 ? quickWins.map((q: any, i: number) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-slate-950/50 rounded-xl border border-slate-800/50">
                      <div className="min-w-0">
                        <p className="text-white text-sm font-medium truncate">{q.query}</p>
                        <p className="text-xs text-slate-500 truncate">{q.page}</p>
                      </div>
                      <div className="text-right shrink-0 ml-3">
                        <p className="text-xs text-cyan-400 font-semibold">Pos. {q.position}</p>
                        <p className="text-[11px] text-slate-500">{q.impressions.toLocaleString('en-US')} impr.</p>
                      </div>
                    </div>
                  )) : (
                    <p className="text-slate-500 text-sm text-center py-8">No quick-win opportunities found for this period.</p>
                  )}
                </div>
              </div>

              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm">
                <h3 className="text-white font-medium flex items-center gap-2 mb-4">
                  <TrendingDown size={18} className="text-red-400" /> Content Decay Alerts
                </h3>
                <p className="text-xs text-slate-500 mb-4">Articles with more than a 20% drop in clicks compared with the previous {insightsDays} days. Consider reviewing and updating these articles.</p>
                <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
                  {decay.length > 0 ? decay.map((d: any, i: number) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-slate-950/50 rounded-xl border border-slate-800/50">
                      <p className="text-white text-sm font-medium truncate max-w-[60%]">{d.page}</p>
                      <div className="text-right shrink-0">
                        <p className="text-xs text-red-400 font-semibold">{d.changePercent}%</p>
                        <p className="text-[11px] text-slate-500">{d.clicksBefore} → {d.clicksAfter} clicks</p>
                      </div>
                    </div>
                  )) : (
                    <p className="text-slate-500 text-sm text-center py-8">No declining articles found for this period.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm">
              <h3 className="text-white font-medium flex items-center gap-2 mb-4">
                <MousePointerClick size={18} className="text-emerald-400" /> Traffic → Affiliate Click Funnel
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-slate-400 text-xs uppercase tracking-wider border-b border-slate-800">
                      <th className="p-3 font-medium">Article</th>
                      <th className="p-3 font-medium text-right">Pageviews (GA4)</th>
                      <th className="p-3 font-medium text-right">Affiliate Clicks</th>
                      <th className="p-3 font-medium text-right">CTR</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {funnel.length > 0 ? funnel.map((f: any, i: number) => (
                      <tr key={i} className="border-b border-slate-800/60 hover:bg-white/[0.02] transition-colors">
                        <td className="p-3 text-white">
                          <div className="max-w-xs truncate" title={f.articleTitle}>{f.articleTitle}</div>
                        </td>
                        <td className="p-3 text-slate-300 text-right font-mono">{f.pageviews.toLocaleString('en-US')}</td>
                        <td className="p-3 text-emerald-400/90 text-right font-mono">{f.affiliateClicks.toLocaleString('en-US')}</td>
                        <td className="p-3 text-amber-400 text-right font-mono">{f.clickThroughRate}%</td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-slate-500 text-sm">No funnel data available for this period.</td>
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
  const renderUsersView = () => (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">Team Management</h2>
          <p className="text-slate-400 text-sm">Manage team members, roles, and account access.</p>
        </div>
        <LuxuryButton onClick={() => setShowAddUserModal(true)}>
          <Plus size={18} /> Add New Team Member
        </LuxuryButton>
      </div>

      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-950/50 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-800">
              <th className="p-4 font-medium">User Profile</th>
              <th className="p-4 font-medium">Role</th>
              <th className="p-4 font-medium">Status</th>
              <th className="p-4 font-medium">Articles</th>
              <th className="p-4 font-medium text-right">Actions</th>
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
                    {u.role.toUpperCase()}
                  </span>
                </td>
                <td className="p-4">
                  <span className="flex items-center gap-2 text-xs">
                    <span
                      className={`w-2 h-2 rounded-full ${u.status === 'active' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-slate-600'
                        }`}
                    ></span>
                    <span className={u.status === 'active' ? 'text-slate-300' : 'text-slate-500'}>
                      {u.status === 'active' ? 'Active' : 'Inactive'}
                    </span>
                  </span>
                </td>
                <td className="p-4">
                  <div className="flex flex-col">
                    <span className="text-white font-medium">{u.totalArticles || 0} items</span>
                    <span className="text-xs text-slate-500">{u.publishedArticles || 0} published</span>
                  </div>
                </td>
                <td className="p-4 text-right">
                  <button
                    onClick={() => openEditUserModal(u)}
                    className="p-2 text-slate-400 hover:text-white"
                    title="Edit User"
                    aria-label={`Edit ${u.name || u.username}`}
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
              <h3 className="text-lg font-bold text-white">Add Team Member</h3>
              <button onClick={() => setShowAddUserModal(false)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAddUser} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Full Name</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. John Miller"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Username</label>
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
                <label className="block text-xs font-semibold text-slate-400 mb-1">Password</label>
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
                <label className="block text-xs font-semibold text-slate-400 mb-1">Role</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="editor">Editor</option>
                  <option value="author">Author</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>
              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <LuxuryButton type="submit" className="py-2 px-5 text-xs">
                  Add Team Member
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
              <h3 className="text-lg font-bold text-white">Edit team member</h3>
              <button
                onClick={() => setShowEditUserModal(false)}
                className="text-slate-400 hover:text-white"
                title="Close"
                aria-label="Close edit member dialog"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleEditUser} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Name</label>
                <input
                  type="text"
                  value={editUserName}
                  onChange={(e) => setEditUserName(e.target.value)}
                  placeholder="e.g. John Miller"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Role</label>
                <select
                  value={editUserRole}
                  onChange={(e) => setEditUserRole(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="editor">Editor</option>
                  <option value="author">Author</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Status</label>
                <select
                  value={editUserStatus}
                  onChange={(e) => setEditUserStatus(e.target.value === 'inactive' ? 'inactive' : 'active')}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
                {editUserStatus === 'inactive' && (
                  <p className="mt-2 text-xs text-amber-400/80">
                    Inactive users lose access immediately, including any existing sessions.
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Avatar</label>
                <input
                  type="text"
                  value={editUserAvatar}
                  onChange={(e) => setEditUserAvatar(e.target.value)}
                  placeholder="Optional — first letter of name or username is used when empty"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>
              <p className="text-xs text-slate-500">
                Passwords are managed outside the CMS. Use the reset-admin CLI to recover an account.
              </p>
              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowEditUserModal(false)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <LuxuryButton type="submit" disabled={savingEditUser} className="py-2 px-5 text-xs">
                  {savingEditUser ? 'Saving…' : 'Save changes'}
                </LuxuryButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );

  // Articles View & Editor Form
  const filteredArticles = articlesList.filter((art) => articleTypeFilter === 'all' || (articleTypeFilter === 'untagged' ? !art.contentType : art.contentType === articleTypeFilter));
  const renderArticlesView = () => (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">Article Management</h2>
          <p className="text-slate-400 text-sm">Write and organize articles, assign content tags and categories, and manage affiliate placements.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => handleOpenAiModal()}
            className="px-4 py-2.5 rounded-xl font-bold text-xs bg-gradient-to-r from-cyan-500 to-violet-600 text-slate-950 hover:opacity-90 transition-all flex items-center gap-2 shadow-lg shadow-cyan-500/20 cursor-pointer"
          >
            <Sparkles size={16} /> Generate AI Article
          </button>
          <LuxuryButton onClick={() => navigate({ editingArticle: {} })}>
            <Plus size={18} /> Create New Article
          </LuxuryButton>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor="article-type-filter" className="text-sm text-slate-400">Filter by Content Tag</label>
        <select
          id="article-type-filter"
          value={articleTypeFilter}
          onChange={(e) => setArticleTypeFilter(e.target.value)}
          className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
        >
          <option value="all">All Tags</option>
          {ARTICLE_CONTENT_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
          <option value="untagged">Untagged</option>
        </select>
      </div>

      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-950/50 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-800">
              <th className="p-4 font-medium">Article and Category</th>
              <th className="p-4 font-medium">Content Tag</th>
              {currentUser.role === 'admin' && <th className="p-4 font-medium">Author</th>}
              <th className="p-4 font-medium">Status</th>
              <th className="p-4 font-medium">Performance</th>
              <th className="p-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {filteredArticles.map((art) => (
              <tr key={art.id} className="border-b border-slate-800 hover:bg-white/[0.02] transition-colors">
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-white truncate max-w-[250px] lg:max-w-[350px]">{art.title}</p>
                    {art.isFeatured && (
                      <span className="bg-amber-500/10 text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded border border-amber-500/20 flex items-center gap-0.5">
                        <Star size={10} /> Featured
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                    <span>/{art.slug}</span>
                    {art.categoryName && <span className="text-amber-400 font-semibold">• {art.categoryName}</span>}
                  </div>
                </td>
                <td className="p-4">
                  <span className="inline-flex whitespace-nowrap rounded-md border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs text-amber-300">
                    {articleContentTypeLabel(art.contentType)}
                  </span>
                </td>
                {currentUser.role === 'admin' && (
                  <td className="p-4 text-slate-400 text-xs">
                    <span className="bg-slate-800 px-2 py-1 rounded text-amber-300">{art.authorName || `User #${art.authorId}`}</span>
                  </td>
                )}
                <td className="p-4">
                  <span
                    className={`px-2.5 py-1 rounded-full text-[11px] font-medium flex items-center gap-1.5 w-max uppercase tracking-wider ${art.status === 'published'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}
                  >
                    {art.status === 'published' ? <CheckCircle2 size={12} /> : <CircleDashed size={12} />}
                    {art.status === 'published' ? 'Published' : 'Draft'}
                  </span>
                </td>
                <td className="p-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-slate-300 font-medium text-xs flex items-center gap-2">
                      <Eye size={12} className="text-slate-500" /> {art.viewCount?.toLocaleString('en-US')} views
                    </span>
                    <span className="text-amber-400 font-medium text-xs flex items-center gap-2">
                      <DollarSign size={12} className="text-amber-500" /> ${art.revenue || 0}
                    </span>
                  </div>
                </td>
                <td className="p-4 text-right flex justify-end gap-2">
                  <button
                    onClick={() => navigate({ previewArticle: art })}
                    className="p-2 text-slate-400 hover:text-cyan-400 hover:bg-cyan-400/10 rounded-lg transition-colors"
                    title="Preview Article"
                  >
                    <Globe size={16} />
                  </button>
                  <button
                    onClick={() => navigate({ editingArticle: art })}
                    className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                    title="Edit Article"
                  >
                    <Edit size={16} />
                  </button>
                </td>
              </tr>
            ))}
            {filteredArticles.length === 0 && (
              <tr><td colSpan={currentUser.role === 'admin' ? 6 : 5} className="p-8 text-center text-sm text-slate-500">No articles match the selected content tag.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  // Affiliate Links Management
  const renderLinksView = () => (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">Affiliate Campaigns</h2>
          <p className="text-slate-400 text-sm">Manage affiliate links, product landing pages, commission rates, and cookie durations.</p>
        </div>
        <button
          type="button"
          onClick={() => handleOpenAiModal()}
          className="px-4 py-2.5 rounded-xl font-bold text-xs bg-gradient-to-r from-cyan-500 to-violet-600 text-slate-950 hover:opacity-90 transition-all flex items-center gap-2 shadow-lg shadow-cyan-500/20 cursor-pointer"
        >
          <Sparkles size={16} /> Generate AI Article
        </button>
      </div>

      <form onSubmit={handleAddAffiliateLink} className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl space-y-4 backdrop-blur-sm">
        <h3 className="text-white font-medium flex items-center gap-2">
          <Plus size={18} className="text-amber-400" /> Add New Affiliate Campaign
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Campaign or Platform Name *</label>
            <input
              type="text"
              value={newAffName}
              onChange={(e) => setNewAffName(e.target.value)}
              placeholder="e.g. Binance Exchange, Scalenut AI..."
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Affiliate Tracking URL *</label>
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
            <label className="block text-xs text-slate-400 mb-1">Product Landing Page URL</label>
            <input
              type="url"
              value={newAffProductUrl}
              onChange={(e) => setNewAffProductUrl(e.target.value)}
              placeholder="https://binance.com or https://scalenut.com"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-cyan-300 font-mono"
            />
            <p className="text-[10px] text-slate-500 mt-1">Enter the product website without a referral code. The AI writer uses this page as source material.</p>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Commission Rate and Cookie Duration</label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={newAffCommission}
                onChange={(e) => setNewAffCommission(e.target.value)}
                placeholder="30% Recurring"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
              />
              <input
                type="text"
                value={newAffCookie}
                onChange={(e) => setNewAffCookie(e.target.value)}
                placeholder="30 Days"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>
          </div>
        </div>

        {affUrlBlacklistError?.isError && (
          <div className="text-xs text-rose-400 font-bold bg-rose-500/10 border border-rose-500/30 p-3 rounded-xl flex items-start gap-2 animate-in fade-in">
            <AlertTriangle size={18} className="shrink-0 text-rose-400 mt-0.5" />
            <div>
              <p>Unable to add this link. Domain <strong>{affUrlBlacklistError.matchedDomain}</strong> (project: {affUrlBlacklistError.projectName}) is on the blacklist.</p>
              <p className="text-[11px] font-normal text-rose-300/80 mt-0.5">Reason: {affUrlBlacklistError.reason}</p>
            </div>
          </div>
        )}

        <LuxuryButton
          type="submit"
          disabled={affUrlBlacklistError?.isError}
          className={`py-2 text-xs ${affUrlBlacklistError?.isError ? 'opacity-40 cursor-not-allowed' : ''}`}
        >
          Save Affiliate Campaign
        </LuxuryButton>
      </form>

      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-950/50 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-800">
              <th className="p-4 font-medium">Campaign Name</th>
              <th className="p-4 font-medium">Commission Rate</th>
              <th className="p-4 font-medium">Cookie Duration</th>
              <th className="p-4 font-medium">Total Clicks</th>
              <th className="p-4 font-medium">Tracking URL</th>
              <th className="p-4 font-medium text-right">Actions</th>
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
                        BLACKLISTED
                      </span>
                    )}
                    {link.status === 'inactive' && (
                      <span className="bg-slate-500/10 text-slate-400 text-[10px] font-bold px-2 py-0.5 rounded border border-slate-600/40">
                        INACTIVE
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
                  <Clock size={14} /> {link.cookie || '30 Days'}
                </td>
                <td className="p-4">
                  <span className="text-sky-400 font-medium bg-sky-400/10 px-2.5 py-1 rounded-md text-xs border border-sky-400/20 inline-flex items-center gap-1">
                    <MousePointerClick size={13} /> {(link.clickCount || link.click_count || 0).toLocaleString('en-US')}
                  </span>
                </td>
                <td className="p-4 max-w-[200px]">
                  <code className="text-xs text-slate-400 bg-slate-950 px-2 py-1 rounded truncate block border border-slate-800 font-mono">
                    {link.baseUrl}
                  </code>
                </td>
                <td className="p-4 text-right flex justify-end gap-2 items-center">
                  <button
                    type="button"
                    onClick={() => handleOpenAiModal(link)}
                    className="px-2.5 py-1.5 text-xs bg-gradient-to-r from-cyan-500 to-violet-600 text-slate-950 font-bold rounded-lg shadow hover:opacity-90 transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                    title="Generate an article using product information"
                  >
                    <Sparkles size={14} /> Generate Article
                  </button>
                  <button
                    onClick={() => handleQuickBlacklist(link.id, link.name)}
                    className="p-1.5 text-xs bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-lg flex items-center gap-1 font-semibold transition-colors"
                    title="Move to Blacklist"
                  >
                    <ShieldAlert size={14} /> Blacklist
                  </button>
                  <button onClick={() => handleDeleteAffiliateLink(link.id)} className="p-2 text-slate-400 hover:text-red-400" title="Delete Campaign">
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
  const renderBlacklistView = () => {
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
              <ShieldAlert size={26} className="text-rose-500" /> Link and Blacklist Management
            </h2>
            <p className="text-slate-400 text-sm">
              Manage blocked domains and URLs, restrict affiliate links, and review affected campaigns.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowImportSheetModal(true)}
              className="px-4 py-2.5 rounded-xl font-bold text-xs bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/20 flex items-center gap-2 transition-all cursor-pointer"
            >
              <FileSpreadsheet size={16} /> Import Google Sheet
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
              <Plus size={16} /> Add Blocked Domain
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
            <ShieldAlert size={16} /> Blocked Domains ({blacklistList.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveBlacklistTab('rules')}
            className={`px-4 py-2 rounded-xl font-semibold text-xs transition-all flex items-center gap-2 ${activeBlacklistTab === 'rules'
              ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
              }`}
          >
            <Sliders size={16} /> Blocking Rules
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
                  placeholder="Search by project, domain, or reason..."
                  className="w-full bg-slate-950 border border-slate-700/50 rounded-xl pl-10 pr-4 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                />
              </div>
              <span className="text-xs text-slate-500 font-mono">Showing {filteredBlacklist.length} / {blacklistList.length} blocked domains</span>
            </div>

            {/* Table */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-950/50 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-800">
                    <th className="p-4 font-medium">Project and Website</th>
                    <th className="p-4 font-medium">Root Domain</th>
                    <th className="p-4 font-medium">Rule</th>
                    <th className="p-4 font-medium">Reason for Blocking</th>
                    <th className="p-4 font-medium">Restricted Countries</th>
                    <th className="p-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-xs">
                  {filteredBlacklist.length > 0 ? (
                    filteredBlacklist.map((item) => (
                      <tr key={item.id} className="border-b border-slate-800 hover:bg-white/[0.02] transition-colors">
                        <td className="p-4">
                          <p className="font-bold text-white">{item.projectName || 'Unnamed project'}</p>
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
                              <span className="text-slate-500 text-[10px]">All countries</span>
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-right">
                          <button onClick={() => handleDeleteBlacklist(item.id)} className="p-2 text-slate-400 hover:text-rose-400" title="Remove from blacklist">
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-500">
                        No blocked domains yet. Add a domain or import a Google Sheet to get started.
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
                <h3>Domain Blocking (Recommended)</h3>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Adding a domain (e.g. <code className="text-amber-300">badsite.com</code>) blocks its root domain, subdomains, and paths, including <code className="text-slate-300">badsite.com/register</code>, <code className="text-slate-300">sub.badsite.com</code>.
              </p>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs text-emerald-400 font-mono">
                Active: domain rules apply automatically.
              </div>
            </div>

            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm space-y-3">
              <div className="flex items-center gap-2 text-cyan-400 font-bold">
                <Sliders size={20} />
                <h3>Exact URL Blocking</h3>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Blocks only the specified URL. Use this when an individual page should be restricted while the rest of the website remains available.
              </p>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs text-cyan-400 font-mono">
                Available when adding a blocked URL manually.
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
                  <FileSpreadsheet size={20} className="text-cyan-400" /> Import a Google Sheet
                </h3>
                <button onClick={() => setShowImportSheetModal(false)} className="text-slate-400 hover:text-white">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Google Sheet URL (Publicly Accessible) *
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
                    The importer reads each row, identifies the root domain, and saves the blocked entries.
                  </p>
                </div>

                <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800/80 text-xs text-slate-400 space-y-1">
                  <p className="text-slate-200 font-bold">Expected spreadsheet columns:</p>
                  <p>• Column A: Project name (e.g. NordVPN)</p>
                  <p>• Column B: Website URL (e.g. https://nordvpn.com)</p>
                  <p>• Column C: Reason for blocking (e.g. unpaid commissions)</p>
                  <p>• Column H: Restricted countries (e.g. Portugal, Poland)</p>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowImportSheetModal(false)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
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
                      <span>Importing spreadsheet...</span>
                    </>
                  ) : (
                    <>
                      <Upload size={16} /> Import Spreadsheet
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
                  <ShieldAlert size={18} className="text-rose-500" /> Add a Blocked Domain or URL
                </h3>
                <button onClick={() => setShowAddBlacklistModal(false)} className="text-slate-400 hover:text-white">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleSaveBlacklist} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Project or Platform Name</label>
                  <input
                    type="text"
                    value={blProjectName}
                    onChange={(e) => setBlProjectName(e.target.value)}
                    placeholder="e.g. NordVPN, Scalenut..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Website URL or Domain *</label>
                  <input
                    type="text"
                    value={blWebsiteUrl}
                    onChange={(e) => setBlWebsiteUrl(e.target.value)}
                    placeholder="https://example.com/register or example.com"
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-rose-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Reason for Blocking *</label>
                  <input
                    type="text"
                    value={blReason}
                    onChange={(e) => setBlReason(e.target.value)}
                    placeholder="Unpaid commissions, suspected fraud..."
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Restricted Countries</label>
                  <input
                    type="text"
                    value={blBlockedCountries}
                    onChange={(e) => setBlBlockedCountries(e.target.value)}
                    placeholder="Separate countries with commas: Portugal, Poland, Germany"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Blocking Rule</label>
                  <select
                    value={blMatchType}
                    onChange={(e: any) => setBlMatchType(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
                  >
                    <option value="domain">Block Domain and All Subdomains</option>
                    <option value="exact_url">Block This Exact URL</option>
                  </select>
                </div>
                <div className="pt-2 flex justify-end gap-3">
                  <button type="button" onClick={() => setShowAddBlacklistModal(false)} className="px-4 py-2 text-xs text-slate-400 hover:text-white">
                    Cancel
                  </button>
                  <LuxuryButton type="submit" className="py-2 px-5 text-xs bg-rose-600 hover:bg-rose-500 text-white">
                    Save and Update Affected Campaigns
                  </LuxuryButton>
                </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );

  };

  // Categories & Subcategories View
  const renderCategoriesView = () => (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">Categories and Subcategories</h2>
          <p className="text-slate-400 text-sm">Organize categories and subcategories, customize URL slugs, and manage SEO metadata.</p>
        </div>
        <LuxuryButton
          onClick={() => {
            setEditingCategoryObj(null);
            setCatName(''); setCatSlug(''); setCatDesc(''); setCatMetaTitle(''); setCatMetaDesc('');
            setShowCategoryModal(true);
          }}
        >
          <Plus size={18} /> Add Main Category (Level 1)
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
                  </div>
                  {cat.description && <p className="text-xs text-slate-400 mt-1">{cat.description}</p>}
                  {(cat.metaTitle || cat.metaDescription) && (
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-emerald-400">
                      <Sparkles size={12} /> SEO title and description configured
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
                  <Plus size={14} /> Add Subcategory
                </button>
                <button
                  onClick={() => {
                    setEditingCategoryObj(cat);
                    setCatName(cat.name || '');
                    setCatSlug(cat.slug || '');
                    setCatDesc(cat.description || '');
                    setCatMetaTitle(cat.metaTitle || '');
                    setCatMetaDesc(cat.metaDescription || '');
                    setShowCategoryModal(true);
                  }}
                  className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                  title="Edit Category"
                >
                  <Edit size={16} />
                </button>
                <button
                  onClick={() => handleDeleteCategory(cat.id)}
                  className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                  title="Delete Category"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            {/* Sub-categories List */}
            <div className="pl-4 pt-2">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Layers size={14} className="text-cyan-400" /> Level 2 Subcategories ({cat.subCategories?.length || 0})
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
                <p className="text-xs text-slate-600 italic">No subcategories yet under {cat.name}. Click "+ Add Subcategory" to create one.</p>
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
                {editingCategoryObj ? 'Edit Main Category' : 'Add Main Category (Level 1)'}
              </h3>
              <button onClick={() => setShowCategoryModal(false)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSaveCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Category Name *</label>
                <input
                  type="text"
                  value={catName}
                  onChange={(e) => {
                    setCatName(e.target.value);
                    if (!catSlug || !editingCategoryObj) {
                      setCatSlug(e.target.value.toLowerCase().trim().replace(/\s+/g, '-'));
                    }
                  }}
                  placeholder="e.g. AI Writing Tools"
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">URL Slug *</label>
                <input
                  type="text"
                  value={catSlug}
                  onChange={(e) => setCatSlug(e.target.value)}
                  placeholder="ai-writing-tools"
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-amber-500 font-mono text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={catDesc}
                  onChange={(e) => setCatDesc(e.target.value)}
                  placeholder="Category overview..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>
              <div className="border-t border-slate-800 pt-3 space-y-3">
                <p className="text-xs font-bold text-amber-400 flex items-center gap-1"><Sparkles size={14} /> Category SEO Metadata</p>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">SEO Meta Title</label>
                  <input
                    type="text"
                    value={catMetaTitle}
                    onChange={(e) => setCatMetaTitle(e.target.value)}
                    placeholder="Enter a category SEO title..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">SEO Meta Description</label>
                  <textarea
                    rows={2}
                    value={catMetaDesc}
                    onChange={(e) => setCatMetaDesc(e.target.value)}
                    placeholder="Enter a category meta description..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white resize-none"
                  />
                </div>
              </div>
              <div className="pt-2 flex justify-end gap-3">
                <button type="button" onClick={() => setShowCategoryModal(false)} className="px-4 py-2 text-xs text-slate-400 hover:text-white">
                  Cancel
                </button>
                <LuxuryButton type="submit" className="py-2 px-5 text-xs">
                  Save Category
                </LuxuryButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Subcategory Modal */}
      {showSubCategoryModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="flex justify-between items-center mb-4 border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Layers size={20} className="text-cyan-400" />
                {editingSubCategoryObj ? 'Edit Subcategory' : 'Add Subcategory (Level 2)'}
              </h3>
              <button onClick={() => setShowSubCategoryModal(false)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSaveSubCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Parent Category *</label>
                <select
                  value={subCatParentId}
                  onChange={(e) => setSubCatParentId(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="">Select Parent Category...</option>
                  {categoriesList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Subcategory Name *</label>
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
                <label className="block text-xs font-semibold text-slate-400 mb-1">URL Slug *</label>
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
                <label className="block text-xs font-semibold text-slate-400 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={subCatDesc}
                  onChange={(e) => setSubCatDesc(e.target.value)}
                  placeholder="Subcategory overview..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>
              <div className="border-t border-slate-800 pt-3 space-y-3">
                <p className="text-xs font-bold text-cyan-400 flex items-center gap-1"><Sparkles size={14} /> Subcategory SEO Metadata</p>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">SEO Meta Title</label>
                  <input
                    type="text"
                    value={subCatMetaTitle}
                    onChange={(e) => setSubCatMetaTitle(e.target.value)}
                    placeholder="Enter a subcategory SEO title..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">SEO Meta Description</label>
                  <textarea
                    rows={2}
                    value={subCatMetaDesc}
                    onChange={(e) => setSubCatMetaDesc(e.target.value)}
                    placeholder="Enter a subcategory meta description..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white resize-none"
                  />
                </div>
              </div>
              <div className="pt-2 flex justify-end gap-3">
                <button type="button" onClick={() => setShowSubCategoryModal(false)} className="px-4 py-2 text-xs text-slate-400 hover:text-white">
                  Cancel
                </button>
                <LuxuryButton type="submit" className="py-2 px-5 text-xs">
                  Save Subcategory
                </LuxuryButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );

  // Settings & SEO / GEO / Theme View
  const renderSettingsView = () => (
    <form onSubmit={handleSaveSettings} className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="flex justify-between items-end border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">Site Settings</h2>
          <p className="text-slate-400 text-sm">Manage branding, appearance, search metadata, and structured data.</p>
        </div>
        <LuxuryButton type="submit" className="py-2.5 px-6">
          <CheckCircle2 size={18} /> Save All Settings
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
          <Palette size={16} /> Appearance and Branding
        </button>
        <button
          type="button"
          onClick={() => setSettingsSection('seo_geo')}
          className={`px-4 py-2 rounded-xl font-semibold text-xs transition-all flex items-center gap-2 ${settingsSection === 'seo_geo'
            ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
            : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
            }`}
        >
          <Globe size={16} /> SEO and Structured Data
        </button>
      </div>

      {settingsSection === 'appearance' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 animate-in fade-in duration-300">
          {/* Theme & Palette */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm space-y-5">
            <h3 className="text-white font-medium flex items-center gap-2 border-b border-slate-800 pb-3">
              <Palette size={18} className="text-amber-400" /> Colors and Theme
            </h3>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-2">Color Presets</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { name: 'Dark Slate & Amber (Default)', primary: '#0f172a', accent: '#f59e0b', mode: 'dark' },
                  { name: 'Cyber Emerald', primary: '#064e3b', accent: '#10b981', mode: 'dark' },
                  { name: 'Sapphire Blue', primary: '#1e3a8a', accent: '#3b82f6', mode: 'dark' },
                  { name: 'Ruby Crimson', primary: '#881337', accent: '#f43f5e', mode: 'dark' },
                  { name: 'Sunset Orange', primary: '#7c2d12', accent: '#f97316', mode: 'dark' },
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
                <label className="block text-xs font-semibold text-slate-400 mb-1">Primary Color (Hex)</label>
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
                <label className="block text-xs font-semibold text-slate-400 mb-1">Accent Color (Hex)</label>
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
                <label className="block text-xs font-semibold text-slate-400 mb-1">Theme Mode</label>
                <select
                  value={settingsData?.themeMode || 'dark'}
                  onChange={(e) => setSettingsData({ ...settingsData, themeMode: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2.5 text-xs text-white"
                >
                  <option value="dark">Dark (Default)</option>
                  <option value="light">Light Mode</option>
                  <option value="emerald">Emerald</option>
                  <option value="amber">Amber Gold</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Font Family</label>
                <select
                  value={settingsData?.fontFamily || 'Inter'}
                  onChange={(e) => setSettingsData({ ...settingsData, fontFamily: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2.5 text-xs text-white"
                >
                  <option value="Inter">Inter</option>
                  <option value="Roboto">Roboto</option>
                  <option value="Outfit">Outfit</option>
                  <option value="Plus Jakarta Sans">Plus Jakarta Sans</option>
                </select>
              </div>
            </div>
          </div>

          {/* Branding & Visual Assets */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm space-y-5">
            <h3 className="text-white font-medium flex items-center gap-2 border-b border-slate-800 pb-3">
              <Layout size={18} className="text-cyan-400" /> Branding
            </h3>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Header Logo Image URL</label>
              <input
                type="text"
                value={settingsData?.logoUrl || ''}
                onChange={(e) => setSettingsData({ ...settingsData, logoUrl: e.target.value })}
                placeholder="https://example.com/logo.png (leave blank to use a text logo)"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-xs text-white"
              />
              {settingsData?.logoUrl && (
                <div className="mt-2 p-2 bg-slate-950 rounded-lg border border-slate-800 flex items-center gap-2">
                  <span className="text-[10px] text-slate-500">Preview:</span>
                  <img src={settingsData.logoUrl} alt="Logo Preview" className="h-6 object-contain" />
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Favicon URL</label>
              <input
                type="text"
                value={settingsData?.faviconUrl || ''}
                onChange={(e) => setSettingsData({ ...settingsData, faviconUrl: e.target.value })}
                placeholder="https://example.com/favicon.ico"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Announcement Banner Text</label>
              <input
                type="text"
                value={settingsData?.bannerText || ''}
                onChange={(e) => setSettingsData({ ...settingsData, bannerText: e.target.value })}
                placeholder="Enter announcement text..."
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Footer Copyright and Description</label>
              <textarea
                rows={2}
                value={settingsData?.footerText || ''}
                onChange={(e) => setSettingsData({ ...settingsData, footerText: e.target.value })}
                placeholder="© 2026 AIDEALSUK. All rights reserved..."
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-xs text-white resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Custom CSS</label>
              <textarea
                rows={3}
                value={settingsData?.customCss || ''}
                onChange={(e) => setSettingsData({ ...settingsData, customCss: e.target.value })}
                placeholder="/* Additional CSS styles */ .custom-class { color: red; }"
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
              <Globe size={18} className="text-amber-400" /> Search Metadata
            </h3>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">Global Site Title</label>
              <input
                type="text"
                value={settingsData?.siteTitle || ''}
                onChange={(e) => setSettingsData({ ...settingsData, siteTitle: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-amber-500 shadow-inner text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">Meta Description</label>
              <textarea
                rows={3}
                value={settingsData?.metaDescription || ''}
                onChange={(e) => setSettingsData({ ...settingsData, metaDescription: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-amber-500 shadow-inner resize-none text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2">Target Keywords</label>
              <input
                type="text"
                value={settingsData?.focusKeywords || ''}
                onChange={(e) => setSettingsData({ ...settingsData, focusKeywords: e.target.value })}
                placeholder="crypto, finance, investing, affiliate deals"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-xs text-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2">Canonical Domain URL</label>
                <input
                  type="text"
                  value={settingsData?.canonicalUrl || ''}
                  onChange={(e) => setSettingsData({ ...settingsData, canonicalUrl: e.target.value })}
                  placeholder="https://nexusfinance.global"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2">Open Graph Image URL</label>
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
              <MapPin size={18} className="text-cyan-400" /> Language, Location, and Structured Data
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2">Language Locale (hreflang)</label>
                <select
                  value={settingsData?.hreflang || 'en-US'}
                  onChange={(e) => setSettingsData({ ...settingsData, hreflang: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2.5 text-xs text-white"
                >
                  <option value="en-US">English (en-US)</option>
                  <option value="vi-VN">Vietnamese (vi-VN)</option>
                  <option value="ja-JP">Japanese (ja-JP)</option>
                  <option value="de-DE">German (de-DE)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2">Target Country Code</label>
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
                <label className="block text-xs font-medium text-slate-400 mb-1">Region Code (geo.region)</label>
                <input
                  type="text"
                  value={settingsData?.geoRegionName || 'US-NY'}
                  onChange={(e) => setSettingsData({ ...settingsData, geoRegionName: e.target.value })}
                  placeholder="US-NY or VN-HN"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">City (geo.placename)</label>
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
                <label className="block text-xs font-medium text-slate-400 mb-1">Latitude</label>
                <input
                  type="number"
                  step="any"
                  value={settingsData?.geoLatitude || 40.7128}
                  onChange={(e) => setSettingsData({ ...settingsData, geoLatitude: parseFloat(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Longitude</label>
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
              <label className="block text-xs font-medium text-slate-400 mb-1">Google Analytics Measurement ID (GA4)</label>
              <input
                type="text"
                value={settingsData?.googleAnalyticsId || ''}
                onChange={(e) => setSettingsData({ ...settingsData, googleAnalyticsId: e.target.value })}
                placeholder="G-XXXXXXXXXX"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono"
              />
              <p className="text-[11px] text-slate-500 mt-1">Find your measurement ID in Google Analytics 4 under Admin &gt; Data Streams. Leave this blank to disable tracking.</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Google Search Console Verification</label>
              <input
                type="text"
                value={settingsData?.googleSiteVerification || ''}
                onChange={(e) => setSettingsData({ ...settingsData, googleSiteVerification: e.target.value })}
                placeholder="Paste the google-site-verification content value"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                In Search Console, go to Settings &gt; Ownership verification &gt; HTML tag. Paste only the value from <code>content=&quot;...&quot;</code>; the meta tag is added automatically.
              </p>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-medium text-slate-400">Structured Data (JSON-LD)</label>
                <button
                  type="button"
                  onClick={generateDefaultSchemaJsonLd}
                  className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1 font-semibold"
                >
                  <Sparkles size={12} /> Auto-Generate Schema
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
  const renderSubscribersView = () => {
    const filteredSubscribers = subscribersList.filter((s) =>
      s.email.toLowerCase().includes(subscriberSearchQuery.toLowerCase().trim())
    );

    const exportToCsv = () => {
      if (subscribersList.length === 0) {
        alert('There are no subscribers to export.');
        return;
      }
      const headers = ['ID', 'Email Address', 'Subscription Status', 'Subscription Date', 'Last Digest'];
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
            <h2 className="text-2xl font-bold text-white mb-1">Insider Dispatch</h2>
            <p className="text-slate-400 text-sm">Manage subscribers, confirmation status, and daily email delivery.</p>
          </div>
          <LuxuryButton onClick={exportToCsv} className="py-2.5 px-5">
            <Download size={18} /> Export Subscribers (CSV)
          </LuxuryButton>
        </div>

        {/* Daily dispatch control */}
        <section className="relative overflow-hidden rounded-2xl border border-amber-500/20 bg-[#0b0b0e] shadow-[0_20px_70px_rgba(0,0,0,0.28)]">
          <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-amber-300 via-amber-500 to-transparent" />
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_auto] gap-6 p-6 sm:p-7">
            <div>
              <div className="flex flex-wrap items-center gap-3 mb-5">
                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-400">
                  <Radio size={11} className="animate-pulse" /> Daily automation
                </span>
                <span className="text-xs font-mono text-slate-500">00:00 GMT+12 · previous-day brief</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-600">Recipients</p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums text-white">{(subscribersStats?.totalSubscribers || 0).toLocaleString('en-US')}</p>
                  <p className="text-xs text-slate-500">Active and confirmed</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-600">Awaiting confirmation</p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums text-amber-300">{(subscribersStats?.pendingCount || 0).toLocaleString('en-US')}</p>
                  <p className="text-xs text-slate-500">Not included in delivery</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-600">Last dispatch</p>
                  <p className="mt-2 text-sm font-mono text-slate-200">
                    {subscribersStats?.lastDispatchAt
                      ? new Date(subscribersStats.lastDispatchAt).toLocaleString('en-US')
                      : 'No digest sent yet'}
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
                  ? <><Loader2 size={16} className="animate-spin" /> Sending digest...</>
                  : <><Send size={16} /> Send digest now</>}
              </LuxuryButton>
              <p className="max-w-[260px] text-[11px] leading-relaxed text-slate-500 xl:text-right">Sends today’s GMT+12 brief immediately. The next scheduled cron digest remains active.</p>
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
          <StatCard title="New Insiders Today" value={(subscribersStats?.countToday || 0).toLocaleString('en-US')} icon={Sparkles} subtext="Confirmed today in GMT+12" />
          <StatCard title="New This Week" value={(subscribersStats?.countThisWeek || 0).toLocaleString('en-US')} icon={TrendingUp} subtext="Confirmed in the last 7 days" />
          <StatCard title="Unsubscribed" value={(subscribersStats?.unsubscribedCount || 0).toLocaleString('en-US')} icon={X} subtext="Excluded from all delivery" />
        </div>

        {/* Search Bar */}
        <div className="flex items-center justify-between gap-4 bg-slate-900/50 border border-slate-800 p-4 rounded-2xl backdrop-blur-sm">
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={subscriberSearchQuery}
              onChange={(e) => setSubscriberSearchQuery(e.target.value)}
              placeholder="Search by email address..."
              className="w-full bg-slate-950 border border-slate-700/50 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
            />
          </div>
          <span className="text-xs text-slate-500 font-mono">Showing {filteredSubscribers.length} of {subscribersList.length} leads</span>
        </div>

        {/* Subscribers Table */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950/50 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-800">
                <th className="p-4 font-medium">Subscriber Email</th>
                <th className="p-4 font-medium">Subscription Date</th>
                <th className="p-4 font-medium">Subscriber Status</th>
                <th className="p-4 font-medium text-right">Actions</th>
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
                      {sub.subscribedAt ? new Date(sub.subscribedAt).toLocaleString('en-US') : 'N/A'}
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
                          ? `Last digest: ${new Date(sub.lastDigestAt).toLocaleString('en-US')}`
                          : `Email status: ${sub.emailStatus || 'sent'}`}
                      >
                        {sub.status === 'active'
                          ? <CheckCircle2 size={12} />
                          : sub.status === 'unsubscribed'
                            ? <X size={12} />
                            : <Clock size={12} />}
                        {sub.status === 'active'
                          ? 'Active'
                          : sub.status === 'unsubscribed'
                            ? 'Unsubscribed'
                            : 'Pending confirmation'}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button onClick={() => handleDeleteSubscriber(sub.id)} className="p-2 text-slate-400 hover:text-red-400" title="Delete Subscriber">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-500 text-sm">
                    No subscribers match "{subscriberSearchQuery}".
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
    if (previewArticle) return <PublicArticlePreview article={previewArticle} onBack={() => navigate({ previewArticle: null }, { replace: true })} />;
    if (editingArticle !== null) return <ArticleEditorForm
      key={editingArticle.id || 'new'}
      editingArticle={editingArticle}
      currentUser={currentUser}
      categoriesList={categoriesList}
      affiliateLinksList={affiliateLinksList}
      navigate={navigate}
      loadAllData={loadAllData}
      showCmsToast={showCmsToast}
      handleCmsFailure={handleCmsFailure}
    />;

    if (activeTab === 'dashboard') return renderDashboardView();
    if (activeTab === 'insights' && currentUser.role === 'admin') return renderInsightsView();
    if (activeTab === 'articles') return renderArticlesView();
    if (activeTab === 'subscribers' && currentUser.role === 'admin') return renderSubscribersView();
    if (activeTab === 'categories' && currentUser.role === 'admin') return renderCategoriesView();
    if (activeTab === 'users' && currentUser.role === 'admin') return renderUsersView();
    if (activeTab === 'links' && currentUser.role === 'admin') return renderLinksView();
    if (activeTab === 'blacklist' && currentUser.role === 'admin') return renderBlacklistView();
    if (activeTab === 'settings' && currentUser.role === 'admin') return renderSettingsView();

    // D-13: a known admin-only tab reached by a non-admin (e.g. via URL) renders the
    // permission contract — never the generic "Under Construction..." placeholder and
    // never another user's data. UI hiding is cosmetic; the backing routes keep their
    // 403 (proven by tests/api/cms-rbac-affiliate-403.test.ts).
    if (currentUser.role !== 'admin' && ADMIN_ONLY_TABS.has(activeTab)) {
      return (
        <div className="flex flex-col items-center justify-center h-64 gap-3 text-center">
          <div className="flex items-center gap-2 text-rose-400">
            <ShieldAlert size={20} />
            <span className="text-sm font-bold">Access denied</span>
          </div>
          <p className="text-slate-400 text-sm">You don&apos;t have access to this section.</p>
          <button
            onClick={() => navigate({ tab: 'articles' })}
            className="text-xs font-bold text-rose-400 hover:text-rose-300 underline underline-offset-4"
          >
            Back to Articles
          </button>
        </div>
      );
    }

    return <div className="text-slate-500 flex items-center justify-center h-64 text-sm">Under Construction...</div>;
  };


  return (
    <div className="min-h-screen bg-[#060608] font-sans selection:bg-amber-500/30 text-slate-300">
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-cyan-900/10 blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-amber-900/10 blur-[120px]"></div>
      </div>

      {previewArticle === null && (
        <div className="relative z-10 flex h-screen overflow-hidden">
          {/* Sidebar */}
          <aside className="w-64 bg-[#0a0a0c]/80 backdrop-blur-xl border-r border-slate-800/60 flex flex-col shadow-2xl">
            <div className="h-20 flex items-center px-6 border-b border-slate-800/60">
              <Link href="/" className="text-xl font-bold tracking-tighter text-white flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-300 to-yellow-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
                  <span className="text-slate-900 font-bold text-lg">A</span>
                </div>
                AFFILIATE<span className="text-amber-400 font-light">PRO</span>
              </Link>
            </div>

            <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto custom-scrollbar">
              <NavItem id="dashboard" icon={LayoutDashboard} label="Dashboard" active={activeTab === "dashboard" && !editingArticle && !previewArticle} onClick={() => navigate({ tab: "dashboard" })} currentUser={currentUser} />
              <div className="pt-4 pb-2 px-4 text-[10px] font-bold text-slate-600 uppercase tracking-widest">Content</div>
              <NavItem id="articles" icon={FileText} label="Article Management" active={activeTab === "articles" && !editingArticle && !previewArticle} onClick={() => navigate({ tab: "articles" })} currentUser={currentUser} />

              {currentUser.role === 'admin' && (
                <>
                  <NavItem id="insights" icon={TrendingUp} label="SEO Insights" active={activeTab === "insights" && !editingArticle && !previewArticle} onClick={() => navigate({ tab: "insights" })} currentUser={currentUser} requiredRole="admin" />
                  <div className="pt-4 pb-2 px-4 text-[10px] font-bold text-slate-600 uppercase tracking-widest">System (Admin)</div>
                  <NavItem id="subscribers" icon={Mail} label="Insider" active={activeTab === "subscribers" && !editingArticle && !previewArticle} onClick={() => navigate({ tab: "subscribers" })} currentUser={currentUser} requiredRole="admin" />
                  <NavItem id="categories" icon={FolderTree} label="Categories" active={activeTab === "categories" && !editingArticle && !previewArticle} onClick={() => navigate({ tab: "categories" })} currentUser={currentUser} requiredRole="admin" />
                  <NavItem id="users" icon={Users} label="Team Members" active={activeTab === "users" && !editingArticle && !previewArticle} onClick={() => navigate({ tab: "users" })} currentUser={currentUser} requiredRole="admin" />
                  <NavItem id="blacklist" icon={ShieldAlert} label="Blocked Links" active={activeTab === "blacklist" && !editingArticle && !previewArticle} onClick={() => navigate({ tab: "blacklist" })} currentUser={currentUser} requiredRole="admin" />
                  <NavItem id="links" icon={LinkIcon} label="Affiliate Campaigns" active={activeTab === "links" && !editingArticle && !previewArticle} onClick={() => navigate({ tab: "links" })} currentUser={currentUser} requiredRole="admin" />
                  <NavItem id="settings" icon={Settings} label="Settings" active={activeTab === "settings" && !editingArticle && !previewArticle} onClick={() => navigate({ tab: "settings" })} currentUser={currentUser} requiredRole="admin" />
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
                  <p className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">{currentUser.role}</p>
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
                    placeholder="Search articles or team..."
                    className="w-full bg-slate-900/50 border border-slate-700/50 rounded-full pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-amber-500 transition-colors shadow-inner"
                  />
                </div>
              </div>

              <div className="flex items-center gap-6">
                <Link href="/" target="_blank" className="text-xs text-slate-400 hover:text-amber-400 flex items-center gap-1">
                  Public Website <Globe size={14} />
                </Link>
                <div className="w-px h-6 bg-slate-800"></div>
                <button onClick={handleLogout} className="text-slate-400 hover:text-red-400 p-2 rounded-full hover:bg-red-400/10 transition-colors" title="Sign Out">
                  <LogOut size={18} />
                </button>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
              <div className="max-w-7xl mx-auto">{renderContent()}</div>
            </div>
          </main>
        </div>
      )}

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
                Sign in
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

      {/* Modal Sinh Bài Viết Tự Động Bằng Gemini AI & Jina Scraper */}
      {showAiGenerateModal && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-xl shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Sparkles size={20} className="text-cyan-400" /> Generate an AI Article
              </h3>
              <button onClick={() => setShowAiGenerateModal(false)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleGenerateAiArticle} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Affiliate Campaign (Optional)</label>
                <select
                  value={aiModalCampaign?.id || ''}
                  onChange={(e) => handleSelectCampaignForAiModal(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
                >
                  <option value="">Enter a topic and URLs manually</option>
                  {affiliateLinksList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.baseUrl})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Article Topic or Title *</label>
                <input
                  type="text"
                  value={aiModalTopic}
                  onChange={(e) => setAiModalTopic(e.target.value)}
                  placeholder="e.g. Scalenut Review: Features, Pricing, and Use Cases"
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-cyan-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Affiliate Tracking URL *</label>
                  <input
                    type="url"
                    value={aiModalBaseUrl}
                    onChange={(e) => setAiModalBaseUrl(e.target.value)}
                    placeholder="https://refersion.com/register?ref=123"
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Product Landing Page URL</label>
                  <input
                    type="url"
                    value={aiModalProductUrl}
                    onChange={(e) => setAiModalProductUrl(e.target.value)}
                    placeholder="https://refersion.com"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-cyan-300 font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Article Language</label>
                  <select
                    value={aiModalLanguage}
                    onChange={(e: any) => setAiModalLanguage(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
                  >
                    <option value="vi-VN">Vietnamese (vi-VN)</option>
                    <option value="en-US">English (en-US)</option>
                  </select>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-xs font-semibold text-slate-300">Gemini API Key</label>
                    <a
                      href="https://aistudio.google.com/app/apikey"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] text-cyan-400 hover:underline flex items-center gap-1 font-semibold"
                    >
                      Get an API key from Google AI Studio
                    </a>
                  </div>
                  <input
                    type="password"
                    value={aiModalApiKey}
                    onChange={(e) => setAiModalApiKey(e.target.value)}
                    placeholder="Paste your Gemini API key..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-amber-300 font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-1.5">
                <p className="text-slate-200 font-bold flex items-center gap-1.5">
                  How article generation works:
                </p>
                <p>1. Check the supplied URLs against the blacklist.</p>
                <p>2. Retrieve product information using Jina AI Reader (<code className="text-cyan-300">r.jina.ai</code>).</p>
                <p>3. Generate a structured article with SEO and GEO metadata.</p>
                <p>4. Check the links and save the article as a draft.</p>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button type="button" onClick={() => setShowAiGenerateModal(false)} className="px-4 py-2 text-xs text-slate-400 hover:text-white">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isGeneratingAiArticle}
                  className="px-6 py-2.5 rounded-xl font-bold text-xs bg-gradient-to-r from-cyan-500 to-violet-600 text-slate-950 hover:opacity-90 transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-cyan-500/20"
                >
                  {isGeneratingAiArticle ? (
                    <>
                      <div className="w-4 h-4 rounded-full border-2 border-slate-950 border-t-transparent animate-spin"></div>
                      <span>Generating article...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} /> Generate Article
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Article Editor Form V5.1 (SEO & GEO Studio)
interface ArticleEditorFormProps {
  editingArticle: any;
  currentUser: any;
  categoriesList: any[];
  affiliateLinksList: any[];
  navigate: (next: { tab?: string; editingArticle?: any; previewArticle?: any }, options?: { replace?: boolean }) => void;
  loadAllData: () => void;
  showCmsToast: (type: 'success' | 'error', text: string) => void;
  handleCmsFailure: (status: number, message?: string) => void;
}

// Keep this component at module scope so parent updates preserve editor state.
const ArticleEditorForm = ({
  editingArticle, currentUser, categoriesList, affiliateLinksList,
  navigate, loadAllData, showCmsToast, handleCmsFailure,
}: ArticleEditorFormProps) => {
  // ID sinh trước ở client cho bài mới (chưa có editingArticle.id), dùng để
  // gắn link/nút affiliate có theo dõi ngay cả khi chưa bấm Save. Nếu bài
  // được lưu, id này được gửi kèm để MongoDB dùng làm _id thật; nếu không
  // bao giờ lưu thì id chỉ tồn tại tạm trong state và tự mất khi rời trang.
  const [pendingId] = useState(() => editingArticle?.id || generateObjectId());
  const [title, setTitle] = useState(editingArticle?.title || '');
  const [slug, setSlug] = useState(editingArticle?.slug || '');
  const [excerpt, setExcerpt] = useState(editingArticle?.excerpt || '');
  const [content, setContent] = useState(editingArticle?.content || '');
  const [contentType, setContentType] = useState<ArticleContentType | ''>(editingArticle?.contentType || editingArticle?.content_type || '');
  const [contentTypeError, setContentTypeError] = useState<string | null>(null);

  // Autosave nháp vào localStorage — chống mất bài khi crash/đóng nhầm tab.
  // Bài đang sửa dùng đúng id thật (ổn định qua nhiều phiên); bài mới tạo dùng
  // 1 slot cố định "new" (không dùng pendingId vì mỗi lần "Create New" sinh ra
  // 1 id ngẫu nhiên khác nhau — nếu dùng pendingId sẽ không bao giờ tìm lại
  // được nháp cũ ở phiên sau).
  const draftKey = editingArticle?.id ? `admin_article_draft_${editingArticle.id}` : 'admin_article_draft_new';
  const [draftBanner, setDraftBanner] = useState<{ savedAt: number } | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(draftKey);
      if (!raw) return;
      const draft = JSON.parse(raw);
      const isDifferent = draft.title !== (editingArticle?.title || '') || draft.content !== (editingArticle?.content || '') || (isArticleContentType(draft.contentType) && draft.contentType !== editingArticle?.contentType);
      if (isDifferent && typeof draft.savedAt === 'number') {
        setDraftBanner({ savedAt: draft.savedAt });
      }
    } catch {
      // ignore malformed draft
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!title && !content) return;
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(draftKey, JSON.stringify({ title, excerpt, content, contentType, savedAt: Date.now() }));
      } catch {
        // localStorage đầy/bị chặn — bỏ qua autosave, không chặn viết bài
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [title, excerpt, content, contentType, draftKey]);

  const restoreDraft = () => {
    try {
      const raw = localStorage.getItem(draftKey);
      if (raw) {
        const draft = JSON.parse(raw);
        setTitle(draft.title || '');
        setExcerpt(draft.excerpt || '');
        setContent(draft.content || '');
        if (isArticleContentType(draft.contentType)) setContentType(draft.contentType);
      }
    } catch {
      // ignore
    }
    setDraftBanner(null);
  };

  const dismissDraft = () => {
    try {
      localStorage.removeItem(draftKey);
    } catch {
      // ignore
    }
    setDraftBanner(null);
  };
  const [status, setStatus] = useState(editingArticle?.status || 'published');
  const [isFeatured, setIsFeatured] = useState(editingArticle?.isFeatured || editingArticle?.is_featured || false);
  const [categoryId, setCategoryId] = useState(editingArticle?.categoryId || editingArticle?.category_id?._id || editingArticle?.category_id || '');
  const [subCategoryId, setSubCategoryId] = useState(editingArticle?.subCategoryId || editingArticle?.sub_category_id?._id || editingArticle?.sub_category_id || '');
  const [thumbnailUrl, setThumbnailUrl] = useState(editingArticle?.thumbnailUrl || editingArticle?.thumbnail_url || '');
  const [metaTitle, setMetaTitle] = useState(editingArticle?.metaTitle || editingArticle?.meta_title || '');
  const [metaDescription, setMetaDescription] = useState(editingArticle?.metaDescription || editingArticle?.meta_description || '');

  // GEO States
  const [focusKeyword, setFocusKeyword] = useState(editingArticle?.focusKeyword || editingArticle?.focus_keyword || '');
  const [keyTakeawaysText, setKeyTakeawaysText] = useState<string>(
    typeof editingArticle?.keyTakeaways === 'string'
      ? editingArticle.keyTakeaways
      : Array.isArray(editingArticle?.keyTakeaways || editingArticle?.key_takeaways)
        ? (editingArticle?.keyTakeaways || editingArticle?.key_takeaways).join('\n')
        : ''
  );
  const [entitiesText, setEntitiesText] = useState<string>(
    typeof editingArticle?.entities === 'string'
      ? editingArticle.entities
      : Array.isArray(editingArticle?.entities)
        ? editingArticle.entities.join(', ')
        : ''
  );
  const [faqRows, setFaqRows] = useState<Array<{ question: string; answer: string }>>(
    Array.isArray(editingArticle?.faqSchema || editingArticle?.faq_schema) && (editingArticle?.faqSchema || editingArticle?.faq_schema).length > 0
      ? (editingArticle?.faqSchema || editingArticle?.faq_schema)
      : Array.isArray(editingArticle?.faq_list) && editingArticle.faq_list.length > 0
        ? editingArticle.faq_list
        : [{ question: '', answer: '' }]
  );
  // D-12: inline validation for the required Level-1 category. Set on a blocked
  // save, cleared the moment a category is chosen. GEO fields are never part of
  // this guard (D-09).
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [isUploadingThumbnail, setIsUploadingThumbnail] = useState(false);
  // Preview nội dung đang viết dở (chưa lưu) — overlay cục bộ trong chính form
  // này, KHÔNG dùng chung previewArticle/navigate() của trang ngoài, vì
  // navigate() sẽ set editingArticle = null làm unmount hẳn ArticleEditorForm
  // (state title/content sống trong chính component này, không phải ở parent)
  // — mất hết nội dung đang gõ dở khi bấm quay lại từ preview.
  const [showLivePreview, setShowLivePreview] = useState(false);
  const [affiliatePlacements, setAffiliatePlacements] = useState<Array<{ affiliate_link_id: string; position_label: string }>>(
    (() => {
      const raw = editingArticle?.affiliatePlacements || editingArticle?.affiliate_placements || [];
      return raw.map((p: any) => ({
        affiliate_link_id: p.affiliate_link_id?._id || p.affiliate_link_id,
        position_label: p.position_label,
      }));
    })()
  );

  // D-03/D-04: load-failure guard. Re-loading the requested article through the
  // shared helper (which always attaches Authorization) doubles as the
  // authoritative fetch and the 404/403/401 detector — a failed load renders
  // the inline error panel, never a blank form a user could overwrite.
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoadingArticle, setIsLoadingArticle] = useState(false);

  useEffect(() => {
    const articleId = editingArticle?.id;
    if (!articleId) return;

    let cancelled = false;
    setIsLoadingArticle(true);
    cmsFetch<Record<string, unknown>>(`/api/v1/cms/articles/${articleId}`, {
      token: localStorage.getItem('token'),
    }).then((result) => {
      if (cancelled) return;
      setIsLoadingArticle(false);
      if (!result.ok) {
        setLoadError(result.message);
        handleCmsFailure(result.status, result.message);
        return;
      }
      const doc = result.data as {
        title?: string;
        contentType?: ArticleContentType;
        slug?: string;
        excerpt?: string;
        content?: string;
        status?: string;
        isFeatured?: boolean;
        categoryId?: string;
        subCategoryId?: string;
        thumbnailUrl?: string;
        metaTitle?: string;
        metaDescription?: string;
        focusKeyword?: string;
        keyTakeaways?: string[];
        entities?: string[];
        faqSchema?: { question: string; answer: string }[];
        affiliatePlacements?: { affiliate_link_id?: unknown; position_label: string }[];
      };
      if (!doc) return;
      // Re-hydrate from the authoritative server copy.
      setTitle(doc.title || '');
      setContentType(doc.contentType || '');
      setSlug(doc.slug || '');
      setExcerpt(doc.excerpt || '');
      setContent(doc.content || '');
      if (doc.status) setStatus(doc.status);
      setIsFeatured(Boolean(doc.isFeatured));
      setCategoryId(doc.categoryId || '');
      setSubCategoryId(doc.subCategoryId || '');
      setThumbnailUrl(doc.thumbnailUrl || '');
      setMetaTitle(doc.metaTitle || '');
      setMetaDescription(doc.metaDescription || '');
      setFocusKeyword(doc.focusKeyword || '');
      setKeyTakeawaysText(Array.isArray(doc.keyTakeaways) ? doc.keyTakeaways.join('\n') : '');
      setEntitiesText(Array.isArray(doc.entities) ? doc.entities.join(', ') : '');
      setFaqRows(
        Array.isArray(doc.faqSchema) && doc.faqSchema.length > 0
          ? doc.faqSchema
          : [{ question: '', answer: '' }]
      );
      setAffiliatePlacements(
        (Array.isArray(doc.affiliatePlacements) ? doc.affiliatePlacements : []).map((p) => {
          const link = p.affiliate_link_id;
          const id =
            link && typeof link === 'object'
              ? ((link as { _id?: string })._id ?? '')
              : ((link as string | undefined) ?? '');
          return { affiliate_link_id: id, position_label: p.position_label };
        })
      );
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedCategoryObj = categoriesList.find((c) => c.id === Number(categoryId) || c.id === categoryId);

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!slug) {
      const generated = val
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[đĐ]/g, 'd')
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-');
      setSlug(generated);
    }
  };

  const handleAiTakeawaysGenerate = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/v1/cms/ai/generate-takeaways', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title, content }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.status === 'success' && json.data) {
          setKeyTakeawaysText(json.data.keyTakeaways.join('\n'));
          if (!entitiesText) {
            setEntitiesText(json.data.entities.join(', '));
          }
          alert('Key takeaways and entities generated successfully.');
          return;
        }
      }
    } catch { }
    setKeyTakeawaysText(
      `- Explore the solution discussed in "${title || 'AI Insights'}".\n- Review how generative AI can support the workflow.\n- Identify opportunities to automate routine tasks.`
    );
    alert('Sample key takeaways added. Review them before publishing.');
  };

  const addFaqRow = () => {
    setFaqRows([...faqRows, { question: '', answer: '' }]);
  };

  const removeFaqRow = (index: number) => {
    setFaqRows(faqRows.filter((_, i) => i !== index));
  };

  const updateFaqRow = (index: number, field: 'question' | 'answer', val: string) => {
    // Clone-then-set (immutable) so React sees a new array AND new row object —
    // a shallow copy would still alias the row, mutating state in place.
    setFaqRows(
      faqRows.map((row, i) => (i === index ? { ...row, [field]: val } : row))
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    // Category and the manually selected content tag are required.
    // GEO metadata stays optional.
    const isContentEmpty = !content || content.replace(/<[^>]*>/g, '').trim().length === 0;
    if (isContentEmpty) {
      showCmsToast('error', 'Add a title, slug, and content before saving.');
      return;
    }

    if (!categoryId) {
      setCategoryError('Choose a primary category.');
      showCmsToast('error', 'Choose a primary category.');
      return;
    }
    setCategoryError(null);
    if (!isArticleContentType(contentType)) {
      setContentTypeError('Choose a content tag: Review, Case Study, or Guide.');
      showCmsToast('error', 'Choose a content tag: Review, Case Study, or Guide.');
      return;
    }
    setContentTypeError(null);

    const token = localStorage.getItem('token');

    const takeawaysList = keyTakeawaysText
      .split('\n')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const entitiesList = entitiesText
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const validFaq = faqRows.filter((f) => f.question.trim() && f.answer.trim());

    const payload = {
      ...(editingArticle?.id ? {} : { id: pendingId }),
      contentType,
      title,
      slug,
      excerpt,
      content,
      status,
      isFeatured,
      categoryId: categoryId || undefined,
      subCategoryId: subCategoryId || undefined,
      thumbnailUrl,
      focusKeyword,
      metaTitle: metaTitle || title,
      metaDescription: metaDescription || excerpt,
      keyTakeaways: takeawaysList,
      entities: entitiesList,
      faqSchema: validFaq,
      affiliatePlacements,
    };

    // D-03: every editor save goes through the shared auth-fetch helper — it
    // attaches the bearer token and normalizes the response, so a non-2xx can
    // never be mistaken for a success.
    const result = editingArticle?.id
      ? await cmsFetch(`/api/v1/cms/articles/${editingArticle.id}`, {
          method: 'PUT',
          token,
          body: payload,
        })
      : await cmsFetch('/api/v1/cms/articles', { method: 'POST', token, body: payload });

    if (result.ok) {
      showCmsToast('success', 'Article saved successfully.');
      try {
        localStorage.removeItem(draftKey);
      } catch {
        // ignore
      }
      navigate({ tab: 'articles', editingArticle: null }, { replace: true });
      loadAllData();
      return;
    }

    handleCmsFailure(result.status, result.message);
  };

  const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingThumbnail(true);
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', file);

      const result = await cmsFetch<{ url: string }>('/api/v1/cms/upload', {
        method: 'POST',
        token,
        body: formData,
      });

      if (result.ok) {
        setThumbnailUrl(result.data.url);
      } else {
        handleCmsFailure(result.status, result.message);
      }
    } finally {
      setIsUploadingThumbnail(false);
      e.target.value = '';
    }
  };

  const togglePlacement = (affiliateLinkId: string, positionLabel: string) => {
    const exists = affiliatePlacements.some(
      (p) => p.affiliate_link_id === affiliateLinkId && p.position_label === positionLabel
    );
    if (exists) {
      setAffiliatePlacements(
        affiliatePlacements.filter(
          (p) => !(p.affiliate_link_id === affiliateLinkId && p.position_label === positionLabel)
        )
      );
    } else {
      setAffiliatePlacements([...affiliatePlacements, { affiliate_link_id: affiliateLinkId, position_label: positionLabel }]);
    }
  };

  // D-03/D-04: a failed article load must never render an empty editor form a
  // user could mistake for a blank article. Render the documented inline error
  // panel (or a loading panel while the authoritative copy is in flight) in
  // place of the form.
  if (loadError) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto pb-20 animate-in fade-in duration-300">
        <div className="flex items-center gap-4 text-slate-400">
          <button
            onClick={() => navigate({ tab: 'articles', editingArticle: null }, { replace: true })}
            className="hover:text-white flex items-center gap-1 transition-colors text-xs font-semibold"
          >
            ← Back to Articles List
          </button>
        </div>
        <div className="bg-rose-500/[0.07] border border-rose-500/30 rounded-2xl p-8 text-center space-y-2">
          <AlertCircle size={28} className="mx-auto text-rose-400" />
          <p className="text-white font-bold text-sm">This article couldn&apos;t be loaded.</p>
          <p className="text-slate-400 text-xs">{loadError}</p>
          <p className="text-slate-500 text-xs">Reload the page, or go back to the article list.</p>
        </div>
      </div>
    );
  }

  if (isLoadingArticle && editingArticle?.id) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto pb-20 animate-in fade-in duration-300">
        <div className="flex items-center gap-4 text-slate-400">
          <button
            onClick={() => navigate({ tab: 'articles', editingArticle: null }, { replace: true })}
            className="hover:text-white flex items-center gap-1 transition-colors text-xs font-semibold"
          >
            ← Back to Articles List
          </button>
        </div>
        <div className="flex items-center justify-center h-64 text-slate-500 text-sm gap-2">
          <Loader2 size={16} className="animate-spin" /> Loading article…
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-20 animate-in fade-in zoom-in-95 duration-300">
      <div className="flex items-center gap-4 text-slate-400">
        <button
          onClick={() => navigate({ tab: 'articles', editingArticle: null }, { replace: true })}
          className="hover:text-white flex items-center gap-1 transition-colors text-xs font-semibold"
        >
          ← Back to Articles List
        </button>
        <ChevronRight size={14} />
        <span className="text-amber-400 font-bold text-xs">
          {editingArticle?.id ? 'Edit Article' : 'Create Article'}
        </span>
        <button
          type="button"
          onClick={() => setShowLivePreview(true)}
          disabled={!title.trim() && !content.trim()}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-cyan-300 bg-cyan-500/10 border border-cyan-500/30 hover:bg-cyan-500/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <Globe size={13} /> Preview
        </button>
      </div>

      {draftBanner && (
        <div className="flex items-center justify-between gap-3 bg-cyan-500/10 border border-cyan-500/30 rounded-xl px-4 py-2.5 text-xs">
          <span className="text-cyan-300">
            An autosaved draft from {new Date(draftBanner.savedAt).toLocaleTimeString('en-US')} is available. Restore it?
          </span>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={restoreDraft}
              className="px-3 py-1 rounded-lg bg-cyan-500/20 text-cyan-300 font-bold hover:bg-cyan-500/30"
            >
              Restore Draft
            </button>
            <button type="button" onClick={dismissDraft} className="px-3 py-1 rounded-lg text-slate-400 hover:text-white">
              Dismiss
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Column (Span 2) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Core Info */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-white font-bold text-sm flex items-center gap-2">
                <FileText size={16} className="text-amber-400" /> Article Content
              </h3>
              <span className="text-[10px] bg-amber-500/10 text-amber-400 px-2.5 py-0.5 rounded font-bold border border-amber-500/20">
                Automatic URL Slug
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Article Title (H1) *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-amber-500 text-base shadow-inner font-bold"
                placeholder="Enter article title..."
                required
              />
            </div>

            <div>
              <label htmlFor="article-content-type" className="block text-xs font-semibold text-slate-300 mb-1">Content Tag *</label>
              <select
                id="article-content-type"
                value={contentType}
                onChange={(e) => { setContentType(e.target.value as ArticleContentType | ''); setContentTypeError(null); }}
                aria-required="true"
                aria-invalid={Boolean(contentTypeError)}
                aria-describedby="article-content-type-help"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
              >
                <option value="" disabled>Choose a content tag</option>
                {ARTICLE_CONTENT_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
              </select>
              <p id="article-content-type-help" className="mt-1 text-xs text-slate-500">Review: product evaluations. Case Study: insights and real-world applications. Guide: step-by-step instructions.</p>
              {contentTypeError && <p role="alert" className="mt-1 text-xs text-rose-400">{contentTypeError}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Excerpt (Summary for Article Cards)</label>
              <textarea
                rows={2}
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-300 text-xs focus:outline-none focus:border-amber-500 shadow-inner resize-none"
                placeholder="Short introduction for homepage cards..."
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Thumbnail Image</label>
              <div className="flex items-center gap-3 mb-2">
                {thumbnailUrl && (
                  <img
                    src={thumbnailUrl}
                    alt="Thumbnail preview"
                    className="w-14 h-14 rounded-lg object-cover border border-slate-800 shrink-0"
                  />
                )}
                <label className="flex-1 cursor-pointer">
                  <span className="w-full inline-flex items-center justify-center gap-2 bg-slate-950 border border-dashed border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-400 hover:bg-slate-900 hover:border-amber-500 transition">
                    {isUploadingThumbnail ? 'Uploading image...' : 'Upload an image (JPEG, PNG, WebP, or GIF; up to 5 MB)'}
                  </span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={handleThumbnailUpload}
                    disabled={isUploadingThumbnail}
                    className="hidden"
                  />
                </label>
              </div>
              <input
                type="url"
                value={thumbnailUrl}
                onChange={(e) => setThumbnailUrl(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                placeholder="Or paste an image URL..."
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 mb-2 block">Article Content (Rich Text) *</label>
              <RichTextEditor
                value={content}
                onChange={setContent}
                articleId={pendingId}
                affiliateLinks={affiliateLinksList}
              />
            </div>
          </div>

          {/* GEO Hub Card */}
          <div className="bg-slate-900/60 border-l-4 border-l-purple-500 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-purple-400" />
                <h3 className="text-white font-bold text-sm">AI Search Metadata</h3>
              </div>
              <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2.5 py-0.5 rounded font-bold border border-purple-500/30">
                Optional
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-purple-300">
                  <span>Key Takeaways</span>
                  <button
                    type="button"
                    onClick={handleAiTakeawaysGenerate}
                    className="text-[10px] text-cyan-400 hover:underline font-semibold"
                  >
                    Generate Suggestions
                  </button>
                </div>
                <textarea
                  rows={4}
                  value={keyTakeawaysText}
                  onChange={(e) => setKeyTakeawaysText(e.target.value)}
                  placeholder="- Key takeaway 1&#10;- Key takeaway 2"
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 space-y-2">
                <span className="text-xs font-bold text-purple-300 block">Entities</span>
                <textarea
                  rows={4}
                  value={entitiesText}
                  onChange={(e) => setEntitiesText(e.target.value)}
                  placeholder="Separate entities with commas: OpenAI, GPT-4o, NVIDIA"
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            {/* FAQ Schema Row Builder */}
            <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300">FAQ Structured Data</span>
                <button
                  type="button"
                  onClick={addFaqRow}
                  className="text-[10px] bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 px-2.5 py-1 rounded font-bold border border-purple-500/30"
                >
                  + Add question
                </button>
              </div>
              {faqRows.length === 0 ? (
                <p className="text-xs text-slate-500">
                  No FAQ pairs yet. Add a question to embed FAQPage structured data on the public article.
                </p>
              ) : (
                <div className="space-y-2">
                  {faqRows.map((row, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <input
                        type="text"
                        value={row.question}
                        onChange={(e) => updateFaqRow(idx, 'question', e.target.value)}
                        placeholder="Question…"
                        aria-label={`FAQ question ${idx + 1}`}
                        className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white"
                      />
                      <input
                        type="text"
                        value={row.answer}
                        onChange={(e) => updateFaqRow(idx, 'answer', e.target.value)}
                        placeholder="Answer…"
                        aria-label={`FAQ answer ${idx + 1}`}
                        className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white"
                      />
                      <button
                        type="button"
                        onClick={() => removeFaqRow(idx)}
                        title="Remove this question"
                        aria-label={`Remove FAQ row ${idx + 1}`}
                        className="p-1.5 text-red-400 hover:bg-red-500/20 rounded"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-[10px] text-slate-500">
                Rows with an empty question or answer are ignored when saving.
              </p>
            </div>
          </div>

          {/* SEO Metadata */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-white font-bold text-sm flex items-center gap-2">
                <Search size={16} className="text-emerald-400" /> SEO Metadata
              </h3>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2.5 py-0.5 rounded font-bold border border-emerald-500/20">
                Search Appearance
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Focus Keyword</label>
                <input
                  type="text"
                  value={focusKeyword}
                  onChange={(e) => setFocusKeyword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  placeholder="e.g. AI productivity tools"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">URL Slug *</label>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Meta Title</label>
              <input
                type="text"
                value={metaTitle}
                onChange={(e) => setMetaTitle(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Meta Description</label>
              <textarea
                rows={2}
                value={metaDescription}
                onChange={(e) => setMetaDescription(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Right Column (Span 1) */}
        <div className="space-y-6">
          {/* Category & Status */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm space-y-4">
            <h3 className="text-white font-medium flex items-center gap-2 border-b border-slate-800 pb-3">
              <Tag size={16} className="text-amber-400" /> Categories and Publishing
            </h3>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Primary Category (Level 1)</label>
              <select
                value={categoryId}
                onChange={(e) => {
                  setCategoryId(e.target.value);
                  setSubCategoryId('');
                  if (e.target.value) setCategoryError(null);
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:border-amber-500 focus:outline-none font-medium"
              >
                <option value="">-- Select Category --</option>
                {categoriesList.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
              {categoryError && (
                <p className="mt-1 text-xs text-rose-400">{categoryError}</p>
              )}
            </div>

            {selectedCategoryObj && selectedCategoryObj.subCategories?.length > 0 && (
              <div>
                <label className="block text-xs text-slate-400 mb-1">Subcategory (Optional)</label>
                <select
                  value={subCategoryId}
                  onChange={(e) => setSubCategoryId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:border-amber-500 focus:outline-none font-medium"
                >
                  <option value="">-- Select Subcategory --</option>
                  {selectedCategoryObj.subCategories.map((sub: any) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="pt-2 border-t border-slate-800 space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Publishing Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs"
                >
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isFeatured"
                  checked={isFeatured}
                  onChange={(e) => setIsFeatured(e.target.checked)}
                  className="rounded bg-slate-950 border-slate-800 text-amber-500 focus:ring-amber-400 cursor-pointer"
                />
                <label
                  htmlFor="isFeatured"
                  className="text-xs font-bold text-amber-400 cursor-pointer flex items-center gap-1"
                >
                  <Star size={14} /> Feature This Article
                </label>
              </div>
            </div>
          </div>

          {/* Multi-Affiliate Link Placement */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm space-y-4 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-amber-400 to-yellow-600"></div>
            <h3 className="text-white font-medium flex items-center gap-2 border-b border-slate-800 pb-3">
              <LinkIcon size={16} className="text-amber-400" /> Affiliate Link Placements
            </h3>

            <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
              {affiliateLinksList.map((link) => {
                const topActive = affiliatePlacements.some(
                  (p) => p.affiliate_link_id === link.id && p.position_label === 'top_cta'
                );
                const middleActive = affiliatePlacements.some(
                  (p) => p.affiliate_link_id === link.id && p.position_label === 'middle_comparison'
                );
                const footerActive = affiliatePlacements.some(
                  (p) => p.affiliate_link_id === link.id && p.position_label === 'footer_banner'
                );

                return (
                  <div key={link.id} className="bg-slate-950 border border-slate-800 p-3 rounded-xl space-y-2">
                    <p className="text-xs font-bold text-white truncate">{link.name}</p>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => togglePlacement(link.id, 'top_cta')}
                        className={`flex-1 border text-[10px] font-semibold py-1 rounded ${topActive
                          ? 'bg-amber-500/30 text-amber-300 border-amber-400'
                          : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border-amber-500/30'
                          }`}
                      >
                        + Top Call to Action
                      </button>
                      <button
                        type="button"
                        onClick={() => togglePlacement(link.id, 'middle_comparison')}
                        className={`flex-1 border text-[10px] font-semibold py-1 rounded ${middleActive
                          ? 'bg-cyan-500/30 text-cyan-300 border-cyan-400'
                          : 'bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
                          }`}
                      >
                        + Middle Section
                      </button>
                      <button
                        type="button"
                        onClick={() => togglePlacement(link.id, 'footer_banner')}
                        className={`flex-1 border text-[10px] font-semibold py-1 rounded ${footerActive
                          ? 'bg-purple-500/30 text-purple-300 border-purple-400'
                          : 'bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border-purple-500/30'
                          }`}
                      >
                        + Footer Section
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <LuxuryButton type="submit" className="w-full py-3 text-sm">
            Save Article
          </LuxuryButton>
        </div>
      </form>

      {showLivePreview && (
        <PublicArticlePreview
          article={{
            title: title || 'Untitled',
            content,
            thumbnailUrl,
            authorName: currentUser?.name || currentUser?.username,
          }}
          onBack={() => setShowLivePreview(false)}
        />
      )}
    </div>
  );
};

// Preview Modal — toggle overlay: bấm ra ngoài vùng nội dung (backdrop) cũng
// đóng lại, giống hành vi modal chuẩn thay vì chiếm nguyên màn hình trước đây.
const PublicArticlePreview = ({ article, onBack }: any) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onBack();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onBack]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200 flex justify-center p-4 md:p-8"
      onClick={onBack}
    >
      <div
        className="w-full max-w-4xl h-fit bg-[#0c0c0e] rounded-2xl border border-white/10 shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300 font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        <nav className="border-b border-white/10 bg-black/60 backdrop-blur-md sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="text-xl font-bold tracking-tighter text-white flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
              NEXUS<span className="text-amber-400 font-light">FINANCE</span>
            </div>
            <button
              onClick={onBack}
              className="text-sm text-slate-400 hover:text-white flex items-center gap-1 border border-slate-700 px-4 py-2 rounded-full hover:bg-slate-800 transition-colors"
            >
              Close Preview
            </button>
          </div>
        </nav>

        <article className="max-w-3xl mx-auto px-6 py-16">
          <div className="mb-10 text-center">
            <div className="text-amber-400 text-sm font-semibold tracking-widest uppercase mb-4">In-Depth Analysis</div>
            <h1 className="text-3xl md:text-5xl font-bold text-white mb-6 leading-tight">{article.title}</h1>
            <div className="flex items-center justify-center gap-4 text-sm text-slate-400">
              <span>By <strong>{article.authorName || 'Global Analyst'}</strong></span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Eye size={14} /> {article.viewCount?.toLocaleString('en-US') || 0} views
              </span>
            </div>
          </div>

          {article.thumbnailUrl && (
            <div className="w-full h-64 md:h-80 rounded-2xl overflow-hidden border border-slate-800 mb-10">
              <img src={article.thumbnailUrl} alt={article.title} className="w-full h-full object-cover" />
            </div>
          )}

          <div
            className="prose prose-invert prose-lg max-w-none text-slate-300 leading-relaxed font-serif"
            dangerouslySetInnerHTML={{ __html: sanitizeArticleContent(article.content) }}
          />
        </article>
      </div>
    </div>
  );
};


const NavItem = ({ icon: Icon, label, active, onClick, requiredRole, currentUser }: {
  id: string; icon: React.ElementType; label: string; active: boolean; onClick: () => void;
  requiredRole?: string; currentUser: { role: string };
}) => {
  if (requiredRole && currentUser.role !== requiredRole) return null;
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 font-medium text-sm cursor-pointer ${active
        ? 'bg-gradient-to-r from-amber-500/15 to-transparent text-amber-400 border border-amber-500/20 shadow-[0_0_15px_rgba(251,191,36,0.05)]'
        : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
        }`}
    >
      <Icon size={18} className={active ? 'text-amber-400' : 'text-slate-500'} /> {label}
    </button>
  );
};
