'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  PenTool,
  Brain,
  Search,
  FolderTree,
  Link as LinkIcon,
  PlusCircle,
  Trash2,
  Wand2,
  Rocket,
  Bold,
  Italic,
  Heading,
  HelpCircle,
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  Sparkles,
  ShieldAlert,
} from 'lucide-react';

interface CategoryItem {
  id: string;
  name: string;
  slug: string;
  subCategories: { id: string; name: string; slug: string }[];
}

interface AffiliateLinkItem {
  id: string;
  name: string;
  commission?: string;
  baseUrl: string;
}

interface FaqRow {
  question: string;
  answer: string;
}

interface AffiliatePlacement {
  affiliate_link_id: string;
  position_label: string;
}

export default function CreateArticleStudioPage() {
  const router = useRouter();

  // Form States
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');
  const [focusKeyword, setFocusKeyword] = useState('');
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');

  // GEO States
  const [keyTakeawaysText, setKeyTakeawaysText] = useState('');
  const [entitiesText, setEntitiesText] = useState('');
  const [faqRows, setFaqRows] = useState<FaqRow[]>([
    { question: '', answer: '' },
  ]);

  // Categories & Subcategories
  const [categoriesList, setCategoriesList] = useState<CategoryItem[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [selectedSubCategoryId, setSelectedSubCategoryId] = useState('');

  // Affiliate Links & Placements
  const [affiliateLinks, setAffiliateLinks] = useState<AffiliateLinkItem[]>([]);
  const [activePlacements, setActivePlacements] = useState<AffiliatePlacement[]>([]);

  // Status & Options
  const [status, setStatus] = useState<'published' | 'draft'>('published');
  const [isFeatured, setIsFeatured] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Toast State
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);

  // Thumbnail Upload
  const [isUploadingThumbnail, setIsUploadingThumbnail] = useState(false);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  // Auth guard — this page previously never checked for or sent a token at all
  useEffect(() => {
    if (!localStorage.getItem('token')) {
      router.push('/admin/login');
    }
  }, [router]);

  // Load Categories and Affiliate Links on mount
  useEffect(() => {
    async function fetchData() {
      try {
        const token = localStorage.getItem('token');
        const [catRes, affRes] = await Promise.all([
          fetch('/api/v1/public/categories'),
          fetch('/api/v1/cms/affiliate-links', {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        if (catRes.ok) {
          const catData = await catRes.json();
          if (catData.status === 'success' && catData.data) {
            setCategoriesList(catData.data);
            if (catData.data.length > 0) {
              setSelectedCategoryId(catData.data[0].id);
              if (catData.data[0].subCategories.length > 0) {
                setSelectedSubCategoryId(catData.data[0].subCategories[0].id);
              }
            }
          }
        }

        if (affRes.ok) {
          const affData = await affRes.json();
          if (affData.status === 'success' && affData.data) {
            setAffiliateLinks(affData.data);
          }
        }
      } catch (err) {
        console.error('Failed to load studio metadata:', err);
      }
    }
    fetchData();
  }, []);

  // Update Subcategory choices when Primary Category changes
  const handleCategoryChange = (catId: string) => {
    setSelectedCategoryId(catId);
    const found = categoriesList.find((c) => c.id === catId);
    if (found && found.subCategories.length > 0) {
      setSelectedSubCategoryId(found.subCategories[0].id);
    } else {
      setSelectedSubCategoryId('');
    }
  };

  // Auto-slug generator
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

  // AI Key Takeaways Generator Mock / API Helper
  const handleAiTakeawaysGenerate = async () => {
    triggerToast('AI đang phân tích và tạo Key Takeaways...');
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
          triggerToast('Đã tạo thành công Key Takeaways & Entities!');
          return;
        }
      }
    } catch {
      // Fallback
    }
    setKeyTakeawaysText(
      `- Phân tích chuyên sâu giải pháp AI cho bài viết "${title || 'AI Insights'}".\n- Tích hợp các mô hình Generative Engine mới nhất năm 2026.\n- Tối ưu chuyển đổi và tự động hóa quy trình làm việc.`
    );
    triggerToast('Đã tạo Key Takeaways chuẩn GEO!');
  };

  // FAQ Schema Rows
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
        triggerToast('Đã tải ảnh lên thành công!');
      } else {
        triggerToast(`Lỗi upload: ${json.message || 'Không thể tải ảnh lên'}`);
      }
    } catch {
      triggerToast('Đã có lỗi xảy ra khi tải ảnh lên!');
    } finally {
      setIsUploadingThumbnail(false);
      e.target.value = '';
    }
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

  // Toggle Affiliate CTA Position
  const togglePlacement = (affiliateLinkId: string, label: string) => {
    const exists = activePlacements.find(
      (p) => p.affiliate_link_id === affiliateLinkId && p.position_label === label
    );

    if (exists) {
      setActivePlacements(
        activePlacements.filter(
          (p) => !(p.affiliate_link_id === affiliateLinkId && p.position_label === label)
        )
      );
      triggerToast(`Đã gỡ vị trí CTA ${label}.`);
    } else {
      setActivePlacements([
        ...activePlacements,
        { affiliate_link_id: affiliateLinkId, position_label: label },
      ]);
      triggerToast(`Đã kích hoạt vị trí CTA ${label}.`);
    }
  };

  // Format Helper Buttons for Content
  const insertTextAtContent = (text: string) => {
    setContent((prev) => prev + text);
    triggerToast('Đã áp dụng định dạng văn bản.');
  };

  // Submit Article
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      triggerToast('Vui lòng nhập Tiêu đề và Nội dung bài viết!');
      return;
    }

    setIsSubmitting(true);

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
      title,
      slug,
      excerpt,
      content,
      status,
      isFeatured,
      categoryId: selectedCategoryId || undefined,
      subCategoryId: selectedSubCategoryId || undefined,
      thumbnailUrl,
      focusKeyword,
      metaTitle: metaTitle || title,
      metaDescription: metaDescription || excerpt,
      keyTakeaways: takeawaysList,
      entities: entitiesList,
      faqSchema: validFaq,
      affiliatePlacements: activePlacements,
    };

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/v1/cms/articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        triggerToast('🚀 Xuất bản bài viết chuẩn SEO & GEO thành công!');
        setTimeout(() => {
          router.push('/admin');
        }, 1200);
      } else {
        const errorJson = await res.json();
        triggerToast(`Lỗi: ${errorJson.message || 'Không thể tạo bài viết'}`);
      }
    } catch (err) {
      console.error('Submit article error:', err);
      triggerToast('Đã có lỗi xảy ra khi kết nối máy chủ!');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentCategory = categoriesList.find((c) => c.id === selectedCategoryId);

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-slate-800 font-sans flex flex-col justify-between">
      {/* Top Navbar */}
      <header className="h-16 bg-white border-b border-slate-200/80 px-6 flex items-center justify-between sticky top-0 z-30 shadow-sm">
        <div className="flex items-center space-x-3 text-xs sm:text-sm">
          <Link
            href="/admin"
            className="text-slate-500 hover:text-[#0056B3] flex items-center gap-1 font-medium transition"
          >
            <ArrowLeft size={14} /> Back to Dashboard
          </Link>
          <span className="text-slate-300">/</span>
          <h1 className="font-bold text-[#0056B3] flex items-center gap-1.5">
            <PenTool size={16} /> SEO & GEO Article Studio (V5.1)
          </h1>
        </div>

        <div className="flex items-center space-x-3">
          <Link
            href="/"
            target="_blank"
            className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <span>Public Website</span>
            <ExternalLink size={12} className="text-[#0056B3]" />
          </Link>
        </div>
      </header>

      {/* Main Studio Form */}
      <main className="flex-grow p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* Left Column: Core Content & GEO Studio (Span 8) */}
          <div className="xl:col-span-8 space-y-6">
            {/* Basic Info Card */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 space-y-5 border border-slate-100 shadow-xl shadow-slate-200/50">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <PenTool size={16} className="text-[#0056B3]" />
                  <span>Thông Tin Bài Viết & Nội Dung Chính</span>
                </h2>
                <span className="text-[10px] bg-blue-50 text-[#0056B3] border border-blue-100 px-2.5 py-1 rounded-lg font-bold">
                  Auto-Slug Active
                </span>
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">Article Title (H1) *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="Nhập tiêu đề chuẩn SEO (H1)..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#0056B3] focus:bg-white transition font-bold"
                  required
                />
              </div>

              {/* Excerpt / Sapo */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Excerpt (Homepage Sapo Summary) *
                </label>
                <textarea
                  rows={2}
                  value={excerpt}
                  onChange={(e) => setExcerpt(e.target.value)}
                  placeholder="Tóm tắt ngắn gọn thu hút người đọc và AI trích dẫn..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#0056B3] focus:bg-white transition leading-relaxed"
                />
              </div>

              {/* Thumbnail Upload */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">Thumbnail Image</label>
                <div className="flex items-center gap-3">
                  {thumbnailUrl && (
                    <img
                      src={thumbnailUrl}
                      alt="Thumbnail preview"
                      className="w-16 h-16 rounded-xl object-cover border border-slate-200 shrink-0"
                    />
                  )}
                  <label className="flex-1 cursor-pointer">
                    <span className="w-full inline-flex items-center justify-center gap-2 bg-slate-50 border border-dashed border-slate-300 rounded-2xl px-4 py-2.5 text-xs text-slate-500 hover:bg-slate-100 hover:border-[#0056B3] transition">
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
                  placeholder="...hoặc dán URL ảnh thủ công"
                  className="w-full mt-2 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#0056B3] transition font-mono"
                />
              </div>

              {/* Rich Text Editor */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-700">Article Content (Rich Text / HTML) *</label>
                  <div className="flex space-x-1.5 text-xs">
                    <button
                      type="button"
                      onClick={() => insertTextAtContent(' **In Đậm** ')}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold flex items-center gap-1"
                      title="Bold"
                    >
                      <Bold size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={() => insertTextAtContent(' *In Nghiêng* ')}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold flex items-center gap-1"
                      title="Italic"
                    >
                      <Italic size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={() => insertTextAtContent('\n\n## Tiêu đề phụ (H2 chuẩn GEO)\n')}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold flex items-center gap-1"
                      title="H2 Heading"
                    >
                      <Heading size={12} /> H2
                    </button>
                  </div>
                </div>
                <textarea
                  rows={12}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Viết nội dung bài viết chi tiết..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#0056B3] focus:bg-white transition font-mono leading-relaxed"
                  required
                />
              </div>
            </div>

            {/* GEO & AI Engine Optimization Studio Card */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 space-y-5 border-l-4 border-l-indigo-600 border border-slate-100 shadow-xl shadow-slate-200/50">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center space-x-2">
                  <Brain size={18} className="text-indigo-600" />
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">GEO (Generative Engine Optimization) Hub</h2>
                    <p className="text-[10px] text-slate-500">
                      Tối ưu nội dung hiển thị trên ChatGPT, Google SGE, Claude & Perplexity
                    </p>
                  </div>
                </div>
                <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-bold px-3 py-1 rounded-xl">
                  AI-Ready v5.1
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Key Takeaways Box */}
                <div className="bg-slate-50/80 rounded-2xl p-4 space-y-2 border border-slate-200/80">
                  <label className="block text-xs font-bold text-indigo-900 flex items-center justify-between">
                    <span>Key Takeaways (Tóm tắt nhanh cho LLMs)</span>
                    <button
                      type="button"
                      onClick={handleAiTakeawaysGenerate}
                      className="text-[10px] text-[#0056B3] hover:underline font-bold flex items-center gap-1"
                    >
                      <Wand2 size={12} /> AI Gợi ý
                    </button>
                  </label>
                  <textarea
                    rows={4}
                    value={keyTakeawaysText}
                    onChange={(e) => setKeyTakeawaysText(e.target.value)}
                    placeholder="- Điểm chính 1&#10;- Điểm chính 2&#10;- Điểm chính 3"
                    className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Entity Citations & Keywords */}
                <div className="bg-slate-50/80 rounded-2xl p-4 space-y-2 border border-slate-200/80">
                  <label className="block text-xs font-bold text-indigo-900">
                    Định danh Thực thể & Nguồn uy tín (Entities)
                  </label>
                  <textarea
                    rows={4}
                    value={entitiesText}
                    onChange={(e) => setEntitiesText(e.target.value)}
                    placeholder="Phân cách bằng dấu phẩy. Ví dụ: OpenAI, GPT-4o, Google DeepMind, NVIDIA H100..."
                    className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                  />
                  <p className="text-[10px] text-slate-500">Giúp AI Search Engines nhận diện chính xác chủ thể.</p>
                </div>
              </div>

              {/* FAQ Schema Generator Builder */}
              <div className="bg-slate-50/80 rounded-2xl p-4 space-y-3 border border-slate-200/80">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <HelpCircle size={14} className="text-[#0056B3]" /> Trình tạo Câu hỏi & Trả lời (FAQ Schema
                    JSON-LD)
                  </span>
                  <button
                    type="button"
                    onClick={addFaqRow}
                    className="px-3 py-1 bg-blue-50 hover:bg-blue-100 text-[#0056B3] text-xs font-bold rounded-lg border border-blue-200 flex items-center gap-1"
                  >
                    <PlusCircle size={12} /> Thêm Câu Hỏi
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
                        className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#0056B3]"
                      />
                      <input
                        type="text"
                        value={row.answer}
                        onChange={(e) => updateFaqRow(idx, 'answer', e.target.value)}
                        placeholder="Câu trả lời (Answer)..."
                        className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#0056B3]"
                      />
                      <button
                        type="button"
                        onClick={() => removeFaqRow(idx)}
                        className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition"
                        title="Xóa dòng FAQ"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Traditional SEO Metadata Card */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 space-y-5 border border-slate-100 shadow-xl shadow-slate-200/50">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Search size={16} className="text-[#20C997]" />
                  <span>Tối Ưu SEO Truyền Thống & Meta Tags</span>
                </h2>
                <span className="text-[10px] bg-emerald-50 text-[#20C997] border border-emerald-200 px-2.5 py-1 rounded-lg font-bold">
                  SEO Score: 95/100
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Focus Keyword *</label>
                  <input
                    type="text"
                    value={focusKeyword}
                    onChange={(e) => setFocusKeyword(e.target.value)}
                    placeholder="Ví dụ: công nghệ AI 2026..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#20C997]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">URL Slug *</label>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="cong-nghe-ai-2026-xu-huong-moi..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#20C997] font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Meta Title (SEO Title - Max 60 chars)
                </label>
                <input
                  type="text"
                  value={metaTitle}
                  onChange={(e) => setMetaTitle(e.target.value)}
                  placeholder="Tiêu đề hiển thị trên Google Search..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#20C997]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Meta Description (Max 160 chars)
                </label>
                <textarea
                  rows={2}
                  value={metaDescription}
                  onChange={(e) => setMetaDescription(e.target.value)}
                  placeholder="Mô tả ngắn gọn thu hút CTR từ kết quả tìm kiếm..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#20C997]"
                />
              </div>
            </div>
          </div>

          {/* Right Column: Categories, Options & Affiliate Placements (Span 4) */}
          <div className="xl:col-span-4 space-y-6">
            {/* Category & Publishing Setup */}
            <div className="bg-white rounded-3xl p-6 space-y-5 border border-slate-100 shadow-xl shadow-slate-200/50">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <FolderTree size={16} className="text-amber-500" />
                  <span>Categories & Publishing</span>
                </h2>
              </div>

              {/* Primary Category Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">Primary Category (Level 1) *</label>
                <select
                  value={selectedCategoryId}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-medium focus:outline-none focus:border-amber-500"
                >
                  {categoriesList.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sub-Category Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">Sub-Category (Level 2) *</label>
                <select
                  value={selectedSubCategoryId}
                  onChange={(e) => setSelectedSubCategoryId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-medium focus:outline-none focus:border-amber-500"
                >
                  {currentCategory?.subCategories.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Publishing Status */}
              <div className="pt-3 border-t border-slate-100 space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">Publishing Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-medium focus:outline-none"
                  >
                    <option value="published">Published (Xuất bản ngay)</option>
                    <option value="draft">Draft (Bản nháp)</option>
                  </select>
                </div>

                <div className="flex items-center space-x-3 pt-1">
                  <input
                    type="checkbox"
                    id="featuredCheck"
                    checked={isFeatured}
                    onChange={(e) => setIsFeatured(e.target.checked)}
                    className="w-4 h-4 rounded bg-slate-50 border-slate-300 text-[#0056B3] focus:ring-0 cursor-pointer"
                  />
                  <label htmlFor="featuredCheck" className="text-xs font-bold text-amber-600 cursor-pointer">
                    ⭐ Mark as "Weekly Hot / Featured"
                  </label>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-[#FF6B6B] hover:bg-[#ff5252] text-white font-extrabold py-3.5 rounded-2xl text-xs shadow-lg shadow-rose-500/20 hover:scale-[1.02] transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                <Rocket size={16} />
                <span>{isSubmitting ? 'Đang Xuất Bản...' : 'Xuất Bản Bài Viết (SEO & GEO Ready)'}</span>
              </button>
            </div>

            {/* Multi-Position Affiliate Placement Card */}
            <div className="bg-white rounded-3xl p-6 space-y-4 border border-slate-100 shadow-xl shadow-slate-200/50">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <LinkIcon size={16} className="text-[#0056B3]" />
                  <span>Affiliate Campaign Placements</span>
                </h2>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Gắn liên kết hoa hồng tự động vào các vị trí CTA trong bài viết.
              </p>

              <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                {affiliateLinks.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">Đang tải kho link affiliate...</p>
                ) : (
                  affiliateLinks.map((aff) => {
                    const topActive = activePlacements.some(
                      (p) => p.affiliate_link_id === aff.id && p.position_label === 'top_cta'
                    );
                    const middleActive = activePlacements.some(
                      (p) => p.affiliate_link_id === aff.id && p.position_label === 'middle_comparison'
                    );
                    const footerActive = activePlacements.some(
                      (p) => p.affiliate_link_id === aff.id && p.position_label === 'footer_banner'
                    );

                    return (
                      <div
                        key={aff.id}
                        className="bg-slate-50/80 p-3.5 rounded-2xl flex items-center justify-between border border-slate-200/80"
                      >
                        <div className="pr-2">
                          <p className="text-xs font-bold text-slate-900">{aff.name}</p>
                          <span className="text-[10px] text-[#20C997] font-semibold">
                            {aff.commission || 'Verified Partner'}
                          </span>
                        </div>
                        <div className="flex space-x-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => togglePlacement(aff.id, 'top_cta')}
                            className={`px-2 py-1 text-[10px] font-bold rounded-lg border transition ${
                              topActive
                                ? 'bg-blue-50 text-[#0056B3] border-blue-200'
                                : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                            }`}
                          >
                            + Top CTA
                          </button>
                          <button
                            type="button"
                            onClick={() => togglePlacement(aff.id, 'middle_comparison')}
                            className={`px-2 py-1 text-[10px] font-bold rounded-lg border transition ${
                              middleActive
                                ? 'bg-blue-50 text-[#0056B3] border-blue-200'
                                : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                            }`}
                          >
                            + Middle
                          </button>
                          <button
                            type="button"
                            onClick={() => togglePlacement(aff.id, 'footer_banner')}
                            className={`px-2 py-1 text-[10px] font-bold rounded-lg border transition ${
                              footerActive
                                ? 'bg-blue-50 text-[#0056B3] border-blue-200'
                                : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                            }`}
                          >
                            + Footer
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </form>
      </main>

      {/* Toast Notification */}
      {showToast && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-blue-500/30 flex items-center space-x-3 text-xs animate-in fade-in slide-in-from-bottom-5">
          <CheckCircle2 size={16} className="text-[#20C997]" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
