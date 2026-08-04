
# BẢN ĐẶC TẢ KỸ THUẬT - WEBSITE AFFILIATE MVP (V3)
**Phiên bản:** 3.0
**Mô hình:** Website tin tức/Blog kết hợp Affiliate Marketing (Cơ chế Multi-tenant thu nhỏ)

---

## 1. Yêu cầu Chức năng (Functional Requirements)

### 1.1. Module Xác thực & Phân quyền (Auth & RBAC)
*   **Đăng nhập (Login):** Người dùng đăng nhập bằng `username` và `password`. Hệ thống trả về JWT Token.
*   **Quản lý phiên (Session Management):** JWT Token có thời hạn (ví dụ: 24h). FE tự động gắn token vào header `Authorization: Bearer <token>` cho các request Private.
*   **Phân quyền chặt chẽ (Chính sách Multi-tenant thu nhỏ):**
    *   **Admin:** Toàn quyền. Xem, thêm, sửa, xóa toàn bộ bài viết, người dùng, và link affiliate của hệ thống.
    *   **Editor / Author (Cộng tác viên):** Chỉ có thể xem, sửa, xóa các bài viết **do chính họ tạo ra** (Dựa vào `author_id` = `user_id` đang đăng nhập). Không được phép nhìn thấy hoặc chỉnh sửa bài viết của Editor/Author khác. Không có quyền quản lý Users hay Link Affiliate.

### 1.2. Module Quản lý Bài viết (Article Management - CMS)
*   **Tạo bài viết (Create):** Hỗ trợ soạn thảo Rich Text (HTML/Markdown). Có trường tải lên ảnh đại diện (Thumbnail).
*   **Quản lý trạng thái (Status):** Bài viết có các trạng thái `draft` (Bản nháp), `published` (Đã xuất bản).
*   **Chèn Affiliate (In-content Affiliate):** Cho phép chọn các Link Affiliate đã được cấu hình sẵn từ Database để chèn vào bài viết dưới dạng Nút (Button CTA) hoặc Text Link.
*   **Gắn thẻ SEO (SEO Meta):** Bài viết phải có các trường `meta_title`, `meta_description`, `slug` để tối ưu SEO và cấu hình UTM khi chạy quảng cáo.

### 1.3. Module Hiển thị (Public Frontend - Đối với Khách truy cập)
*   **Trang chủ (Home):** Hiển thị danh sách các bài viết mới nhất/nổi bật có trạng thái `published`.
*   **Chi tiết bài viết (Article Detail):** Hiển thị nội dung bài viết. Render các nút CTA Affiliate với thuộc tính an toàn `rel="nofollow sponsored" target="_blank"`.
*   **Đếm lượt xem (View Count):** Tự động tăng `view_count` khi khách truy cập vào bài viết (Có cơ chế chống spam f5).

### 1.4. Module Quản lý Affiliate & Tracking
*   **Quản lý Link gốc (Centralized Link):** (Chỉ Admin) Thêm, sửa, xóa các đường link affiliate của các nền tảng (AccessTrade, Impact...).
*   **Tự động gắn Sub-ID:** Khi render link ra ngoài Public FE, hệ thống tự động append thêm tham số tracking (ví dụ: `?sub_id={slug_bai_viet}`) để theo dõi chuyển đổi.
*   **Ghi nhận Click (Click Tracking):** Lưu lại lịch sử (Log) mỗi khi người dùng click vào nút Affiliate trước khi redirect họ sang trang đích.

---

## 2. Yêu cầu Phi chức năng (Non-Functional Requirements)

*   **Hiệu năng (Performance):** 
    *   Các Public API (lấy bài viết ra trang chủ) phải phản hồi dưới 200ms (TTFB < 200ms) để đảm bảo tốc độ khi chạy quảng cáo.
    *   Cần có cơ chế Caching (Redis hoặc File Cache) ở Backend cho các Public API.
*   **Bảo mật (Security):**
    *   Mật khẩu trong Database phải được mã hóa bằng thuật toán `Bcrypt` hoặc `Argon2`.
    *   Ngăn chặn SQL Injection bằng cách sử dụng ORM/Query Builder.
    *   Ngăn chặn XSS (Cross-Site Scripting): FE phải sanitize dữ liệu `content` trước khi render HTML ra màn hình.
*   **Tương thích di động (Mobile-Responsive):** Giao diện Public FE phải ưu tiên hiển thị hoàn hảo trên màn hình điện thoại, vì phần lớn traffic chạy ads đến từ mobile.
*   **SEO & Social Share:** Hỗ trợ render Server-Side (SSR) hoặc Static Site Generation (SSG) (ví dụ dùng Next.js) để bot Google/Facebook đọc được thẻ meta tags.

---

## 3. Kiến trúc Luồng Dữ Liệu (Data Flow Diagram)

