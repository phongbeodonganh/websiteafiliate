# BẢN ĐẶC TẢ KỸ THUẬT VÀ KIẾN TRÚC HỆ THỐNG (V5.0 BENTO & SAAS LIGHT EDITION)

**Thương hiệu hệ thống:** AI AFFILIATE HUB (`aiaffiliatehub.com`)  
**Phiên bản:** 5.0 Bento & SaaS Light Edition  
**Công nghệ Nền tảng:** Next.js (App Router, Turbopack, Server Components), TypeScript, TailwindCSS, MongoDB Atlas (Mongoose ODM).

---

## 1. Sơ đồ Cấu trúc Cơ sở Dữ liệu MongoDB (MongoDB Schemas & Collections)

Hệ thống lưu trữ trên **MongoDB Atlas** với kết nối tối ưu DNS (`dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4'])`), bao gồm 8 Collections chính:

### 1.1. Collection `users` (Quản lý Nhân sự & Phân quyền)
| Trường dữ liệu (Field) | Kiểu dữ liệu | Mô tả chi tiết |
| :--- | :--- | :--- |
| `_id` | ObjectId | Mã định danh duy nhất (Primary Key). |
| `username` | String | Tên đăng nhập duy nhất (Unique, Required). |
| `password_hash` | String | Mật khẩu mã hóa Bcrypt. |
| `role` | String | Phân quyền: `'admin'`, `'editor'`, `'author'`. |
| `name` | String | Họ tên hiển thị của Tác giả / Biên tập viên. |
| `status` | String | Trạng thái: `'active'` hoặc `'inactive'`. |
| `avatar` | String | Ký tự đại diện hoặc URL avatar tác giả. |

### 1.2. Collection `categories` & `sub_categories` (Danh mục Ngách & Use-Cases)
Cấu hình danh mục đa cấp gồm **Danh mục Use-Case chính** và các **Danh mục Công cụ AI**:
1. **`AI Use Cases`** (`ai-use-cases`): Danh mục tập trung các bài viết Case Study ứng dụng AI thực tế.
   - `AI for Creators & Media` (`ai-for-creators-media`): YouTube tự động, Video làm kênh không lộ mặt, Avatars & Presenters, AI Music.
   - `AI for Real Estate & Sales` (`ai-for-real-estate-sales`): CRM tự động hóa, phân bổ Lead, Chatbot CSKH BĐS.
   - `AI for E-commerce & Business` (`ai-for-e-commerce-online-business`): Tối ưu sàn Shopee/Lazada, tạo mô tả sản phẩm tự động.
   - `AI for Marketers & Agencies` (`ai-for-marketers-agencies`): Tạo kịch bản quảng cáo, SEO Content tự động hóa.
   - `AI for Finance & Legal` (`ai-for-finance-legal-consulting`): Phân tích tài chính, soạn thảo hợp đồng tự động.
2. **`AI Content & Copywriting`** (`ai-content-copywriting`)
3. **`AI Video & Image Generation`** (`ai-video-image-generation`)
4. **`AI Automation & Agents`** (`ai-automation-agents`)
5. **`AI Marketing & Sales`** (`ai-marketing-sales`)
6. **`AI Audio & Code`** (`ai-audio-code`)

### 1.3. Collection `articles` (Bài viết Chi tiết & Tối ưu SEO/GEO)
| Trường dữ liệu (Field) | Kiểu dữ liệu | Mô tả chi tiết |
| :--- | :--- | :--- |
| `_id` | ObjectId | Khóa chính. |
| `author_id` | ObjectId (Ref: `users`) | Tác giả bài viết. |
| `category_id` | ObjectId (Ref: `categories`) | Danh mục lớn. |
| `sub_category_id` | ObjectId (Ref: `sub_categories`) | Danh mục con / Use-Case. |
| `title` | String | Tiêu đề bài viết chuẩn SEO. |
| `slug` | String | URL Slug duy nhất (Ví dụ: `case-study-faceless-youtube-automation`). |
| `excerpt` | String | Đoạn Sapo tóm tắt ngắn. |
| `content` | String | Nội dung bài viết HTML / Rich Text. |
| `status` | String | Trạng thái bài viết: `'draft'`, `'published'`. |
| `is_featured` | Boolean | Bài viết nổi bật Spotlight (True/False). |
| `view_count` | Number | Tổng số lượt xem (Default: 0). |
| `revenue` | Number | Doanh thu ước tính $. |
| `thumbnail_url` | String | Đường dẫn ảnh đại diện. |
| `focus_keyword` | String | Từ khóa SEO mục tiêu bài viết. |
| `key_takeaways` | Array[String] | Danh sách điểm tóm tắt chính cho Generative AI Engine (LLMs: ChatGPT, Claude, Perplexity). |
| `entities` | Array[String] | Định danh thực thể & thương hiệu liên quan (Ví dụ: OpenAI, GPT-4, NVIDIA H100). |
| `faq_schema` | Array[{question, answer}] | Cặp câu hỏi & trả lời tự động nhúng Schema FAQPage JSON-LD. |
| `affiliate_placements` | Array[{affiliate_link_id, position_label}] | Gắn liên kết tiếp thị hoa hồng đa vị trí (`top_cta`, `middle`, `footer_cta`). |

