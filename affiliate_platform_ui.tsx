import React, { useState, useMemo } from 'react';
import { 
  LayoutDashboard, FileText, Link as LinkIcon, Settings, 
  User, LogOut, Plus, Edit, Trash2, Eye, BarChart3, 
  TrendingUp, MousePointerClick, CheckCircle2, CircleDashed,
  Globe, Search, ChevronRight, Image as ImageIcon, Users,
  Trophy, Activity, ArrowUpRight, DollarSign, Clock, Shield,
  MapPin, Share2, Code
} from 'lucide-react';

// --- MOCK DATA (Mở rộng cho Analytics) ---
const MOCK_USERS = [
  { id: 1, username: 'admin_super', role: 'admin', name: 'Quản trị viên', status: 'active', avatar: 'A' },
  { id: 2, username: 'editor_phong', role: 'editor', name: 'Nguyễn Văn Phong', status: 'active', avatar: 'P' },
  { id: 3, username: 'author_linh', role: 'author', name: 'Trần Mỹ Linh', status: 'active', avatar: 'L' },
  { id: 4, username: 'author_hoang', role: 'author', name: 'Lê Việt Hoàng', status: 'inactive', avatar: 'H' }
];

const MOCK_AFFILIATE_LINKS = [
  { id: 1, name: 'Sàn Binance - Đăng ký', base_url: 'https://binance.com/vn/register?ref=123', commission: '40% Trading Fee', cookie: 'Không giới hạn' },
  { id: 2, name: 'VPS Vultr - Khuyến mãi', base_url: 'https://vultr.com/?ref=456', commission: '$25 / CPA', cookie: '30 ngày' },
  { id: 3, name: 'Trezor Wallet - Hardware', base_url: 'https://trezor.io/?ref=789', commission: '12% / Sale', cookie: '90 ngày' },
];

const MOCK_ARTICLES = [
  { 
    id: 101, author_id: 2, title: 'Phân tích kỹ thuật Bitcoin quý 4/2026', slug: 'phan-tich-btc-q4-2026', 
    status: 'published', view_count: 45420, clicks: 3205, revenue: 1500, created_at: '2026-08-01',
    content: 'Nội dung bài viết phân tích chuyên sâu về thị trường Crypto...'
  },
  { 
    id: 102, author_id: 2, title: 'Top 5 sàn giao dịch Uy tín nhất hiện nay', slug: 'top-5-san-uy-tin', 
    status: 'published', view_count: 12000, clicks: 800, revenue: 300, created_at: '2026-08-03',
    content: 'Đang soạn thảo đánh giá các sàn...'
  },
  { 
    id: 103, author_id: 3, title: 'Hướng dẫn chạy Ads tối ưu chuyển đổi', slug: 'huong-dan-chay-ads-affiliate', 
    status: 'published', view_count: 28900, clicks: 1450, revenue: 850, created_at: '2026-07-25',
    content: 'Cách tối ưu chiến dịch quảng cáo...'
  },
  { 
    id: 104, author_id: 3, title: 'Lưu trữ Crypto an toàn với Ví cứng', slug: 'luu-tru-crypto-vi-cung', 
    status: 'published', view_count: 5600, clicks: 420, revenue: 120, created_at: '2026-08-10',
    content: 'Tại sao bạn cần ví cứng...'
  },
  { 
    id: 105, author_id: 4, title: 'Tâm lý giao dịch cho người mới (Draft)', slug: 'tam-ly-giao-dich', 
    status: 'draft', view_count: 0, clicks: 0, revenue: 0, created_at: '2026-08-12',
    content: 'Kiểm soát cảm xúc...'
  }
];

