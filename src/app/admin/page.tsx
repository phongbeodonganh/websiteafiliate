'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { sanitizeArticleContent } from '@/lib/sanitize';
import { generateObjectId } from '@/lib/utils';
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
} from 'lucide-react';

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

const StatCard = ({ title, value, icon: Icon, trend, subtext }: any) => (
  <div className="relative overflow-hidden rounded-2xl bg-slate-900/50 border border-slate-800 backdrop-blur-xl p-6 group hover:border-amber-500/30 transition-all duration-500">
    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110 duration-500">
      <Icon size={100} className="text-amber-400" />
    </div>
    <div className="relative z-10">
      <div className="flex items-center gap-3 text-slate-400 mb-2">
        <div className="p-2 bg-slate-950/50 rounded-lg border border-slate-800">
          <Icon size={16} className="text-amber-400" />
        </div>
        <h3 className="font-medium text-xs tracking-wider uppercase">{title}</h3>
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

export default function AdminDashboardPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);

  // System States
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [articlesList, setArticlesList] = useState<any[]>([]);
  const [editingArticle, setEditingArticle] = useState<any>(null);
  const [previewArticle, setPreviewArticle] = useState<any>(null);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [affiliateLinksList, setAffiliateLinksList] = useState<any[]>([]);
  const [categoriesList, setCategoriesList] = useState<any[]>([]);
  const [settingsData, setSettingsData] = useState<any>(null);
  // Subscribers Leads State
  const [subscribersList, setSubscribersList] = useState<any[]>([]);
  const [subscribersStats, setSubscribersStats] = useState<any>({ totalSubscribers: 0, countToday: 0, countThisWeek: 0 });
  const [subscriberSearchQuery, setSubscriberSearchQuery] = useState('');

  // User Modal State
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('editor');

  // Category & Sub-Category Modal States
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

  // Khôi phục state từ URL khi bấm Back/Forward (hoặc khi mở thẳng link có sẵn
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
    try {
      const res = await fetch('/api/v1/cms/blacklist/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: urlStr }),
      });
      const data = await res.json();
      if (data.status === 'success' && data.data?.isBlacklisted) {
        setAffUrlBlacklistError({
          isError: true,
          projectName: data.data.projectName,
          matchedDomain: data.data.matchedDomain,
          reason: data.data.reason,
          blockedCountries: data.data.blockedCountries || [],
        });
      } else {
        setAffUrlBlacklistError(null);
      }
    } catch {
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
      alert('Vui lòng nhập URL Google Sheet.');
      return;
    }
    setIsImportingSheet(true);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('/api/v1/cms/blacklist/import-sheet-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ sheetUrl: importSheetUrl }),
      });
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        alert(`📥 NẠP THÀNH CÔNG NGUYÊN SHEET GOOGLE!\n\n📊 Thống kê:\n- Đã nạp thành công: ${data.data.totalImported} domain/dự án cấm từ Google Sheet.\n- Tự động làm sạch: ${data.data.totalSweptCampaigns} chiến dịch affiliate bị ảnh hưởng.`);
        setShowImportSheetModal(false);
        loadAllData();
      } else {
        alert(`Lỗi nạp Google Sheet: ${data.message}`);
      }
    } catch {
      alert('Không thể kết nối hoặc nạp Google Sheet');
    } finally {
      setIsImportingSheet(false);
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
    if (!confirm('Are you sure you want to delete this subscriber lead?')) return;
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`/api/v1/cms/subscribers/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) loadSubscribersData();
    } catch (err) {
      alert('Error deleting subscriber');
    }
  };

  const loadUsersData = () => {
    const token = localStorage.getItem('token');
    fetch('/api/v1/cms/users', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => d.status === 'success' && setUsersList(d.data));
  };

  useEffect(() => {
    if (activeTab === 'users' && currentUser?.role === 'admin') {
      loadUsersData();
    }
    if (activeTab === 'subscribers' && currentUser?.role === 'admin') {
      loadSubscribersData();
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
        alert('New team member added successfully!');
        setShowAddUserModal(false);
        setNewUsername('');
        setNewPassword('');
        setNewName('');
        loadUsersData();
      } else {
        alert(`Error: ${data.message}`);
      }
    } catch (err) {
      alert('Failed to add user');
    }
  };

  const handleOpenAiModal = (campaign?: any) => {
    if (campaign) {
      setAiModalCampaign(campaign);
      setAiModalTopic(`Đánh Giá Chi Tiết ${campaign.name} - Tính Năng & Bảng Giá Mới Nhất 2026`);
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
      setAiModalTopic(`Đánh Giá Chi Tiết ${found.name} - Tính Năng & Bảng Giá Mới Nhất 2026`);
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
        alert(`✨ TẠO BÀI VIẾT THÀNH CÔNG!\n\nTiêu đề: "${data.data.title}"\nTrạng thái: Lưu Nháp (Draft)\nĐã cào dữ liệu bằng Jina AI & Lọc link an toàn.`);
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
        alert(`Lỗi sinh bài viết AI: ${data.message}`);
      }
    } catch {
      alert('Không thể kết nối API AI Generator');
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
        alert('Affiliate Campaign added successfully!');
        setNewAffName('');
        setNewAffUrl('');
        setNewAffProductUrl('');
        loadAllData();
      } else {
        alert(data.message);
      }
    } catch (err) {
      alert('Error adding link');
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
      alert('Error deleting campaign');
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
        alert('Global System, UI Theme & SEO/GEO settings saved successfully!');
      } else {
        alert(`Error: ${data.message}`);
      }
    } catch (err) {
      alert('Failed to save settings');
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
        alert(editingCategoryObj?.id ? 'Category updated successfully!' : 'Main Category created successfully!');
        setShowCategoryModal(false);
        setEditingCategoryObj(null);
        setCatName(''); setCatSlug(''); setCatDesc(''); setCatMetaTitle(''); setCatMetaDesc('');
        loadAllData();
      } else {
        alert(`Error: ${data.message}`);
      }
    } catch (err) {
      alert('Failed to save category');
    }
  };

  const handleDeleteCategory = async (id: number) => {
    if (!confirm('Are you sure you want to delete this main category? Linked sub-categories will be removed.')) return;
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`/api/v1/cms/categories/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) loadAllData();
    } catch (err) {
      alert('Error deleting category');
    }
  };

  const handleSaveSubCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    const payload = {
      categoryId: Number(subCatParentId),
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
        alert(editingSubCategoryObj?.id ? 'Sub-category updated!' : 'Sub-category created successfully!');
        setShowSubCategoryModal(false);
        setEditingSubCategoryObj(null);
        setSubCatName(''); setSubCatSlug(''); setSubCatDesc(''); setSubCatMetaTitle(''); setSubCatMetaDesc('');
        loadAllData();
      } else {
        alert(`Error: ${data.message}`);
      }
    } catch (err) {
      alert('Failed to save sub-category');
    }
  };

  const handleDeleteSubCategory = async (id: number) => {
    if (!confirm('Are you sure you want to delete this sub-category?')) return;
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`/api/v1/cms/sub-categories/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) loadAllData();
    } catch (err) {
      alert('Error deleting sub-category');
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
          <span>Loading Affiliate Pro Global CMS...</span>
        </div>
      </div>
    );
  }

  // --- VIEWS ---

  // Dashboard Overview
  const DashboardView = () => {
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
          <p className="text-slate-400 text-sm">Monitor traffic metrics, CTR conversion rates, and estimated commissions.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard title="Total Page Views" value={totalViews.toLocaleString()} icon={Eye} trend="+14.2%" subtext="vs last month" />
          <StatCard title="Affiliate Clicks" value={totalClicks.toLocaleString()} icon={MousePointerClick} trend="+9.5%" subtext="Verified tracking" />
          <StatCard title="Conversion CTR" value={`${conversionRate}%`} icon={Activity} trend="+1.4%" subtext="Global average" />
          <StatCard title="Est. Revenue" value={`$${totalRevenue.toLocaleString()}`} icon={DollarSign} trend="+18.7%" subtext="Pending audit" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Articles */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-white font-medium flex items-center gap-2">
                <Activity size={18} className="text-amber-400" /> Top Performing Articles
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
                          <Eye size={12} /> {article.viewCount?.toLocaleString()}
                        </span>
                        <span className="flex items-center gap-1 text-emerald-400/70">
                          <MousePointerClick size={12} /> {article.clicks?.toLocaleString()} clicks
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
                  <Trophy size={18} className="text-amber-400" /> Top Content Creator Leaderboard
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
                        <p className="text-sm font-bold text-emerald-400">{stat.clicks.toLocaleString()} Clicks</p>
                        <p className="text-xs text-slate-500">{stat.views.toLocaleString()} Views</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm flex flex-col justify-center items-center text-slate-400 text-center">
              <Shield size={48} className="text-amber-400/30 mb-3" />
              <p className="font-semibold text-white">Isolated Editor Workspace</p>
              <p className="text-xs text-slate-500 max-w-xs mt-1">Data is isolated strictly to articles created by your account (@{currentUser.username}).</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  // User Management View
  const UsersView = () => (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">Global Team & Creator Management</h2>
          <p className="text-slate-400 text-sm">Add team members, assign RBAC roles, and enforce data isolation policies.</p>
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
              <th className="p-4 font-medium">RBAC Role</th>
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
                  <button className="p-2 text-slate-400 hover:text-white" title="Edit User">
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
                <label className="block text-xs font-semibold text-slate-400 mb-1">RBAC Role</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="editor">Editor (Isolated Content)</option>
                  <option value="author">Author (Article Creator)</option>
                  <option value="admin">Administrator (Full Access)</option>
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
                  Create User
                </LuxuryButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );

  // Articles View & Editor Form
  const ArticlesView = () => (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">Content & Affiliate Placement Management</h2>
          <p className="text-slate-400 text-sm">Author articles, assign multi-level categories, and embed multi-position affiliate links.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => handleOpenAiModal()}
            className="px-4 py-2.5 rounded-xl font-bold text-xs bg-gradient-to-r from-cyan-500 to-violet-600 text-slate-950 hover:opacity-90 transition-all flex items-center gap-2 shadow-lg shadow-cyan-500/20 cursor-pointer"
          >
            <Sparkles size={16} /> ✨ Tạo Bài Viết AI Ngay
          </button>
          <LuxuryButton onClick={() => navigate({ editingArticle: {} })}>
            <Plus size={18} /> Create New Article
          </LuxuryButton>
        </div>
      </div>

      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-950/50 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-800">
              <th className="p-4 font-medium">Article Title & Category</th>
              {currentUser.role === 'admin' && <th className="p-4 font-medium">Author</th>}
              <th className="p-4 font-medium">Status & Featured</th>
              <th className="p-4 font-medium">Performance</th>
              <th className="p-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {articlesList.map((art) => (
              <tr key={art.id} className="border-b border-slate-800 hover:bg-white/[0.02] transition-colors">
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-white truncate max-w-[250px] lg:max-w-[350px]">{art.title}</p>
                    {art.isFeatured && (
                      <span className="bg-amber-500/10 text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded border border-amber-500/20 flex items-center gap-0.5">
                        <Star size={10} /> HOT
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                    <span>/{art.slug}</span>
                    {art.categoryName && <span className="text-amber-400 font-semibold">• {art.categoryName}</span>}
                  </div>
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
                      <Eye size={12} className="text-slate-500" /> {art.viewCount?.toLocaleString()} views
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
          </tbody>
        </table>
      </div>
    </div>
  );

  // Article Editor Form V5.1 (SEO & GEO Studio)
  const ArticleEditorForm = () => {
    // ID sinh trước ở client cho bài mới (chưa có editingArticle.id), dùng để
    // gắn link/nút affiliate có theo dõi ngay cả khi chưa bấm Save. Nếu bài
    // được lưu, id này được gửi kèm để MongoDB dùng làm _id thật; nếu không
    // bao giờ lưu thì id chỉ tồn tại tạm trong state và tự mất khi rời trang.
    const [pendingId] = useState(() => editingArticle?.id || generateObjectId());
    const [title, setTitle] = useState(editingArticle?.title || '');
    const [slug, setSlug] = useState(editingArticle?.slug || '');
    const [excerpt, setExcerpt] = useState(editingArticle?.excerpt || '');
    const [content, setContent] = useState(editingArticle?.content || '');

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
        const isDifferent = draft.title !== (editingArticle?.title || '') || draft.content !== (editingArticle?.content || '');
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
          localStorage.setItem(draftKey, JSON.stringify({ title, excerpt, content, savedAt: Date.now() }));
        } catch {
          // localStorage đầy/bị chặn — bỏ qua autosave, không chặn viết bài
        }
      }, 2000);
      return () => clearTimeout(timer);
    }, [title, excerpt, content, draftKey]);

    const restoreDraft = () => {
      try {
        const raw = localStorage.getItem(draftKey);
        if (raw) {
          const draft = JSON.parse(raw);
          setTitle(draft.title || '');
          setExcerpt(draft.excerpt || '');
          setContent(draft.content || '');
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
            alert('Đã sinh Key Takeaways & Entities chuẩn GEO!');
            return;
          }
        }
      } catch { }
      setKeyTakeawaysText(
        `- Phân tích giải pháp cho bài viết "${title || 'AI Insights'}".\n- Tích hợp mô hình Generative Engine mới nhất.\n- Tối ưu hóa quy trình tự động hóa.`
      );
      alert('Đã sinh Key Takeaways mẫu!');
    };

    const addFaqRow = () => {
      setFaqRows([...faqRows, { question: '', answer: '' }]);
    };

    const removeFaqRow = (index: number) => {
      setFaqRows(faqRows.filter((_, i) => i !== index));
    };

    const updateFaqRow = (index: number, field: 'question' | 'answer', val: string) => {
      const updated = [...faqRows];
      updated[index][field] = val;
      setFaqRows(updated);
    };

    const handleSave = async (e: React.FormEvent) => {
      e.preventDefault();

      const isContentEmpty = !content || content.replace(/<[^>]*>/g, '').trim().length === 0;
      if (isContentEmpty) {
        alert('Vui lòng nhập nội dung bài viết');
        return;
      }

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

      try {
        let res;
        if (editingArticle?.id) {
          res = await fetch(`/api/v1/cms/articles/${editingArticle.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify(payload),
          });
        } else {
          res = await fetch('/api/v1/cms/articles', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify(payload),
          });
        }

        const data = await res.json();
        if (res.ok && data.status === 'success') {
          alert('Article saved successfully with GEO & SEO metadata!');
          try {
            localStorage.removeItem(draftKey);
          } catch {
            // ignore
          }
          navigate({ tab: 'articles', editingArticle: null }, { replace: true });
          loadAllData();
        } else {
          alert(`Error: ${data.message}`);
        }
      } catch (err) {
        alert('Failed to save article');
      }
    };

    const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setIsUploadingThumbnail(true);
      try {
        const token = localStorage.getItem('token');
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch('/api/v1/cms/upload', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        const json = await res.json();

        if (res.ok && json.status === 'success') {
          setThumbnailUrl(json.data.url);
        } else {
          alert(`Lỗi upload: ${json.message || 'Không thể tải ảnh lên'}`);
        }
      } catch {
        alert('Đã có lỗi xảy ra khi tải ảnh lên!');
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
            {editingArticle?.id ? 'Edit Article (SEO & GEO Studio V5.1)' : 'Create Article (SEO & GEO Studio V5.1)'}
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
              Phát hiện bản nháp tự động lưu lúc {new Date(draftBanner.savedAt).toLocaleTimeString('vi-VN')} — khôi phục?
            </span>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={restoreDraft}
                className="px-3 py-1 rounded-lg bg-cyan-500/20 text-cyan-300 font-bold hover:bg-cyan-500/30"
              >
                Khôi phục
              </button>
              <button type="button" onClick={dismissDraft} className="px-3 py-1 rounded-lg text-slate-400 hover:text-white">
                Bỏ qua
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
                  <FileText size={16} className="text-amber-400" /> Basic Information & Main Content
                </h3>
                <span className="text-[10px] bg-amber-500/10 text-amber-400 px-2.5 py-0.5 rounded font-bold border border-amber-500/20">
                  Auto-Slug Active
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
                <label className="block text-xs font-semibold text-slate-300 mb-1">Excerpt (Homepage Sapo Summary)</label>
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
                      {isUploadingThumbnail ? 'Đang tải ảnh lên...' : 'Chọn ảnh từ máy (JPEG/PNG/WEBP/GIF, tối đa 5MB)'}
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
                  placeholder="...hoặc dán URL ảnh thủ công"
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
                  <h3 className="text-white font-bold text-sm">GEO (Generative Engine Optimization) Hub</h3>
                </div>
                <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2.5 py-0.5 rounded font-bold border border-purple-500/30">
                  AI-Ready v5.1
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-purple-300">
                    <span>Key Takeaways (LLMs Summary)</span>
                    <button
                      type="button"
                      onClick={handleAiTakeawaysGenerate}
                      className="text-[10px] text-cyan-400 hover:underline font-semibold"
                    >
                      ⚡ AI Gợi ý
                    </button>
                  </div>
                  <textarea
                    rows={4}
                    value={keyTakeawaysText}
                    onChange={(e) => setKeyTakeawaysText(e.target.value)}
                    placeholder="- Điểm chính 1&#10;- Điểm chính 2"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 space-y-2">
                  <span className="text-xs font-bold text-purple-300 block">Entities & Citations</span>
                  <textarea
                    rows={4}
                    value={entitiesText}
                    onChange={(e) => setEntitiesText(e.target.value)}
                    placeholder="Phân cách bằng dấu phẩy: OpenAI, GPT-4o, NVIDIA..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              {/* FAQ Schema Row Builder */}
              <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300">Trình tạo FAQ Schema JSON-LD</span>
                  <button
                    type="button"
                    onClick={addFaqRow}
                    className="text-[10px] bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 px-2.5 py-1 rounded font-bold border border-purple-500/30"
                  >
                    + Thêm Câu Hỏi
                  </button>
                </div>
                <div className="space-y-2">
                  {faqRows.map((row, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <input
                        type="text"
                        value={row.question}
                        onChange={(e) => updateFaqRow(idx, 'question', e.target.value)}
                        placeholder="Câu hỏi (Question)..."
                        className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white"
                      />
                      <input
                        type="text"
                        value={row.answer}
                        onChange={(e) => updateFaqRow(idx, 'answer', e.target.value)}
                        placeholder="Câu trả lời (Answer)..."
                        className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white"
                      />
                      <button
                        type="button"
                        onClick={() => removeFaqRow(idx)}
                        className="p-1.5 text-red-400 hover:bg-red-500/20 rounded"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* SEO Metadata */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-white font-bold text-sm flex items-center gap-2">
                  <Search size={16} className="text-emerald-400" /> Traditional SEO Metadata
                </h3>
                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2.5 py-0.5 rounded font-bold border border-emerald-500/20">
                  SEO Score: 95/100
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Focus Keyword *</label>
                  <input
                    type="text"
                    value={focusKeyword}
                    onChange={(e) => setFocusKeyword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    placeholder="công nghệ AI 2026..."
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
                <Tag size={16} className="text-amber-400" /> Multi-Level Category Assignment
              </h3>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Primary Category (Level 1)</label>
                <select
                  value={categoryId}
                  onChange={(e) => {
                    setCategoryId(e.target.value);
                    setSubCategoryId('');
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
              </div>

              {selectedCategoryObj && selectedCategoryObj.subCategories?.length > 0 && (
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Sub-Category (Level 2)</label>
                  <select
                    value={subCategoryId}
                    onChange={(e) => setSubCategoryId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:border-amber-500 focus:outline-none font-medium"
                  >
                    <option value="">-- Select Sub-Category --</option>
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
                    <Star size={14} /> Mark as "Weekly Hot"
                  </label>
                </div>
              </div>
            </div>

            {/* Multi-Affiliate Link Placement */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm space-y-4 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-amber-400 to-yellow-600"></div>
              <h3 className="text-white font-medium flex items-center gap-2 border-b border-slate-800 pb-3">
                <LinkIcon size={16} className="text-amber-400" /> Multi-Position Affiliate Placement
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
                          + Top CTA
                        </button>
                        <button
                          type="button"
                          onClick={() => togglePlacement(link.id, 'middle_comparison')}
                          className={`flex-1 border text-[10px] font-semibold py-1 rounded ${middleActive
                            ? 'bg-cyan-500/30 text-cyan-300 border-cyan-400'
                            : 'bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
                            }`}
                        >
                          + Middle
                        </button>
                        <button
                          type="button"
                          onClick={() => togglePlacement(link.id, 'footer_banner')}
                          className={`flex-1 border text-[10px] font-semibold py-1 rounded ${footerActive
                            ? 'bg-purple-500/30 text-purple-300 border-purple-400'
                            : 'bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border-purple-500/30'
                            }`}
                        >
                          + Footer
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <LuxuryButton type="submit" className="w-full py-3 text-sm">
              Save & Publish Article (SEO & GEO)
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
                  <Eye size={14} /> {article.viewCount?.toLocaleString() || 0} views
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

  // Affiliate Links Management
  const LinksView = () => (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">Global Affiliate Campaigns</h2>
          <p className="text-slate-400 text-sm">Manage central affiliate links, product landing pages for AI scraper, commission rates, and cookie windows.</p>
        </div>
        <button
          type="button"
          onClick={() => handleOpenAiModal()}
          className="px-4 py-2.5 rounded-xl font-bold text-xs bg-gradient-to-r from-cyan-500 to-violet-600 text-slate-950 hover:opacity-90 transition-all flex items-center gap-2 shadow-lg shadow-cyan-500/20 cursor-pointer"
        >
          <Sparkles size={16} /> ✨ Tạo Bài Viết AI Ngay
        </button>
      </div>

      <form onSubmit={handleAddAffiliateLink} className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl space-y-4 backdrop-blur-sm">
        <h3 className="text-white font-medium flex items-center gap-2">
          <Plus size={18} className="text-amber-400" /> Add New Affiliate Campaign
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Campaign / Platform Name *</label>
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
            <label className="block text-xs text-slate-400 mb-1">Base Tracking URL (Affiliate Ref Link) *</label>
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
            <label className="block text-xs text-slate-400 mb-1">Product URL (Landing Page cho Jina AI Scraper)</label>
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
            <label className="block text-xs text-slate-400 mb-1">Commission Rate & Cookie Window</label>
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
          Save Affiliate Campaign
        </LuxuryButton>
      </form>

      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-950/50 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-800">
              <th className="p-4 font-medium">Campaign Name</th>
              <th className="p-4 font-medium">Commission Rate</th>
              <th className="p-4 font-medium">Cookie Window</th>
              <th className="p-4 font-medium">Total Clicks</th>
              <th className="p-4 font-medium">Base Tracking URL</th>
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
                    type="button"
                    onClick={() => handleOpenAiModal(link)}
                    className="px-2.5 py-1.5 text-xs bg-gradient-to-r from-cyan-500 to-violet-600 text-slate-950 font-bold rounded-lg shadow hover:opacity-90 transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                    title="Sinh bài viết tự động bằng Gemini AI & Jina Scraper"
                  >
                    <Sparkles size={14} /> ✨ Tạo Bài AI
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
          <h2 className="text-2xl font-bold text-white mb-1">Categories & Sub-Categories Hierarchy</h2>
          <p className="text-slate-400 text-sm">Manage multi-level category structure, custom slugs, and dedicated SEO metadata.</p>
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
                      <Sparkles size={12} /> SEO Meta Title & Desc Configured
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
                  <Plus size={14} /> Add Sub-Category
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
                <Layers size={14} className="text-cyan-400" /> Level 2 Sub-Categories ({cat.subCategories?.length || 0})
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
                <p className="text-xs text-slate-600 italic">No sub-categories yet under {cat.name}. Click "+ Add Sub-Category" to create one.</p>
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
                  placeholder="e.g. Quỹ Đầu Tư REITs"
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
                  placeholder="quy-dau-tu-reits"
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
                <p className="text-xs font-bold text-amber-400 flex items-center gap-1"><Sparkles size={14} /> Category SEO Meta</p>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">SEO Meta Title</label>
                  <input
                    type="text"
                    value={catMetaTitle}
                    onChange={(e) => setCatMetaTitle(e.target.value)}
                    placeholder="Tối ưu SEO tiêu đề danh mục..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">SEO Meta Description</label>
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

      {/* Sub-Category Modal */}
      {showSubCategoryModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="flex justify-between items-center mb-4 border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Layers size={20} className="text-cyan-400" />
                {editingSubCategoryObj ? 'Edit Sub-Category' : 'Add Sub-Category (Level 2)'}
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
                <label className="block text-xs font-semibold text-slate-400 mb-1">Sub-Category Name *</label>
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
                  placeholder="Sub-category overview..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>
              <div className="border-t border-slate-800 pt-3 space-y-3">
                <p className="text-xs font-bold text-cyan-400 flex items-center gap-1"><Sparkles size={14} /> Sub-Category SEO Meta</p>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">SEO Meta Title</label>
                  <input
                    type="text"
                    value={subCatMetaTitle}
                    onChange={(e) => setSubCatMetaTitle(e.target.value)}
                    placeholder="Mô tả SEO tiêu đề sub-category..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">SEO Meta Description</label>
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
                  Cancel
                </button>
                <LuxuryButton type="submit" className="py-2 px-5 text-xs">
                  Save Sub-Category
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
          <h2 className="text-2xl font-bold text-white mb-1">Global System, Theme & SEO/GEO Settings</h2>
          <p className="text-slate-400 text-sm">Customize visual colors, typography, brand logo, Local GEO search tags, and AI crawler schemas.</p>
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
          <Palette size={16} /> UI Appearance & Colors
        </button>
        <button
          type="button"
          onClick={() => setSettingsSection('seo_geo')}
          className={`px-4 py-2 rounded-xl font-semibold text-xs transition-all flex items-center gap-2 ${settingsSection === 'seo_geo'
            ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
            : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
            }`}
        >
          <Globe size={16} /> SEO & GEO AI Engine
        </button>
      </div>

      {settingsSection === 'appearance' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 animate-in fade-in duration-300">
          {/* Theme & Palette */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm space-y-5">
            <h3 className="text-white font-medium flex items-center gap-2 border-b border-slate-800 pb-3">
              <Palette size={18} className="text-amber-400" /> Color Scheme & Palette Presets
            </h3>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-2">Preset Color Schemes</label>
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
                <label className="block text-xs font-semibold text-slate-400 mb-1">Accent / CTA Color (Hex)</label>
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
                  <option value="dark">Dark Luxury (Default)</option>
                  <option value="light">Light Mode</option>
                  <option value="emerald">Emerald Cyber</option>
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
                  <option value="Inter">Inter (Clean Modern)</option>
                  <option value="Roboto">Roboto (Classic Sans)</option>
                  <option value="Outfit">Outfit (Geometric Modern)</option>
                  <option value="Plus Jakarta Sans">Plus Jakarta Sans</option>
                </select>
              </div>
            </div>
          </div>

          {/* Branding & Visual Assets */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm space-y-5">
            <h3 className="text-white font-medium flex items-center gap-2 border-b border-slate-800 pb-3">
              <Layout size={18} className="text-cyan-400" /> Branding & Visual Elements
            </h3>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Header Logo Image URL</label>
              <input
                type="text"
                value={settingsData?.logoUrl || ''}
                onChange={(e) => setSettingsData({ ...settingsData, logoUrl: e.target.value })}
                placeholder="https://example.com/logo.png (Empty = Text Logo)"
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
              <label className="block text-xs font-semibold text-slate-400 mb-1">Favicon Icon URL</label>
              <input
                type="text"
                value={settingsData?.faviconUrl || ''}
                onChange={(e) => setSettingsData({ ...settingsData, faviconUrl: e.target.value })}
                placeholder="https://example.com/favicon.ico"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Header Announcement Banner Text</label>
              <input
                type="text"
                value={settingsData?.bannerText || ''}
                onChange={(e) => setSettingsData({ ...settingsData, bannerText: e.target.value })}
                placeholder="🔥 Announcement Text at top bar..."
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Footer Copyright & Bio</label>
              <textarea
                rows={2}
                value={settingsData?.footerText || ''}
                onChange={(e) => setSettingsData({ ...settingsData, footerText: e.target.value })}
                placeholder="© 2026 AIDEALSUK. All rights reserved..."
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-xs text-white resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Developer Custom CSS Overrides</label>
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
              <Globe size={18} className="text-amber-400" /> Core Search Metadata (SEO)
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
              <label className="block text-xs font-medium text-slate-400 mb-2">Focus Target Keywords</label>
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
                <label className="block text-xs font-medium text-slate-400 mb-2">OpenGraph Social Share Image URL</label>
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
              <MapPin size={18} className="text-cyan-400" /> GEO & AI Crawler Structured Optimization
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
                <label className="block text-xs font-medium text-slate-400 mb-1">GEO Region Name (geo.region)</label>
                <input
                  type="text"
                  value={settingsData?.geoRegionName || 'US-NY'}
                  onChange={(e) => setSettingsData({ ...settingsData, geoRegionName: e.target.value })}
                  placeholder="US-NY or VN-HN"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">GEO City Placename (geo.placename)</label>
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
              <p className="text-[11px] text-slate-500 mt-1">Lấy Measurement ID từ Google Analytics 4 (Admin &gt; Data Streams). Để trống để tắt tracking.</p>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-medium text-slate-400">Schema JSON-LD (AI Engine Friendly)</label>
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
  const SubscribersView = () => {
    const filteredSubscribers = subscribersList.filter((s) =>
      s.email.toLowerCase().includes(subscriberSearchQuery.toLowerCase().trim())
    );

    const exportToCsv = () => {
      if (subscribersList.length === 0) {
        alert('No subscribers to export');
        return;
      }
      const headers = ['ID', 'Email Address', 'Subscribed Date'];
      const rows = subscribersList.map((s) => [s.id, `"${s.email}"`, `"${s.subscribedAt || ''}"`]);
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
            <h2 className="text-2xl font-bold text-white mb-1">Subscriber Leads & Email Reports</h2>
            <p className="text-slate-400 text-sm">Monitor newsletter signups, track conversion trends, and export leads for email marketing campaigns.</p>
          </div>
          <LuxuryButton onClick={exportToCsv} className="py-2.5 px-5">
            <Download size={18} /> Export Leads (.CSV)
          </LuxuryButton>
        </div>

        {/* Lead KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard title="Total Email Leads" value={(subscribersStats?.totalSubscribers || 0).toLocaleString()} icon={Mail} trend="+12.5%" subtext="Verified opt-in leads" />
          <StatCard title="New Leads Today" value={(subscribersStats?.countToday || 0).toLocaleString()} icon={Sparkles} subtext="Signups last 24h" />
          <StatCard title="New Leads This Week" value={(subscribersStats?.countThisWeek || 0).toLocaleString()} icon={TrendingUp} subtext="Signups last 7 days" />
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
                <th className="p-4 font-medium">Subscribed Date</th>
                <th className="p-4 font-medium">Lead Status</th>
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
                      {sub.subscribedAt ? new Date(sub.subscribedAt).toLocaleString() : 'N/A'}
                    </td>
                    <td className="p-4">
                      <span
                        className={`text-xs font-semibold px-2.5 py-1 rounded-full border flex items-center gap-1.5 w-max ${
                          sub.emailStatus === 'opened'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                        }`}
                        title={sub.openedAt ? `Opened ${new Date(sub.openedAt).toLocaleString()}` : 'Email sent, waiting to be opened'}
                      >
                        <CheckCircle2 size={12} /> {sub.emailStatus === 'opened' ? 'Opened' : 'Sent'}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button onClick={() => handleDeleteSubscriber(sub.id)} className="p-2 text-slate-400 hover:text-red-400" title="Delete Lead">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-500 text-sm">
                    No subscriber leads found matching "{subscriberSearchQuery}".
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
    if (editingArticle !== null) return <ArticleEditorForm />;

    if (activeTab === 'dashboard') return <DashboardView />;
    if (activeTab === 'articles') return <ArticlesView />;
    if (activeTab === 'subscribers' && currentUser.role === 'admin') return <SubscribersView />;
    if (activeTab === 'categories' && currentUser.role === 'admin') return <CategoriesView />;
    if (activeTab === 'users' && currentUser.role === 'admin') return <UsersView />;
    if (activeTab === 'links' && currentUser.role === 'admin') return <LinksView />;
    if (activeTab === 'blacklist' && currentUser.role === 'admin') return <BlacklistView />;
    if (activeTab === 'settings' && currentUser.role === 'admin') return <SettingsView />;

    return <div className="text-slate-500 flex items-center justify-center h-64 text-sm">Under Construction...</div>;
  };

  const NavItem = ({ id, icon: Icon, label, requiredRole }: any) => {
    if (requiredRole && currentUser.role !== requiredRole) return null;
    const isActive = activeTab === id && !editingArticle && !previewArticle;
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
              <NavItem id="dashboard" icon={LayoutDashboard} label="Global Dashboard" />
              <div className="pt-4 pb-2 px-4 text-[10px] font-bold text-slate-600 uppercase tracking-widest">Content</div>
              <NavItem id="articles" icon={FileText} label="Article Management" />

              {currentUser.role === 'admin' && (
                <>
                  <div className="pt-4 pb-2 px-4 text-[10px] font-bold text-slate-600 uppercase tracking-widest">System (Admin)</div>
                  <NavItem id="subscribers" icon={Mail} label="Subscriber Leads" requiredRole="admin" />
                  <NavItem id="categories" icon={FolderTree} label="Categories & Sub-Cats" requiredRole="admin" />
                  <NavItem id="users" icon={Users} label="Team & Creators" requiredRole="admin" />
                  <NavItem id="blacklist" icon={ShieldAlert} label="Link & Blacklist Center" requiredRole="admin" />
                  <NavItem id="links" icon={LinkIcon} label="Affiliate Campaigns" requiredRole="admin" />
                  <NavItem id="settings" icon={Settings} label="Global SEO & System" requiredRole="admin" />
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

      {/* Modal Sinh Bài Viết Tự Động Bằng Gemini AI & Jina Scraper */}
      {showAiGenerateModal && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-xl shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Sparkles size={20} className="text-cyan-400" /> Tự Động Sinh Bài Viết SEO & GEO V5.3 (Gemini 2.5 Flash)
              </h3>
              <button onClick={() => setShowAiGenerateModal(false)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleGenerateAiArticle} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Chọn Chiến Dịch Affiliate (Hoặc Nhập URL)</label>
                <select
                  value={aiModalCampaign?.id || ''}
                  onChange={(e) => handleSelectCampaignForAiModal(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
                >
                  <option value="">-- Tự Nhập URL / Tên Bài Viết Thủ Công --</option>
                  {affiliateLinksList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.baseUrl})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Chủ Đề / Tên Bài Viết Cần Sinh *</label>
                <input
                  type="text"
                  value={aiModalTopic}
                  onChange={(e) => setAiModalTopic(e.target.value)}
                  placeholder="e.g. Đánh Giá Scalenut AI 2026 - Công Cụ SEO AI Tốt Nhất?"
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-cyan-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Base Tracking URL (Link Affiliate Ref) *</label>
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
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Product URL (Landing Page Cào Data Jina AI)</label>
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
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Ngôn Ngữ Bài Viết</label>
                  <select
                    value={aiModalLanguage}
                    onChange={(e: any) => setAiModalLanguage(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
                  >
                    <option value="vi-VN">Tiếng Việt (vi-VN)</option>
                    <option value="en-US">English (en-US)</option>
                  </select>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-xs font-semibold text-slate-300">Gemini API Key (Chính thức)</label>
                    <a
                      href="https://aistudio.google.com/app/apikey"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] text-cyan-400 hover:underline flex items-center gap-1 font-semibold"
                    >
                      👉 Lấy Key Miễn Phí (aistudio.google.com)
                    </a>
                  </div>
                  <input
                    type="password"
                    value={aiModalApiKey}
                    onChange={(e) => setAiModalApiKey(e.target.value)}
                    placeholder="Dán API Key dạng AIzaSy... vào đây"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-amber-300 font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-1.5">
                <p className="text-slate-200 font-bold flex items-center gap-1.5">
                  ⚙️ Tiến trình xử lý 4 bước tự động:
                </p>
                <p>1. Check Blacklist Interceptor real-time bảo vệ URL.</p>
                <p>2. Cào landing page bằng Jina AI Reader (<code className="text-cyan-300">r.jina.ai</code>).</p>
                <p>3. Gemini 2.5 Flash sinh bài viết chuẩn SEO/GEO + JSON Schema Enforcement.</p>
                <p>4. Post-Sanitization Link Checker tự động lọc & lưu nháp (Draft) vào Database.</p>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button type="button" onClick={() => setShowAiGenerateModal(false)} className="px-4 py-2 text-xs text-slate-400 hover:text-white">
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isGeneratingAiArticle}
                  className="px-6 py-2.5 rounded-xl font-bold text-xs bg-gradient-to-r from-cyan-500 to-violet-600 text-slate-950 hover:opacity-90 transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-cyan-500/20"
                >
                  {isGeneratingAiArticle ? (
                    <>
                      <div className="w-4 h-4 rounded-full border-2 border-slate-950 border-t-transparent animate-spin"></div>
                      <span>Đang Cào & Sinh Bài AI...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} /> Bắt Đầu Sinh Bài AI 1-Click
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
