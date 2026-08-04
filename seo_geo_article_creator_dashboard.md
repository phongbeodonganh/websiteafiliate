<!DOCTYPE html>
<html lang="vi" class="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Affiliate Pro - SEO & GEO Article Studio</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            darkMode: 'class',
            theme: {
                extend: {
                    colors: {
                        cyber: {
                            bg: '#07080D',
                            card: '#121520',
                            border: '#1E2336',
                            cyan: '#06B6D4',
                            violet: '#8B5CF6',
                            emerald: '#10B981',
                            amber: '#F59E0B'
                        }
                    },
                    fontFamily: {
                        sans: ['Inter', 'sans-serif']
                    }
                }
            }
        }
    </script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        body { font-family: 'Inter', sans-serif; background-color: #07080D; color: #F1F5F9; }
        .glass-panel { background: rgba(18, 21, 32, 0.85); backdrop-filter: blur(16px); border: 1px solid rgba(255, 255, 255, 0.08); }
        .glow-cyan:hover { box-shadow: 0 0 20px rgba(6, 182, 212, 0.2); border-color: rgba(6, 182, 212, 0.4); }
        /* Custom scrollbar */
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: #07080D; }
        ::-webkit-scrollbar-thumb { background: #1E2336; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: #06B6D4; }
    </style>
</head>
<body class="min-h-screen flex selection:bg-cyan-500 selection:text-slate-950">

    <!-- Sidebar Navigation -->
    <aside class="w-64 glass-panel border-r border-slate-800/80 flex flex-col justify-between hidden lg:flex fixed inset-y-0 z-40">
        <div>
            <!-- Logo Header -->
            <div class="h-16 px-6 flex items-center space-x-3 border-b border-slate-800/80">
                <div class="bg-gradient-to-tr from-cyan-500 to-violet-600 text-slate-950 p-2 rounded-xl shadow-lg shadow-cyan-500/30">
                    <i class="fa-solid fa-microchip text-sm font-black"></i>
                </div>
                <span class="text-base font-black tracking-wider bg-gradient-to-r from-cyan-400 via-violet-400 to-rose-400 bg-clip-text text-transparent">
                    AFFILIATE <span class="text-cyan-400">PRO</span>
                </span>
            </div>

            <!-- Navigation Links -->
            <div class="p-4 space-y-6">
                <div>
                    <p class="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Tổng quan</p>
                    <nav class="space-y-1 text-xs">
                        <a href="#" class="flex items-center space-x-3 px-3 py-2.5 rounded-xl text-slate-400 hover:bg-slate-800/50 hover:text-white transition">
                            <i class="fa-solid fa-chart-pie w-4 text-cyan-400"></i>
                            <span>Global Dashboard</span>
                        </a>
                    </nav>
                </div>

                <div>
                    <p class="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Nội dung</p>
                    <nav class="space-y-1 text-xs">
                        <a href="#" class="flex items-center space-x-3 px-3 py-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 font-semibold border border-cyan-500/20">
                            <i class="fa-solid fa-file-pen w-4"></i>
                            <span>Article Management</span>
                        </a>
                        <a href="#" class="flex items-center space-x-3 px-3 py-2.5 rounded-xl text-slate-400 hover:bg-slate-800/50 hover:text-white transition">
                            <i class="fa-solid fa-folder-tree w-4 text-violet-400"></i>
                            <span>Categories & Sub-Cats</span>
                        </a>
                    </nav>
                </div>

                <div>
                    <p class="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Hệ thống & Affiliate</p>
                    <nav class="space-y-1 text-xs">
                        <a href="#" class="flex items-center space-x-3 px-3 py-2.5 rounded-xl text-slate-400 hover:bg-slate-800/50 hover:text-white transition">
                            <i class="fa-solid fa-users w-4 text-emerald-400"></i>
                            <span>Subscriber Leads</span>
                        </a>
                        <a href="#" class="flex items-center space-x-3 px-3 py-2.5 rounded-xl text-slate-400 hover:bg-slate-800/50 hover:text-white transition">
                            <i class="fa-solid fa-handshake w-4 text-amber-400"></i>
                            <span>Affiliate Campaigns</span>
                        </a>
                        <a href="#" class="flex items-center space-x-3 px-3 py-2.5 rounded-xl text-slate-400 hover:bg-slate-800/50 hover:text-white transition">
                            <i class="fa-solid fa-globe w-4 text-rose-400"></i>
                            <span>Global SEO & System</span>
                        </a>
                    </nav>
                </div>
            </div>
        </div>

        <!-- User Profile Card -->
        <div class="p-4 border-t border-slate-800/80">
            <div class="glass-panel p-3 rounded-2xl flex items-center space-x-3">
                <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-violet-600 flex items-center justify-center font-bold text-slate-950 text-sm shadow">
                    AD
                </div>
                <div class="overflow-hidden">
                    <p class="text-xs font-bold text-white truncate">admin</p>
                    <p class="text-[10px] text-cyan-400 uppercase tracking-wider font-semibold">Super Admin</p>
                </div>
            </div>
        </div>
    </aside>

    <!-- Main Content Area -->
    <div class="flex-1 lg:ml-64 flex flex-col min-h-screen">
        
        <!-- Top Navbar -->
        <header class="h-16 glass-panel border-b border-slate-800/80 px-6 flex items-center justify-between sticky top-0 z-30">
            <div class="flex items-center space-x-4">
                <span class="text-xs font-semibold text-slate-400">Back to List</span>
                <i class="fa-solid fa-chevron-right text-[10px] text-slate-600"></i>
                <h1 class="text-xs sm:text-sm font-bold text-cyan-400">Create Article (SEO & GEO V4.2)</h1>
            </div>

            <div class="flex items-center space-x-4">
                <div class="relative hidden sm:block">
                    <input type="text" placeholder="Search articles or team..." class="bg-slate-900/60 border border-slate-800 rounded-xl py-1.5 pl-9 pr-4 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 transition w-64">
                    <i class="fa-solid fa-magnifying-glass absolute left-3 top-2.5 text-xs text-slate-400"></i>
                </div>
                <a href="#" target="_blank" class="px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 flex items-center space-x-2 transition">
                    <span>Public Website</span>
                    <i class="fa-solid fa-external-link text-[10px] text-cyan-400"></i>
                </a>
                <button onclick="showToast('Đã lưu bản nháp tự động!')" class="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-cyan-400 transition" title="Logout">
                    <i class="fa-solid fa-right-from-bracket text-xs"></i>
                </button>
            </div>
        </header>

        <!-- Main Form Grid -->
        <main class="flex-grow p-4 sm:p-6 lg:p-8 grid grid-cols-1 xl:grid-cols-12 gap-6 max-w-7xl mx-auto w-full">
            
            <!-- Left Column: Core Content & GEO/SEO Editor (Span 8) -->
            <div class="xl:col-span-8 space-y-6">
                
                <!-- Basic Info Card -->
                <div class="glass-panel rounded-3xl p-6 space-y-5">
                    <div class="flex items-center justify-between pb-3 border-b border-slate-800">
                        <h2 class="text-sm font-bold text-white flex items-center space-x-2">
                            <i class="fa-solid fa-pen-nib text-cyan-400"></i>
                            <span>Thông Tin Bài Viết & Nội Dung Chính</span>
                        </h2>
                        <span class="text-[10px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2.5 py-1 rounded-lg font-bold">Auto-Slug Active</span>
                    </div>

                    <!-- Article Title -->
                    <div>
                        <label class="block text-xs font-bold text-slate-300 mb-2">Article Title *</label>
                        <input type="text" id="articleTitle" placeholder="Nhập tiêu đề chuẩn SEO (H1)..." class="w-full bg-slate-900/80 border border-slate-800 rounded-2xl px-4 py-3 text-xs sm:text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition font-medium">
                    </div>

                    <!-- Excerpt / Sapo -->
                    <div>
                        <label class="block text-xs font-bold text-slate-300 mb-2">Excerpt (Homepage Sapo Summary) *</label>
                        <textarea rows="2" placeholder="Tóm tắt ngắn gọn thu hút người đọc và AI trích dẫn..." class="w-full bg-slate-900/80 border border-slate-800 rounded-2xl px-4 py-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition"></textarea>
                    </div>

                    <!-- Article Content Rich Text -->
                    <div>
                        <div class="flex items-center justify-between mb-2">
                            <label class="text-xs font-bold text-slate-300">Article Content (Rich Text / HTML) *</label>
                            <div class="flex space-x-2 text-xs">
                                <button type="button" onclick="formatText('bold')" class="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300" title="Bold"><i class="fa-solid fa-bold"></i></button>
                                <button type="button" onclick="formatText('italic')" class="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300" title="Italic"><i class="fa-solid fa-italic"></i></button>
                                <button type="button" onclick="insertHeading()" class="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300" title="Insert Heading H2"><i class="fa-solid fa-heading"></i></button>
                                <button type="button" onclick="insertFaqBlock()" class="px-2.5 py-1 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 rounded-lg border border-cyan-500/35 font-semibold">+ Thêm FAQ Schema</button>
                            </div>
                        </div>
                        <textarea id="articleContent" rows="10" placeholder="Viết nội dung bài viết chi tiết..." class="w-full bg-slate-900/80 border border-slate-800 rounded-2xl p-4 text-xs sm:text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition font-mono leading-relaxed"></textarea>
                    </div>
                </div>

                <!-- GEO & AI Engine Optimization Studio Card -->
                <div class="glass-panel rounded-3xl p-6 space-y-5 border-l-4 border-l-violet-500 bg-gradient-to-r from-violet-950/20 via-transparent to-transparent">
                    <div class="flex items-center justify-between pb-3 border-b border-slate-800">
                        <div class="flex items-center space-x-2">
                            <i class="fa-solid fa-brain text-violet-400 text-base"></i>
                            <div>
                                <h2 class="text-sm font-bold text-white">GEO (Generative Engine Optimization) Hub</h2>
                                <p class="text-[10px] text-slate-400">Tối ưu nội dung để hiển thị trên ChatGPT, Google SGE, Claude & Perplexity</p>
                            </div>
                        </div>
                        <span class="bg-violet-500/20 text-violet-300 border border-violet-500/30 text-[10px] font-bold px-3 py-1 rounded-xl">AI-Ready v2.4</span>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <!-- Key Takeaways Box -->
                        <div class="glass-panel rounded-2xl p-4 space-y-2 bg-slate-900/50">
                            <label class="block text-xs font-bold text-violet-300 flex items-center justify-between">
                                <span><i class="fa-solid fa-list-check mr-1.5"></i> Key Takeaways (Tóm tắt nhanh cho LLM)</span>
                                <button type="button" onclick="generateAiTakeaways()" class="text-[10px] text-cyan-400 hover:underline"><i class="fa-solid fa-wand-magic-sparkles mr-1"></i> AI Gợi ý</button>
                            </label>
                            <textarea rows="3" placeholder="- Điểm chính 1&#10;- Điểm chính 2&#10;- Điểm chính 3" class="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-violet-500"></textarea>
                        </div>

                        <!-- Entity Citations & Keywords -->
                        <div class="glass-panel rounded-2xl p-4 space-y-2 bg-slate-900/50">
                            <label class="block text-xs font-bold text-violet-300">
                                <span><i class="fa-solid fa-cube mr-1.5"></i> Định danh Thực thể & Nguồn uy tín (Entities)</span>
                            </label>
                            <input type="text" placeholder="Ví dụ: OpenAI, GPT-4, Google DeepMind, NVIDIA H100..." class="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-violet-500">
                            <p class="text-[10px] text-slate-500">Giúp các công cụ tìm kiếm AI nhận diện chính xác chủ thể bài viết.</p>
                        </div>
                    </div>

                    <!-- FAQ Schema Generator Builder -->
                    <div class="glass-panel rounded-2xl p-4 space-y-3 bg-slate-900/40">
                        <div class="flex items-center justify-between">
                            <span class="text-xs font-bold text-slate-200 flex items-center">
                                <i class="fa-solid fa-circle-question text-cyan-400 mr-2"></i> Trình tạo Câu hỏi & Trả lời tự động (FAQ Schema)
                            </span>
                            <button type="button" onclick="addFaqRow()" class="px-3 py-1 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 text-xs font-bold rounded-lg border border-cyan-500/30">+ Thêm Câu Hỏi</button>
                        </div>
                        <div id="faqContainer" class="space-y-2">
                            <div class="flex gap-2 items-center">
                                <input type="text" placeholder="Câu hỏi (Question)..." class="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white">
                                <input type="text" placeholder="Câu trả lời (Answer)..." class="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white">
                                <button type="button" onclick="this.parentElement.remove()" class="p-2 text-rose-400 hover:bg-rose-500/10 rounded-xl"><i class="fa-solid fa-trash-can text-xs"></i></button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Traditional SEO Metadata Card -->
                <div class="glass-panel rounded-3xl p-6 space-y-5">
                    <div class="flex items-center justify-between pb-3 border-b border-slate-800">
                        <h2 class="text-sm font-bold text-white flex items-center space-x-2">
                            <i class="fa-solid fa-magnifying-glass-chart text-emerald-400"></i>
                            <span>Tối Ưu SEO Truyền Thống & Meta Tags</span>
                        </h2>
                        <span class="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-lg font-bold">SEO Score: 92/100</span>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-xs font-bold text-slate-300 mb-1.5">Focus Keyword *</label>
                            <input type="text" placeholder="Ví dụ: công nghệ AI 2026..." class="w-full bg-slate-900/80 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500">
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-slate-300 mb-1.5">URL Slug *</label>
                            <input type="text" placeholder="cong-nghe-ai-2026-xu-huong-moi..." class="w-full bg-slate-900/80 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono">
                        </div>
                    </div>

                    <div>
                        <label class="block text-xs font-bold text-slate-300 mb-1.5">Meta Title (SEO Title - Max 60 chars)</label>
                        <input type="text" placeholder="Tiêu đề hiển thị trên Google Search..." class="w-full bg-slate-900/80 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500">
                    </div>

                    <div>
                        <label class="block text-xs font-bold text-slate-300 mb-1.5">Meta Description (Max 160 chars)</label>
                        <textarea rows="2" placeholder="Mô tả ngắn gọn thu hút CTR từ kết quả tìm kiếm..." class="w-full bg-slate-900/80 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"></textarea>
                    </div>
                </div>

            </div>

            <!-- Right Column: Categories, Sub-Categories & Affiliate Placements (Span 4) -->
            <div class="xl:col-span-4 space-y-6">
                
                <!-- Multi-Level Category & Sub-Category Setup -->
                <div class="glass-panel rounded-3xl p-6 space-y-5">
                    <div class="flex items-center justify-between pb-3 border-b border-slate-800">
                        <h2 class="text-sm font-bold text-white flex items-center space-x-2">
                            <i class="fa-solid fa-folder-tree text-amber-400"></i>
                            <span>Categories & Sub-Categories</span>
                        </h2>
                    </div>

                    <!-- Primary Category Selector -->
                    <div>
                        <label class="block text-xs font-bold text-slate-300 mb-2">Primary Category (Level 1) *</label>
                        <select id="parentCategory" onchange="updateSubCategories()" class="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500">
                            <option value="ai">Trí Tuệ Nhân Tạo (AI)</option>
                            <option value="hardware">Phần Cứng & Thiết Bị</option>
                            <option value="security">Bảo Mật & An Ninh Mạng</option>
                            <option value="cloud">Cloud & DevOps</option>
                            <option value="startup">Startup & Đầu Tư</option>
                        </select>
                    </div>

                    <!-- Sub Category Selector -->
                    <div>
                        <label class="block text-xs font-bold text-slate-300 mb-2">Sub-Category (Level 2) *</label>
                        <select id="subCategory" class="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500">
                            <!-- Populated dynamically via JS -->
                        </select>
                    </div>

                    <!-- Sub-Category Manager Modal Trigger / Quick Add -->
                    <div class="pt-2 border-t border-slate-800 flex items-center justify-between">
                        <span class="text-xs text-slate-400">Quản lý danh mục con?</span>
                        <button type="button" onclick="openSubCatModal()" class="text-xs font-bold text-cyan-400 hover:underline flex items-center space-x-1">
                            <i class="fa-solid fa-plus-circle"></i>
                            <span>Thêm Sub-Cat Mới</span>
                        </button>
                    </div>

                    <!-- Publishing Status & Badges -->
                    <div class="pt-3 border-t border-slate-800 space-y-3">
                        <div>
                            <label class="block text-xs font-bold text-slate-300 mb-2">Publishing Status</label>
                            <select class="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none">
                                <option>Published (Xuất bản ngay)</option>
                                <option>Draft (Bản nháp)</option>
                                <option>Scheduled (Lên lịch)</option>
                            </select>
                        </div>
                        <div class="flex items-center space-x-3 pt-1">
                            <input type="checkbox" id="featuredCheck" class="w-4 h-4 rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-0">
                            <label for="featuredCheck" class="text-xs font-bold text-amber-400 cursor-pointer">⭐ Mark as "Weekly Hot / Featured"</label>
                        </div>
                    </div>

                    <button type="button" onclick="submitArticle()" class="w-full bg-gradient-to-r from-cyan-500 to-violet-600 text-slate-950 font-black py-3 rounded-xl text-xs shadow-lg shadow-cyan-500/20 hover:opacity-90 transition flex items-center justify-center space-x-2">
                        <i class="fa-solid fa-rocket"></i>
                        <span>Xuất Bản Bài Viết (SEO & GEO Ready)</span>
                    </button>
                </div>

                <!-- Multi-Position Affiliate Placement Card -->
                <div class="glass-panel rounded-3xl p-6 space-y-4">
                    <div class="flex items-center justify-between pb-3 border-b border-slate-800">
                        <h2 class="text-sm font-bold text-white flex items-center space-x-2">
                            <i class="fa-solid fa-link text-cyan-400"></i>
                            <span>Affiliate Campaign Placements</span>
                        </h2>
                    </div>
                    <p class="text-[11px] text-slate-400">Gắn liên kết hoa hồng tự động vào các vị trí CTA trong bài viết.</p>

                    <div class="space-y-3">
                        <div class="glass-panel p-3 rounded-2xl flex items-center justify-between bg-slate-900/60">
                            <div>
                                <p class="text-xs font-bold text-white">Surfer SEO AI</p>
                                <span class="text-[10px] text-emerald-400 font-semibold">Commission: 30% Recurring</span>
                            </div>
                            <div class="flex space-x-1.5">
                                <button type="button" onclick="toggleCta(this)" class="px-2 py-1 bg-cyan-500/20 text-cyan-400 text-[10px] font-bold rounded-lg border border-cyan-500/30">+ Top CTA</button>
                                <button type="button" onclick="toggleCta(this)" class="px-2 py-1 bg-slate-800 text-slate-400 text-[10px] font-bold rounded-lg">+ Middle</button>
                            </div>
                        </div>

                        <div class="glass-panel p-3 rounded-2xl flex items-center justify-between bg-slate-900/60">
                            <div>
                                <p class="text-xs font-bold text-white">Cursor AI Code Editor</p>
                                <span class="text-[10px] text-emerald-400 font-semibold">Commission: $20 / Sign-up</span>
                            </div>
                            <div class="flex space-x-1.5">
                                <button type="button" onclick="toggleCta(this)" class="px-2 py-1 bg-cyan-500/20 text-cyan-400 text-[10px] font-bold rounded-lg border border-cyan-500/30">+ Top CTA</button>
                                <button type="button" onclick="toggleCta(this)" class="px-2 py-1 bg-slate-800 text-slate-400 text-[10px] font-bold rounded-lg">+ Middle</button>
                            </div>
                        </div>

                        <div class="glass-panel p-3 rounded-2xl flex items-center justify-between bg-slate-900/60">
                            <div>
                                <p class="text-xs font-bold text-white">ElevenLabs Voice AI</p>
                                <span class="text-[10px] text-emerald-400 font-semibold">Commission: 25%</span>
                            </div>
                            <div class="flex space-x-1.5">
                                <button type="button" onclick="toggleCta(this)" class="px-2 py-1 bg-cyan-500/20 text-cyan-400 text-[10px] font-bold rounded-lg border border-cyan-500/30">+ Top CTA</button>
                                <button type="button" onclick="toggleCta(this)" class="px-2 py-1 bg-slate-800 text-slate-400 text-[10px] font-bold rounded-lg">+ Middle</button>
                            </div>
                        </div>
                    </div>
                </div>

            </div>

        </main>
    </div>

    <!-- Notification Toast Modal -->
    <div id="toast" class="fixed bottom-5 right-5 z-50 transform translate-y-20 opacity-0 transition-all duration-300 glass-panel bg-slate-900/95 text-white px-5 py-3 rounded-2xl shadow-2xl border border-cyan-500/30 flex items-center space-x-3 text-xs">
        <i class="fa-solid fa-circle-check text-cyan-400 text-base"></i>
        <span id="toastMsg">Thành công!</span>
    </div>

    <!-- JavaScript Logic -->
    <script>
        // Sub-Categories mapping database
        const subCategoriesData = {
            ai: [
                { id: 'llm', name: 'Large Language Models (LLMs)' },
                { id: 'agents', name: 'AI Autonomous Agents' },
                { id: 'computervision', name: 'Computer Vision & GenMedia' },
                { id: 'ethics', name: 'AI Ethics & Regulation' }
            ],
            hardware: [
                { id: 'chips', name: 'AI Processors & GPUs (NVIDIA/AMD)' },
                { id: 'devices', name: 'Smartphones & Wearables' },
                { id: 'quantum', name: 'Điện Toán Lượng Tử (Quantum Tech)' }
            ],
            security: [
                { id: 'zeroday', name: 'Zero-Day Exploits & Patches' },
                { id: 'cloudsec', name: 'Cloud Security & DevSecOps' },
                { id: 'cryptography', name: 'Mã Hóa & Blockchain Security' }
            ],
            cloud: [
                { id: 'serverless', name: 'Serverless Architecture' },
                { id: 'kubernetes', name: 'Kubernetes & Edge Computing' }
            ],
            startup: [
                { id: 'venture', name: 'Venture Capital & Funding' },
                { id: 'saas', name: 'SaaS Growth & Monetization' }
            ]
        };

        // Initialize Sub Categories on Load
        function updateSubCategories() {
            const parentCatSelect = document.getElementById('parentCategory');
            const subCatSelect = document.getElementById('subCategory');
            const selectedParent = parentCatSelect.value;
            
            subCatSelect.innerHTML = '';
            const subs = subCategoriesData[selectedParent] || [];
            
            subs.forEach(sub => {
                const opt = document.createElement('option');
                opt.value = sub.id;
                opt.textContent = sub.name;
                subCatSelect.appendChild(opt);
            });
        }

        // Run on initial load
        window.addEventListener('DOMContentLoaded', () => {
            updateSubCategories();
        });

        // Add FAQ dynamic row
        function addFaqRow() {
            const container = document.getElementById('faqContainer');
            const div = document.createElement('div');
            div.className = 'flex gap-2 items-center';
            div.innerHTML = `
                <input type="text" placeholder="Câu hỏi (Question)..." class="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white">
                <input type="text" placeholder="Câu trả lời (Answer)..." class="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white">
                <button type="button" onclick="this.parentElement.remove()" class="p-2 text-rose-400 hover:bg-rose-500/10 rounded-xl"><i class="fa-solid fa-trash-can text-xs"></i></button>
            `;
            container.appendChild(div);
        }

        // AI Takeaways mock generator
        function generateAiTakeaways() {
            showToast('AI đang phân tích và tổng hợp Key Takeaways...');
            setTimeout(() => {
                const textarea = document.querySelector('textarea[placeholder*="- Điểm chính 1"]');
                if (textarea) {
                    textarea.value = "- Bài viết phân tích toàn diện xu hướng công nghệ mới nhất năm 2026.\n- Tích hợp kiến trúc phân rã AI giúp tối ưu hiệu suất xử lý hệ thống.\n- Giải pháp bảo mật doanh nghiệp chống lại lỗ hổng zero-day đa lớp.";
                }
                showToast('Đã tạo thành công Key Takeaways chuẩn GEO!');
            }, 1000);
        }

        // Simple text formatting tools for content textarea
        function formatText(tag) {
            const textarea = document.getElementById('articleContent');
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const selectedText = textarea.value.substring(start, end);
            let replacement = selectedText;
            if (tag === 'bold') replacement = `**${selectedText}**`;
            if (tag === 'italic') replacement = `*${selectedText}*`;
            
            textarea.value = textarea.value.substring(0, start) + replacement + textarea.value.substring(end);
            showToast('Đã áp dụng định dạng văn bản.');
        }

        function insertHeading() {
            const textarea = document.getElementById('articleContent');
            textarea.value += "\n\n## Tiêu đề phụ (H2 chuẩn GEO)\n";
            showToast('Đã thêm thẻ H2.');
        }

        function insertFaqBlock() {
            const textarea = document.getElementById('articleContent');
            textarea.value += "\n\n### Câu hỏi thường gặp (FAQ)\nQ: ...?\nA: ...\n";
            showToast('Đã thêm cấu trúc FAQ.');
        }

        // Toggle Affiliate CTA Button
        function toggleCta(btn) {
            if (btn.classList.contains('bg-slate-800')) {
                btn.classList.remove('bg-slate-800', 'text-slate-400');
                btn.classList.add('bg-cyan-500/20', 'text-cyan-400', 'border', 'border-cyan-500/30');
                btn.textContent = '+ Active CTA';
            } else {
                btn.classList.remove('bg-cyan-500/20', 'text-cyan-400', 'border', 'border-cyan-500/30');
                btn.classList.add('bg-slate-800', 'text-slate-400');
                btn.textContent = '+ Middle';
            }
            showToast('Đã cập nhật vị trí Affiliate CTA.');
        }

        // Submit Article Handler
        function submitArticle() {
            const title = document.getElementById('articleTitle').value.trim();
            if (!title) {
                showToast('Vui lòng nhập tiêu đề bài viết!');
                return;
            }
            showToast('🚀 Đang xuất bản bài viết chuẩn SEO & GEO thành công!');
        }

        // Notification Toast Handler (No alert() used)
        function showToast(message) {
            const toast = document.getElementById('toast');
            const toastMsg = document.getElementById('toastMsg');
            toastMsg.textContent = message;
            toast.classList.remove('translate-y-20', 'opacity-0');
            setTimeout(() => {
                toast.classList.add('translate-y-20', 'opacity-0');
            }, 3000);
        }
    </script>
</body>
</html>