const LuxuryButton = ({ children, variant = 'primary', className = '', ...props }) => {
  const baseStyle = "px-4 py-2 rounded-lg font-medium transition-all duration-300 flex items-center justify-center gap-2 text-sm";
  const variants = {
    primary: "bg-gradient-to-r from-amber-200 to-yellow-500 text-slate-950 hover:shadow-[0_0_15px_rgba(251,191,36,0.4)] hover:scale-[1.02]",
    secondary: "bg-white/5 border border-white/10 text-white hover:bg-white/10",
    danger: "bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20"
  };
  return (
    <button className={`${baseStyle} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
};

const StatCard = ({ title, value, icon: Icon, trend, subtext }) => (
  <div className="relative overflow-hidden rounded-2xl bg-slate-900/50 border border-slate-800 backdrop-blur-xl p-6 group hover:border-amber-500/30 transition-all duration-500">
    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110 duration-500">
      <Icon size={100} className="text-amber-400" />
    </div>
    <div className="relative z-10">
      <div className="flex items-center gap-3 text-slate-400 mb-2">
        <div className="p-2 bg-slate-950/50 rounded-lg border border-slate-800"><Icon size={16} className="text-amber-400" /></div>
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
            {trend.startsWith('+') ? <TrendingUp size={14} /> : <TrendingUp size={14} className="rotate-180" />} 
            {trend}
          </span>
        )}
        {subtext && <span className="text-slate-500 text-xs">{subtext}</span>}
      </div>
    </div>
  </div>
);

const DashboardView = ({ currentUser }) => {
  // Logic tính toán thống kê dựa trên Role
  const viewArticles = currentUser.role === 'admin' 
    ? MOCK_ARTICLES 
    : MOCK_ARTICLES.filter(a => a.author_id === currentUser.id);

  const totalViews = viewArticles.reduce((sum, a) => sum + a.view_count, 0);
  const totalClicks = viewArticles.reduce((sum, a) => sum + a.clicks, 0);
  const totalRevenue = viewArticles.reduce((sum, a) => sum + (a.revenue || 0), 0);
  const conversionRate = totalViews > 0 ? ((totalClicks / totalViews) * 100).toFixed(1) : 0;

  // Lấy Top bài viết Trending
  const topArticles = [...viewArticles]
    .filter(a => a.status === 'published')
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, 5);

  // Lấy Top Editor (Chỉ Admin mới thấy)
  const topEditors = useMemo(() => {
    if (currentUser.role !== 'admin') return [];
    const stats = {};
    MOCK_ARTICLES.forEach(article => {
      if (article.status !== 'published') return;
      if (!stats[article.author_id]) {
        const user = MOCK_USERS.find(u => u.id === article.author_id);
        stats[article.author_id] = { 
          user, views: 0, clicks: 0, bestArticle: null, maxClicks: -1 
        };
      }
      stats[article.author_id].views += article.view_count;
      stats[article.author_id].clicks += article.clicks;
      if (article.clicks > stats[article.author_id].maxClicks) {
        stats[article.author_id].maxClicks = article.clicks;
        stats[article.author_id].bestArticle = article;
      }
    });
    return Object.values(stats).sort((a, b) => b.clicks - a.clicks).slice(0, 5);
  }, [currentUser]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h2 className="text-2xl font-bold text-white mb-1">
          {currentUser.role === 'admin' ? 'Tổng quan Hệ thống' : 'Hiệu suất Cá nhân'}
        </h2>
        <p className="text-slate-400 text-sm">Theo dõi các chỉ số quan trọng và xu hướng chuyển đổi.</p>
      </div>
      
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Tổng Lượt xem" value={totalViews.toLocaleString()} icon={Eye} trend="+12.5%" subtext="So với tháng trước" />
        <StatCard title="Click Affiliate" value={totalClicks.toLocaleString()} icon={MousePointerClick} trend="+8.2%" subtext="Tỷ lệ click an toàn" />
        <StatCard title="Tỷ lệ chuyển đổi" value={`${conversionRate}%`} icon={Activity} trend="+1.1%" subtext="CTR trung bình" />
        <StatCard title="Doanh thu ước tính" value={`$${totalRevenue.toLocaleString()}`} icon={DollarSign} trend="+15.3%" subtext="Chưa đối soát" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Bài viết Trending */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-white font-medium flex items-center gap-2">
              <Activity size={18} className="text-amber-400"/> Bài viết Trending
            </h3>
            <button className="text-xs text-amber-400 hover:text-amber-300">Xem tất cả</button>
          </div>
          <div className="space-y-4 flex-1">
            {topArticles.map((article, idx) => (
              <div key={article.id} className="group flex items-center justify-between p-4 bg-slate-950/50 rounded-xl border border-slate-800/50 hover:border-amber-500/30 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm
                    ${idx === 0 ? 'bg-amber-500/20 text-amber-400' : 
                      idx === 1 ? 'bg-slate-300/20 text-slate-300' : 
                      idx === 2 ? 'bg-amber-700/20 text-amber-600' : 'bg-slate-800 text-slate-500'}`}>
                    #{idx + 1}
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium line-clamp-1 group-hover:text-amber-400 transition-colors">{article.title}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                      <span className="flex items-center gap-1"><Eye size={12}/> {article.view_count.toLocaleString()}</span>
                      <span className="flex items-center gap-1 text-emerald-400/70"><MousePointerClick size={12}/> {article.clicks.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                <ArrowUpRight size={16} className="text-slate-600 group-hover:text-amber-400 transition-colors" />
              </div>
            ))}
            {topArticles.length === 0 && <div className="text-sm text-slate-500 text-center py-4">Chưa có dữ liệu bài viết</div>}
          </div>
        </div>

        {/* Top Creators / Hoạt động (Tùy Role) */}
        {currentUser.role === 'admin' ? (
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm flex flex-col relative overflow-hidden">
             <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-bl-full pointer-events-none"></div>
            <div className="flex items-center justify-between mb-6 relative z-10">
              <h3 className="text-white font-medium flex items-center gap-2">
                <Trophy size={18} className="text-amber-400"/> Bảng xếp hạng Creator
              </h3>
            </div>
            <div className="space-y-4 flex-1 relative z-10">
              {topEditors.map((stat, idx) => (
                <div key={stat.user.id} className="flex flex-col p-4 bg-slate-950/50 rounded-xl border border-slate-800/50">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-white font-bold shadow-inner">
                        {stat.user.avatar}
                      </div>
                      <div>
                        <p className="text-white text-sm font-medium">{stat.user.name}</p>
                        <p className="text-xs text-amber-400/80 uppercase tracking-wider">{stat.user.role}</p>
                      </div>
                    </div>
                    <div className="text-right">
                       <p className="text-sm font-bold text-emerald-400">{stat.clicks.toLocaleString()} Clicks</p>
                       <p className="text-xs text-slate-500">{stat.views.toLocaleString()} Views</p>
                    </div>
                  </div>
                  {stat.bestArticle && (
                    <div className="mt-2 pt-2 border-t border-slate-800/50 text-xs text-slate-400 flex justify-between items-center">
                      <span className="truncate pr-4"><span className="text-slate-500">Best:</span> {stat.bestArticle.title}</span>
                      <span className="text-amber-400 whitespace-nowrap">${stat.bestArticle.revenue || 0}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm flex flex-col">
             <div className="flex items-center justify-between mb-6">
              <h3 className="text-white font-medium flex items-center gap-2">
                <Clock size={18} className="text-amber-400"/> Hoạt động gần đây của bạn
              </h3>
            </div>
            <div className="flex flex-col items-center justify-center h-full text-slate-500 space-y-4">
              <Activity size={48} className="text-slate-800" />
              <p className="text-sm">Hệ thống đang thu thập thêm dữ liệu tracking...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const UsersView = () => {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">Quản lý Cộng tác viên</h2>
          <p className="text-slate-400 text-sm">Thêm mới, phân quyền và theo dõi hiệu suất của đội ngũ content.</p>
        </div>
        <LuxuryButton><Plus size={18} /> Thêm User mới</LuxuryButton>
      </div>

      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-950/50 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-800">
              <th className="p-4 font-medium">Người dùng</th>
              <th className="p-4 font-medium">Vai trò</th>
              <th className="p-4 font-medium">Trạng thái</th>
              <th className="p-4 font-medium">Số bài viết</th>
              <th className="p-4 font-medium text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {MOCK_USERS.map((user) => {
              const userArticles = MOCK_ARTICLES.filter(a => a.author_id === user.id);
              const activeCount = userArticles.filter(a => a.status === 'published').length;
              
              return (
                <tr key={user.id} className="border-b border-slate-800 hover:bg-white/[0.02] transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                       <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-white font-bold border border-slate-700">
                        {user.avatar}
                      </div>
                      <div>
                        <p className="font-medium text-white">{user.name}</p>
                        <p className="text-xs text-slate-500">@{user.username}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 w-max
                      ${user.role === 'admin' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 
                        user.role === 'editor' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 
                        'bg-slate-800 text-slate-300 border border-slate-700'}`}>
                      {user.role === 'admin' && <Shield size={12}/>}
                      {user.role.toUpperCase()}
                    </span>
                  </td>
                  <td className="p-4">
                     <span className="flex items-center gap-2 text-xs">
                        <span className={`w-2 h-2 rounded-full ${user.status === 'active' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-slate-600'}`}></span>
                        <span className={user.status === 'active' ? 'text-slate-300' : 'text-slate-500'}>
                          {user.status === 'active' ? 'Đang hoạt động' : 'Tạm khóa'}
                        </span>
                     </span>
                  </td>
                  <td className="p-4">
                     <div className="flex flex-col">
                       <span className="text-white font-medium">{userArticles.length} bài</span>
                       <span className="text-xs text-slate-500">{activeCount} đang Public</span>
                     </div>
                  </td>
                  <td className="p-4 text-right flex justify-end gap-2">
                    <button className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors" title="Chỉnh sửa">
                      <Edit size={16} />
                    </button>
                    {user.role !== 'admin' && (
                      <button className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors" title="Khóa tài khoản">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const ArticlesView = ({ currentUser, onEdit, onPreview }) => {
  const displayArticles = currentUser.role === 'admin' 
    ? MOCK_ARTICLES 
    : MOCK_ARTICLES.filter(a => a.author_id === currentUser.id);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">Quản lý bài viết</h2>
          <p className="text-slate-400 text-sm">Soạn thảo nội dung và cấu hình liên kết Affiliate.</p>
        </div>
        <LuxuryButton onClick={() => onEdit(null)}><Plus size={18} /> Tạo bài viết mới</LuxuryButton>
      </div>

      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-950/50 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-800">
              <th className="p-4 font-medium">Tiêu đề bài viết</th>
              {currentUser.role === 'admin' && <th className="p-4 font-medium">Tác giả</th>}
              <th className="p-4 font-medium">Trạng thái</th>
              <th className="p-4 font-medium">Hiệu suất</th>
              <th className="p-4 font-medium text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {displayArticles.map((article) => {
              const author = MOCK_USERS.find(u => u.id === article.author_id);
              return (
                <tr key={article.id} className="border-b border-slate-800 hover:bg-white/[0.02] transition-colors">
                  <td className="p-4">
                    <p className="font-medium text-white truncate max-w-[250px] lg:max-w-[350px]">{article.title}</p>
                    <p className="text-xs text-slate-500 mt-1 truncate max-w-[250px]">{article.slug}</p>
                  </td>
                  {currentUser.role === 'admin' && (
                    <td className="p-4 text-slate-400">
                      <div className="flex items-center gap-2">
                         <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-xs text-white">{author?.avatar}</div>
                         <span className="truncate w-24">{author?.name}</span>
                      </div>
                    </td>
                  )}
                  <td className="p-4">
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-medium flex items-center gap-1.5 w-max uppercase tracking-wider
                      ${article.status === 'published' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800 text-slate-400 border border-slate-700'}`}>
                      {article.status === 'published' ? <CheckCircle2 size={12}/> : <CircleDashed size={12}/>}
                      {article.status === 'published' ? 'Đã xuất bản' : 'Bản nháp'}
                    </span>
                  </td>
                  <td className="p-4">
                     <div className="flex flex-col gap-1">
                       <span className="text-slate-300 font-medium text-xs flex items-center gap-2"><Eye size={12} className="text-slate-500"/> {article.view_count.toLocaleString()}</span>
                       <span className="text-amber-400 font-medium text-xs flex items-center gap-2"><MousePointerClick size={12} className="text-amber-600"/> {article.clicks.toLocaleString()}</span>
                     </div>
                  </td>
                  <td className="p-4 text-right flex justify-end gap-2">
                     <button onClick={() => onPreview(article)} className="p-2 text-slate-400 hover:text-cyan-400 hover:bg-cyan-400/10 rounded-lg transition-colors" title="Xem public">
                      <Globe size={16} />
                    </button>
                    <button onClick={() => onEdit(article)} className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                      <Edit size={16} />
                    </button>
                    <button className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const ArticleEditor = ({ article, onBack }) => {
  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-20 animate-in fade-in zoom-in-95 duration-300">
      <div className="flex items-center gap-4 text-slate-400">
        <button onClick={onBack} className="hover:text-white flex items-center gap-1 transition-colors">
           Danh sách
        </button>
        <ChevronRight size={14} />
        <span className="text-amber-400 font-medium">{article ? 'Chỉnh sửa bài viết' : 'Tạo bài viết mới'}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">Tiêu đề bài viết</label>
              <input 
                type="text" 
                defaultValue={article?.title || ''}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-amber-500 transition-colors text-lg shadow-inner"
                placeholder="Nhập tiêu đề..."
              />
            </div>
            
            <div>
               <label className="block text-sm font-medium text-slate-400 mb-2">Nội dung (Rich Text / Markdown)</label>
               <div className="border border-slate-700 rounded-lg overflow-hidden bg-slate-950 flex flex-col h-[500px] shadow-inner">
                  <div className="bg-slate-800 px-4 py-2 border-b border-slate-700 flex gap-4 text-slate-400">
                    <span className="font-bold hover:text-white cursor-pointer px-1">B</span>
                    <span className="italic hover:text-white cursor-pointer px-1">I</span>
                    <span className="underline hover:text-white cursor-pointer px-1">U</span>
                    <div className="w-px h-5 bg-slate-700 mx-2"></div>
                    <ImageIcon size={18} className="hover:text-white cursor-pointer"/>
                    <LinkIcon size={18} className="hover:text-white cursor-pointer"/>
                  </div>
                  <textarea 
                    className="w-full flex-1 bg-transparent p-4 text-slate-300 focus:outline-none resize-none leading-relaxed"
                    defaultValue={article?.content || ''}
                    placeholder="Viết nội dung tại đây..."
                  />
               </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm space-y-4">
            <h3 className="text-white font-medium flex items-center gap-2 border-b border-slate-800 pb-3">
              <Settings size={16} className="text-amber-400"/> Trạng thái & SEO
            </h3>
            <div>
              <label className="block text-sm text-slate-400 mb-2">Đường dẫn (Slug)</label>
              <input type="text" defaultValue={article?.slug || ''} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:border-cyan-500 focus:outline-none shadow-inner" />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-2">Trạng thái</label>
              <select className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:border-cyan-500 focus:outline-none shadow-inner">
                <option value="draft" selected={article?.status === 'draft'}>Bản nháp</option>
                <option value="published" selected={article?.status === 'published'}>Đã xuất bản</option>
              </select>
            </div>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm space-y-4 relative overflow-hidden">
             <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-amber-400 to-amber-600"></div>
            <h3 className="text-white font-medium flex items-center gap-2 border-b border-slate-800 pb-3">
              <LinkIcon size={16} className="text-amber-400"/> Chèn Affiliate
            </h3>
            
            <div>
              <label className="block text-sm text-slate-400 mb-2">Chọn chiến dịch (Database)</label>
              <select className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:border-amber-500 focus:outline-none shadow-inner">
                <option value="">-- Chọn link --</option>
                {MOCK_AFFILIATE_LINKS.map(link => (
                  <option key={link.id} value={link.id}>{link.name}</option>
                ))}
              </select>
            </div>
            
            <p className="text-xs text-slate-500 italic">Hệ thống sẽ tự động gắn tham số tracking ?sub_id={article?.slug || 'slug'} khi xuất bản.</p>
            <LuxuryButton variant="secondary" className="w-full text-sm">Chèn Nút CTA vào bài</LuxuryButton>
          </div>

           <LuxuryButton className="w-full py-3 shadow-[0_0_20px_rgba(251,191,36,0.15)] text-base">
             Lưu thay đổi
           </LuxuryButton>
        </div>
      </div>
    </div>
  );
};

const PublicArticlePreview = ({ article, onBack }) => {
  return (
    <div className="fixed inset-0 z-50 bg-[#0c0c0e] overflow-y-auto animate-in slide-in-from-bottom-10 duration-500">
      <nav className="border-b border-white/10 bg-black/50 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
           <div className="text-xl font-bold tracking-tighter text-white flex items-center gap-2">
             <span className="w-2 h-2 rounded-full bg-amber-400"></span>
             NEXUS<span className="text-amber-400 font-light">FINANCE</span>
           </div>
           <button onClick={onBack} className="text-sm text-slate-400 hover:text-white flex items-center gap-1 border border-slate-700 px-4 py-2 rounded-full hover:bg-slate-800 transition-colors">
             Đóng Preview
           </button>
        </div>
      </nav>

      <article className="max-w-3xl mx-auto px-6 py-16">
        <div className="mb-10 text-center">
          <div className="text-amber-400 text-sm font-semibold tracking-widest uppercase mb-4">Phân tích chuyên sâu</div>
          <h1 className="text-3xl md:text-5xl font-bold text-white mb-6 leading-tight">
            {article.title}
          </h1>
          <div className="flex items-center justify-center gap-4 text-sm text-slate-400">
            <span>Bởi <strong>{MOCK_USERS.find(u=>u.id === article.author_id)?.name || 'Admin'}</strong></span>
            <span>•</span>
            <span>{article.created_at}</span>
            <span>•</span>
            <span className="flex items-center gap-1"><Eye size={14}/> {article.view_count.toLocaleString()} lượt xem</span>
          </div>
        </div>

        <div className="w-full h-64 md:h-80 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-800 mb-10 flex items-center justify-center">
            <ImageIcon size={48} className="text-slate-700" />
        </div>

        <div className="prose prose-invert prose-lg max-w-none text-slate-300 leading-relaxed font-serif">
          <p>Thị trường tiền điện tử đang bước vào một giai đoạn nhạy cảm. Trong bài viết này, chúng tôi sẽ phân tích các tín hiệu kỹ thuật để đưa ra dự báo cho quý 4 năm 2026...</p>
          
          <div className="my-12 flex flex-col items-center justify-center">
             <a href="#" className="group relative inline-flex items-center justify-center px-8 py-4 font-semibold text-slate-900 transition-all duration-200 bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-500 rounded-full hover:scale-105 hover:shadow-[0_0_30px_rgba(251,191,36,0.3)] overflow-hidden">
               <span className="relative z-10 flex items-center gap-2">
                  Đăng ký ngay - Nhận Ưu Đãi <ChevronRight size={18}/>
               </span>
               <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>
             </a>
             <p className="text-center w-full block mt-3 text-xs text-slate-500 font-sans">
               *Link đối tác (Sponsored). Theo dõi tracking theo kịch bản Luồng 1.
             </p>
          </div>
          <p>Quản lý rủi ro luôn là ưu tiên hàng đầu. Đừng bao giờ đầu tư số tiền mà bạn không thể mất.</p>
        </div>
      </article>
    </div>
  );
};

const LinksView = () => {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">Cấu hình Affiliate Links (Root)</h2>
          <p className="text-slate-400 text-sm">Quản lý tập trung các liên kết gốc, hoa hồng và thời hạn cookie.</p>
        </div>
        <LuxuryButton><Plus size={18} /> Thêm Link mới</LuxuryButton>
      </div>

      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-950/50 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-800">
              <th className="p-4 font-medium">Chiến dịch (Platform)</th>
              <th className="p-4 font-medium">Mức Hoa hồng</th>
              <th className="p-4 font-medium">Thời hạn Cookie</th>
              <th className="p-4 font-medium">URL Gốc (Base)</th>
              <th className="p-4 font-medium text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {MOCK_AFFILIATE_LINKS.map(link => (
              <tr key={link.id} className="border-b border-slate-800 hover:bg-white/[0.02] transition-colors">
                <td className="p-4">
                  <p className="text-white font-medium">{link.name}</p>
                </td>
                <td className="p-4">
                  <span className="text-emerald-400 font-medium bg-emerald-400/10 px-2.5 py-1 rounded-md text-xs border border-emerald-400/20 shadow-inner">
                    {link.commission}
                  </span>
                </td>
                <td className="p-4">
                  <span className="text-amber-400 text-xs flex items-center gap-1.5"><Clock size={14}/> {link.cookie}</span>
                </td>
                <td className="p-4 max-w-[200px]">
                  <code className="text-xs text-slate-400 bg-slate-950 px-2 py-1 rounded truncate block border border-slate-800 shadow-inner">{link.base_url}</code>
                </td>
                <td className="p-4 text-right flex justify-end gap-2">
                  <button className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"><Edit size={16}/></button>
                  <button className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"><Trash2 size={16}/></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const SettingsView = () => {
  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">Cấu hình SEO & Giao diện (Public FE)</h2>
          <p className="text-slate-400 text-sm">Trung tâm điều khiển tối ưu hóa công cụ tìm kiếm, Local SEO (GEO) và nhận diện thương hiệu.</p>
        </div>
        <LuxuryButton className="py-2.5"><CheckCircle2 size={18} /> Lưu toàn bộ cấu hình</LuxuryButton>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        
        {/* Block 1: SEO Cơ bản & Hiển thị */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm space-y-5">
          <h3 className="text-white font-medium flex items-center gap-2 border-b border-slate-800 pb-3">
            <Globe size={18} className="text-amber-400"/> Thông tin cốt lõi & SEO On-page
          </h3>
          
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">Tên Website (Site Title / H1 Trang chủ)</label>
            <input type="text" defaultValue="NEXUS FINANCE" className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-amber-500 transition-colors shadow-inner" />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">Meta Description (Mô tả tìm kiếm)</label>
            <textarea rows="3" defaultValue="Nền tảng phân tích tài chính & crypto chuyên sâu. Cung cấp tín hiệu đầu tư và đánh giá sàn giao dịch khách quan nhất." className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-amber-500 transition-colors shadow-inner resize-none"></textarea>
            <p className="text-[11px] text-slate-500 mt-1 flex justify-between">
              <span>Độ dài khuyến nghị: 150-160 ký tự để không bị cắt xén trên Google.</span>
              <span className="text-emerald-400">Đạt chuẩn (124)</span>
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">Từ khóa chính (Focus Keywords)</label>
              <input type="text" defaultValue="crypto, tài chính, đầu tư, đánh giá sàn" className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-amber-500 transition-colors shadow-inner" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">Thẻ Canonical (URL Gốc)</label>
              <input type="text" defaultValue="https://nexusfinance.vn" className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-amber-500 transition-colors shadow-inner" />
            </div>
          </div>
        </div>

        {/* Block 2: GEO & Local SEO (Nhắm mục tiêu địa phương) */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm space-y-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-bl-full pointer-events-none"></div>
          <h3 className="text-white font-medium flex items-center gap-2 border-b border-slate-800 pb-3 relative z-10">
            <MapPin size={18} className="text-cyan-400"/> Định danh GEO & Local SEO
          </h3>
          <p className="text-xs text-slate-400">Cấu hình giúp Google ưu tiên hiển thị website cho người dùng tại khu vực mục tiêu (rất quan trọng để tối ưu Free Traffic địa phương).</p>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">Ngôn ngữ & Vùng (hreflang)</label>
              <select className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-amber-500 shadow-inner">
                <option value="vi-VN">Tiếng Việt (vi-VN)</option>
                <option value="en-US">English (en-US)</option>
                <option value="ja-JP">Japanese (ja-JP)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">Quốc gia mục tiêu (Geo-Targeting)</label>
              <select className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-amber-500 shadow-inner">
                <option value="VN">Việt Nam (VN)</option>
                <option value="GLOBAL">Toàn cầu (Global)</option>
              </select>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">Business NAP (Name, Address, Phone)</label>
            <div className="space-y-2">
              <input type="text" placeholder="Tên Doanh nghiệp / Tổ chức..." defaultValue="Nexus Finance LLC" className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-amber-500 shadow-inner" />
              <input type="text" placeholder="Địa chỉ đăng ký (Trụ sở)..." defaultValue="Tòa nhà Bitexco, Q1, TP.HCM, Việt Nam" className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-amber-500 shadow-inner" />
              <input type="text" placeholder="Hotline / CSKH..." defaultValue="+84 1900 6868" className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-amber-500 shadow-inner" />
            </div>
          </div>
        </div>

        {/* Block 3: Visual & Social Share */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm space-y-5">
          <h3 className="text-white font-medium flex items-center gap-2 border-b border-slate-800 pb-3">
            <Share2 size={18} className="text-pink-400"/> Hiển thị Mạng xã hội & Hình ảnh
          </h3>
          
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">Favicon & Logo (Hệ thống)</label>
              <div className="flex gap-4 items-center mb-2">
                <div className="w-16 h-16 bg-slate-950 border border-slate-700 rounded-xl flex items-center justify-center shadow-inner">
                  <span className="text-amber-400 font-bold text-xl">NF</span>
                </div>
                <button className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs rounded-lg border border-slate-700 transition-colors flex items-center gap-1.5">
                  <Edit size={12} /> Cập nhật
                </button>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">Ảnh Open Graph (Share FB/Zalo)</label>
              <div className="w-full h-16 bg-gradient-to-r from-slate-800 to-slate-900 border border-slate-700 rounded-xl flex flex-col items-center justify-center group cursor-pointer hover:border-pink-500/50 transition-colors relative overflow-hidden shadow-inner">
                <span className="text-white text-xs flex items-center gap-1"><ImageIcon size={14} /> Upload OG Image</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">Chuẩn 1200x630px, &lt;1MB</p>
            </div>
          </div>
        </div>

        {/* Block 4: Script & Schema Markup */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm space-y-5 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-purple-400 to-purple-600"></div>
          <h3 className="text-white font-medium flex items-center gap-2 border-b border-slate-800 pb-3 relative z-10">
            <Code size={18} className="text-purple-400"/> Schema Markup & Scripts Tracking
          </h3>
          
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2 flex justify-between">
              <span>Mã Schema JSON-LD (Tạo Rich Snippets)</span>
              <span className="text-xs text-amber-400 cursor-pointer hover:underline">Tự động tạo mẫu Organization</span>
            </label>
            <textarea rows="3" placeholder='{ "@context": "https://schema.org", "@type": "Organization", ... }' className="w-full bg-[#0a0a0c] border border-slate-700 rounded-lg px-4 py-2.5 text-emerald-400/80 font-mono text-[11px] focus:outline-none focus:border-purple-500 shadow-inner resize-none"></textarea>
            <p className="text-[11px] text-slate-500 mt-1">Giúp Google hiểu cấu trúc tổ chức, tăng tỷ lệ hiện thị Knowledge Panel.</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">Scripts Head (GTM, FB Pixel, Analytics)</label>
            <textarea rows="3" placeholder="<!-- Chèn thẻ <script> tại đây -->" className="w-full bg-[#0a0a0c] border border-slate-700 rounded-lg px-4 py-2.5 text-slate-400 font-mono text-[11px] focus:outline-none focus:border-purple-500 shadow-inner resize-none"></textarea>
          </div>
        </div>

      </div>
    </div>
  );
};

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [currentUser, setCurrentUser] = useState(MOCK_USERS[0]); // Default: admin
  const [editingArticle, setEditingArticle] = useState(null);
  const [previewArticle, setPreviewArticle] = useState(null);

  const renderContent = () => {
    if (previewArticle) return <PublicArticlePreview article={previewArticle} onBack={() => setPreviewArticle(null)} />;
    
    if (activeTab === 'dashboard') return <DashboardView currentUser={currentUser} />;
    
    if (activeTab === 'articles') {
      if (editingArticle !== null) return <ArticleEditor article={editingArticle} onBack={() => setEditingArticle(null)} />;
      return <ArticlesView currentUser={currentUser} onEdit={setEditingArticle} onPreview={setPreviewArticle} />;
    }

    if (activeTab === 'users' && currentUser.role === 'admin') return <UsersView />;

    if (activeTab === 'links' && currentUser.role === 'admin') return <LinksView />;
    
    if (activeTab === 'settings' && currentUser.role === 'admin') return <SettingsView />;

    return <div className="text-slate-500 flex items-center justify-center h-64 text-sm">Khu vực đang xây dựng...</div>;
  };

  const NavItem = ({ id, icon: Icon, label, requiredRole }) => {
    if (requiredRole && currentUser.role !== requiredRole) return null;
    const isActive = activeTab === id && !editingArticle && !previewArticle;
    return (
      <button 
        onClick={() => { setActiveTab(id); setEditingArticle(null); }}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 font-medium text-sm
          ${isActive 
            ? 'bg-gradient-to-r from-amber-500/15 to-transparent text-amber-400 border border-amber-500/20 shadow-[0_0_15px_rgba(251,191,36,0.05)]' 
            : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'}`}
      >
        <Icon size={18} className={isActive ? 'text-amber-400' : 'text-slate-500'} /> {label}
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-[#060608] font-sans selection:bg-amber-500/30 text-slate-300">
      {/* Background Decorators */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-cyan-900/10 blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-amber-900/10 blur-[120px]"></div>
      </div>

      {previewArticle === null && (
        <div className="relative z-10 flex h-screen overflow-hidden">
          {/* Sidebar */}
          <aside className="w-64 bg-[#0a0a0c]/80 backdrop-blur-xl border-r border-slate-800/60 flex flex-col shadow-2xl">
            <div className="h-20 flex items-center px-6 border-b border-slate-800/60">
              <div className="text-xl font-bold tracking-tighter text-white flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-300 to-yellow-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
                  <span className="text-slate-900 font-bold text-lg">A</span>
                </div>
                AFFILIATE<span className="text-amber-400 font-light">PRO</span>
              </div>
            </div>

            <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto custom-scrollbar">
              <NavItem id="dashboard" icon={LayoutDashboard} label="Dashboard" />
              
              <div className="pt-4 pb-2 px-4 text-[10px] font-bold text-slate-600 uppercase tracking-widest">Nội dung</div>
              <NavItem id="articles" icon={FileText} label="Quản lý bài viết" />

              {currentUser.role === 'admin' && (
                <>
                  <div className="pt-4 pb-2 px-4 text-[10px] font-bold text-slate-600 uppercase tracking-widest">Hệ thống (Admin)</div>
                  <NavItem id="users" icon={Users} label="Quản lý Nhân sự" requiredRole="admin" />
                  <NavItem id="links" icon={LinkIcon} label="Quản lý Links" requiredRole="admin" />
                  <NavItem id="settings" icon={Settings} label="Cài đặt Giao diện" requiredRole="admin" />
                </>
              )}
            </nav>

            <div className="p-4 border-t border-slate-800/60 bg-slate-950/30">
              <div className="flex items-center gap-3 px-4 py-3 bg-slate-900/80 rounded-xl border border-slate-800">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-white font-bold shadow-inner">
                  {currentUser.avatar}
                </div>
                <div className="flex-1 overflow-hidden">
                  <p className="text-sm font-medium text-white truncate">{currentUser.name}</p>
                  <p className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">{currentUser.role}</p>
                </div>
              </div>
            </div>
          </aside>

          {/* Main Content Area */}
          <main className="flex-1 flex flex-col overflow-hidden">
            {/* Header */}
            <header className="h-20 bg-[#0a0a0c]/50 backdrop-blur-md border-b border-slate-800/60 flex items-center justify-between px-8 relative z-20">
               <div className="flex items-center gap-4 text-slate-400 w-1/2">
                 <div className="relative w-full max-w-md hidden md:block">
                   <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                   <input type="text" placeholder="Tìm kiếm nhanh..." className="w-full bg-slate-900/50 border border-slate-700/50 rounded-full pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-amber-500 transition-colors shadow-inner" />
                 </div>
               </div>
               
               {/* Role Switcher (Mock Auth) */}
               <div className="flex items-center gap-6">
                 <div className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-lg border border-slate-800 backdrop-blur-sm">
                   <button 
                     onClick={() => {setCurrentUser(MOCK_USERS.find(u => u.role === 'admin')); setActiveTab('dashboard')}}
                     className={`px-3 py-1.5 text-xs rounded-md font-medium transition-all duration-300 ${currentUser.role === 'admin' ? 'bg-amber-500 text-slate-900 shadow-md' : 'text-slate-400 hover:text-white'}`}
                   >
                     MOCK: Admin
                   </button>
                   <button 
                     onClick={() => {setCurrentUser(MOCK_USERS.find(u => u.role === 'editor')); setActiveTab('dashboard')}}
                     className={`px-3 py-1.5 text-xs rounded-md font-medium transition-all duration-300 ${currentUser.role === 'editor' ? 'bg-amber-500 text-slate-900 shadow-md' : 'text-slate-400 hover:text-white'}`}
                   >
                     MOCK: Editor
                   </button>
                 </div>
                 
                 <div className="w-px h-6 bg-slate-800"></div>
                 <button className="text-slate-400 hover:text-red-400 p-2 rounded-full hover:bg-red-400/10 transition-colors" title="Đăng xuất">
                   <LogOut size={18} />
                 </button>
               </div>
            </header>

            {/* Scrollable Main Area */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
              <div className="max-w-7xl mx-auto">
                {renderContent()}
              </div>
            </div>
          </main>
        </div>
      )}

      {/* Global Styles cho thanh cuộn */}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #475569; }
      `}} />
    </div>
  );
}