### Luồng 1: Khách truy cập đọc bài & Click Affiliate (Public Flow)
1.  **User (Traffic từ Ads)** -> Truy cập URL `domain.com/bai-viet-a`.
2.  **Frontend (FE)** -> Gọi API `GET /api/v1/public/articles/bai-viet-a`.
3.  **Backend (BE)** -> Lấy dữ liệu từ DB (Check cache trước). Trả về JSON chứa nội dung bài và danh sách cấu hình nút Affiliate.
4.  **Frontend (FE)** -> Render HTML. Khách đọc bài.
5.  **User** -> Click vào "Nút Affiliate".
6.  **Frontend (FE)** -> Gửi API `POST /api/v1/public/tracking/click` ẩn dưới nền -> Sau đó mở Tab mới (Redirect) sang trang đối tác Affiliate.
7.  **Backend (BE)** -> Nhận API POST, ghi log vào Database (hoặc bắn Webhook ra n8n/Google Sheets), trả về status 200.

### Luồng 2: CTV/Editor quản lý bài viết (Private Flow - Multi-tenant)
1.  **Editor** -> Đăng nhập thành công, FE lưu JWT Token.
2.  **Editor** -> Truy cập trang "Danh sách bài viết của tôi".
3.  **Frontend (FE)** -> Gọi API `GET /api/v1/cms/articles` kèm Header `Authorization: Bearer <token>`.
4.  **Backend (BE)** ->
    *   Verify Token -> Trích xuất `user_id` và `role`.
    *   Check Rule: Vì `role == editor`, BE tự động thêm điều kiện `WHERE author_id = {user_id}` vào câu query Database.
5.  **Backend (BE)** -> Trả về JSON danh sách bài viết (Chỉ của riêng Editor đó).

---

## 4. Đặc tả Cơ sở dữ liệu (Database Schema)

### Bảng: `users`
*   `id` (INT, PK, Auto Increment)
*   `username` (VARCHAR 50, Unique)
*   `password_hash` (VARCHAR 255)
*   `role` (ENUM: 'admin', 'editor', 'author')
*   `created_at` (TIMESTAMP)

### Bảng: `articles`
*   `id` (INT, PK, Auto Increment)
*   `author_id` (INT, FK -> users.id)
*   `title` (VARCHAR 255)
*   `slug` (VARCHAR 255, Unique, Index)
*   `content` (LONGTEXT)
*   `status` (ENUM: 'draft', 'published')
*   `view_count` (INT, Default 0)
*   `created_at` (TIMESTAMP)
*   `updated_at` (TIMESTAMP)

### Bảng: `affiliate_links` (Chỉ Admin quản lý)
*   `id` (INT, PK)
*   `name` (VARCHAR 150) - Tên gợi nhớ.
*   `base_url` (TEXT) - Link gốc (VD: `https://aff.com/?id=123`)

### Bảng: `click_logs` (Ghi nhận tracking)
*   `id` (INT, PK)
*   `article_id` (INT, FK -> articles.id)
*   `affiliate_link_id` (INT, FK -> affiliate_links.id)
*   `ip_address` (VARCHAR 45) - (Lưu ý ẩn danh nếu vướng luật GDPR)
*   `clicked_at` (TIMESTAMP)

---

## 5. Hợp đồng API (API Contract)

### 5.1. Nhóm Public API (Không cần Token)
**A. Lấy chi tiết bài viết**
*   **Endpoint:** `GET /api/v1/public/articles/:slug`
*   **Response (200 OK):**
    ```json
    {
      "status": "success",
      "data": {
        "id": 101,
        "title": "Phân tích quỹ đầu tư",
        "content": "<p>Nội dung...</p>",
        "author": "Nguyen Van Phong",
        "view_count": 1500
      }
    }
    ```

**B. Tracking Click**
*   **Endpoint:** `POST /api/v1/public/tracking/click`
*   **Request Body:**
    ```json
    {
      "article_id": 101,
      "affiliate_link_id": 5
    }
    ```

### 5.2. Nhóm CMS/Private API (Bắt buộc Header: Authorization)

**A. Lấy danh sách bài viết (Có phân quyền)**
*   **Endpoint:** `GET /api/v1/cms/articles`
*   **Logic BE Bắt Buộc (Data Isolation):**
    *   Nếu Token Role = `admin`: Query lấy `SELECT * FROM articles`.
    *   Nếu Token Role = `editor` / `author`: Query lấy `SELECT * FROM articles WHERE author_id = ?` (Tham số lấy từ Token).
*   **Response (200 OK):**
    ```json
    {
      "status": "success",
      "data": [
        { "id": 1, "title": "Bài 1 của tôi", "status": "published" },
        { "id": 2, "title": "Bài 2 của tôi", "status": "draft" }
      ]
    }
    ```

**B. Cập nhật bài viết**
*   **Endpoint:** `PUT /api/v1/cms/articles/:id`
*   **Logic BE Bắt Buộc (Authorization Check):**
    *   Tìm bài viết theo `:id`.
    *   Nếu Token Role != `admin` VÀ `article.author_id` != `user_id` trong Token -> Trả về `403 Forbidden`.
    *   Ngược lại -> Cho phép UPDATE.

---
**Ghi chú cho AI Coder:** Tuân thủ tuyệt đối cấu trúc Database, Logic Phân quyền Data Isolation ở mục 5.2 và không tự ý thay đổi Endpoint.