### 1.4. Collection `affiliate_links` (Kho Link Tiếp thị Liên kết)
Chiến dịch link tiếp thị liên kết do **Admin** quản lý trung tâm:
- `name`: Tên chiến dịch (ví dụ: HeyGen AI, Jasper AI, Canva Pro).
- `base_url`: URL affiliate gốc (Ví dụ: `https://heygen.com/?via=aiaffiliatehub`).
- `commission`: Tỉ lệ hoa hồng (ví dụ: `30% Recurring`, `50$ / Signup`).
- `cookie`: Thời gian cookie (30 ngày, 90 ngày).

### 1.5. Collection `article_affiliate_relations` (Đa liên kết bài viết)
Quản lý việc gắn nhiều link tiếp thị liên kết ở các vị trí khác nhau trong cùng 1 bài viết (`top_cta`, `middle_comparison`, `footer_banner`).

### 1.6. Collection `click_logs` (Tracking Thống kê Clicks)
Ghi nhận chi tiết địa chỉ IP, User-Agent, thời gian click và ngữ cảnh bài viết khi người dùng click vào nút Affiliate.

### 1.7. Collection `settings` (Cấu hình SEO, GEO & Branding)
- `site_title`: `"AI AFFILIATE HUB"`
- `canonicalUrl`: `"https://aiaffiliatehub.com"`
- `geoTarget`: `"US, VN, GLOBAL"`
- `primary_color`: `"#0056B3"` (Royal Blue)
- `accent_color`: `"#FF6B6B"` (Coral Orange)
- `footer_text`: Mô tả thương hiệu chuẩn tiếng Anh.

---

## 2. Tiêu Chuẩn URL, SEO On-Page & GEO Optimization

### 2.1. Cấu trúc Đường dẫn URL Chuẩn Quốc Tế
- **Bài viết chi tiết**: `/article/[slug]`  
  *Ví dụ:* `https://aiaffiliatehub.com/article/case-study-faceless-youtube-automation-ai-avatars`
- **Chuyển hướng tương thích ngược (Redirects)**:
  Mọi đường dẫn cũ dạng `/bai-viet/[slug]` tự động phát lệnh **301/307 Redirect** chuyển hướng tức thì sang `/article/[slug]` để bảo toàn thứ hạng SEO trên Google.

### 2.2. Dữ liệu Cấu trúc Schema JSON-LD & Meta Tags
Mỗi trang bài viết được nhúng tự động Schema JSON-LD tiêu chuẩn `NewsArticle`:
- `headline`, `image`, `datePublished`, `author`, `publisher` (`AI AFFILIATE HUB`).
- Canonical URL chính xác `https://aiaffiliatehub.com/article/[slug]`.

---

## 3. Hệ Thống Giao Diện (B2B SaaS Light Theme & Bento Edition 7:5)

### 3.1. Bảng Màu & Visual Hierarchy
- **Nền tổng thể (Background)**: Xám nhạt dịu mắt `#F8F9FA` (`bg-[#F8F9FA]`).
- **Thẻ nội dung (Cards)**: Trắng tinh thuần khiết `#FFFFFF` kết hợp bóng đổ mờ mịn `shadow-sm hover:shadow-xl hover:shadow-slate-200/60 border border-slate-100`.
- **Tông màu Chủ đạo (Primary `#0056B3`)**: Xanh dương hoàng gia Royal Blue tạo cảm giác tin cậy chuyên gia B2B trên Header, tiêu đề và biểu tượng.
- **Tông màu Accent Chuyển đổi (Coral Orange `#FF6B6B`)**: Áp dụng cho các nút Call-to-Action chuyển đổi doanh thu chính (*"Claim Deal & Start"*, *"Read Analysis"*).
- **Tông màu Nhãn Xác Nhận (Mint Emerald `#20C997`)**: Nhãn `✓ Verified Offers` và thống kê Views mang lại sự an tâm cho người dùng.

### 3.2. Bố Cục Hero Bento Grid (Bento Edition 7:5) & Breaking News Ticker
- **Thanh Tin Nóng (Breaking News Ticker)**: Nằm ngay dưới Navigation Bar với nhãn nhấp nháy `Tin Nóng` (`bg-cyan-500 text-slate-950 font-black animate-pulse`) liên kết bài viết nổi bật.
- **Khối Hero Bento Grid 7:5**:
  - **Main Bento Card (`lg:col-span-7`)**: Thẻ Bento chính lớn với ảnh nền full-width, lớp phủ mờ tối, nhãn danh mục nổi bật, tác giả và nút Read Story màu Coral Orange `#FF6B6B`.
  - **Secondary Bento Cards (`lg:col-span-5`)**: 2 thẻ Bento phụ xếp chồng dọc trình bày các Use-Case AI ngách kèm số lượt xem và nhãn phân loại.

---

## 4. Phân Quyền Hệ Thống (Role-Based Access Control - RBAC)

| Quyền Hạn | Admin (`admin`) | Biên Tập Viên / Tác Giả (`editor`, `author`) |
| :--- | :--- | :--- |
| **Quản lý Bài viết** | Toàn quyền xem, sửa, xuất bản, xóa toàn bộ bài viết trên hệ thống. | Chỉ xem và chỉnh sửa các bài viết do chính mình tạo ra (`WHERE author_id = user.id`). |
| **Kho Link Affiliate** | Toàn quyền thêm, sửa, xóa các link affiliate chiến dịch gốc. | Ẩn hoàn toàn (403 Forbidden). Chỉ được chọn link từ danh sách sẵn có để gắn vào bài. |
| **Báo cáo Thống kê** | Xem toàn bộ KPI doanh thu, lượt click toàn hệ thống và Leaderboard nhân sự. | Chỉ xem được chỉ số Views & Clicks trên các bài viết do chính mình sở hữu. |
