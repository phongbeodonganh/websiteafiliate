# BẢN ĐẶC TẢ KỸ THUẬT VÀ KIẾN TRÚC THÔNG TIN (V5.0 - MONGODB ATLAS)
**Phiên bản:** 5.0  
**Mô hình:** Website Tin Tức / Blog Kết Hợp Tiếp Thị Liên Kết (Cơ sở dữ liệu Document NoSQL - MongoDB Atlas, cấu trúc danh mục đa cấp, quản lý chiến dịch Affiliate và phân quyền chi tiết Admin vs Editor/Author).

---

## 1. Cấu hình Môi trường & Kết nối Database (Environment & Database Connection)

* **Loại Database:** MongoDB Atlas (Cloud NoSQL Database).
* **Chuỗi kết nối (Connection URI):** Được cấu hình trong `.env.local` (sao chép từ `mongodb.env`):
  ```env
  MONGODB_USERNAME="pnv6555_db_user"
  MONGODB_PASSWORD="LagoFHSUotjbc7HE"
  MONGODB_URI="mongodb+srv://pnv6555_db_user:LagoFHSUotjbc7HE@webafiliate.xbqpx7k.mongodb.net/websiteafiliate?retryWrites=true&w=majority"
  ```
* **ORM / Driver:** Mongoose v8+ hoặc MongoDB Node.js Native Driver (`mongoose` / `mongodb`).

---

## 2. Cấu Trúc Các Collections & Document Schemas (MongoDB Schema Specs)

Hệ thống chuyển đổi toàn bộ các bảng quan hệ sang dạng **Collections trong MongoDB**, tối ưu việc truy vấn và tham chiếu (References & Population).

### 2.1. Collection `users` (Quản lý Nhân sự & Phân quyền)
| Tên trường (Field) | Kiểu dữ liệu (BSON Type) | Ràng buộc & Mô tả chi tiết |
| :--- | :--- | :--- |
| `_id` | ObjectId | Khóa chính (Primary Key). |
| `username` | String | Tên đăng nhập duy nhất (Unique, Required, Indexed). |
| `password_hash` | String | Mật khẩu đã mã hóa Bcrypt (Required). |
| `role` | String | Phân quyền: `'admin'`, `'editor'`, `'author'` (Default: `'author'`). |
| `name` | String | Họ tên hiển thị người dùng. |
| `status` | String | Trạng thái: `'active'` hoặc `'inactive'` (Default: `'active'`). |
| `avatar` | String | URL hình ảnh đại diện. |
| `created_at` | Date | Thời gian tạo tài khoản (Default: `Date.now`). |

### 2.2. Collection `categories` & `sub_categories` (Phân nhóm danh mục đa cấp)
#### A. Collection `categories` (Danh mục cấp 1)
| Tên trường (Field) | Kiểu dữ liệu | Mô tả chi tiết |
| :--- | :--- | :--- |
| `_id` | ObjectId | Khóa chính. |
| `name` | String | Tên danh mục (Required). |
| `slug` | String | Đường dẫn URL thân thiện (Unique, Required, Indexed). |
| `description` | String | Mô tả ngắn cho danh mục. |
| `meta_title` | String | Thẻ tiêu đề SEO. |
| `meta_description` | String | Thẻ mô tả SEO. |
| `created_at` | Date | Thời gian tạo. |

#### B. Collection `sub_categories` (Danh mục cấp 2)
| Tên trường (Field) | Kiểu dữ liệu | Mô tả chi tiết |
| :--- | :--- | :--- |
| `_id` | ObjectId | Khóa chính. |
| `category_id` | ObjectId (Ref: `categories`) | ID Danh mục cha cấp 1 (Required, Indexed). |
| `name` | String | Tên danh mục con (Required). |
| `slug` | String | Slug duy nhất (Unique, Required, Indexed). |
| `description` | String | Mô tả danh mục con. |
| `meta_title` / `meta_description` | String | Thông tin tối ưu SEO. |
| `created_at` | Date | Thời gian tạo. |

### 2.3. Collection `articles` (Bài viết chi tiết)
| Tên trường (Field) | Kiểu dữ liệu | Ràng buộc & Mô tả chi tiết |
| :--- | :--- | :--- |
| `_id` | ObjectId | Khóa chính. |
| `author_id` | ObjectId (Ref: `users`) | Khóa ngoại liên kết tác giả tạo bài (Required, Indexed). |
| `category_id` | ObjectId (Ref: `categories`) | Khóa ngoại danh mục cấp 1. |
| `sub_category_id` | ObjectId (Ref: `sub_categories`) | Khóa ngoại danh mục cấp 2. |
| `title` | String | Tiêu đề bài viết (Required). |
| `slug` | String | Đường dẫn URL thân thiện (Unique, Required, Indexed). |
| `excerpt` | String | Đoạn tóm tắt bài viết. |
| `content` | String | Nội dung chi tiết bài viết (Rich Text/HTML). |
| `status` | String | Trạng thái: `'draft'`, `'published'` (Default: `'draft'`). |
| `is_featured` | Boolean | Đánh dấu bài nổi bật / Hot tuần (Default: `false`). |
| `view_count` | Number | Số lượt xem bài viết (Default: `0`). |
| `revenue` | Number | Ước tính doanh thu từ lượt click (Default: `0`). |
| `meta_title` / `meta_description` | String | Thẻ SEO On-page. |
| `thumbnail_url` | String | URL hình ảnh đại diện bài viết. |
| `affiliate_links` | Array of Objects | Danh sách link affiliate nhúng trong bài: `[{ affiliate_link_id: ObjectId, position_label: String }]`. |
| `created_at` / `updated_at` | Date | Thời gian tạo và cập nhật. |

### 2.4. Collection `affiliate_links` (Kho Link Chiến dịch Gốc - Chỉ Admin quản lý)
| Tên trường (Field) | Kiểu dữ liệu | Mô tả chi tiết |
| :--- | :--- | :--- |
| `_id` | ObjectId | Khóa chính. |
| `name` | String | Tên định danh chiến dịch (Required). |
| `base_url` | String | Đường dẫn gốc nhà cung cấp (Required). |
| `commission` | String | Mức hoa hồng (Mô tả dạng text hoặc chuỗi). |
| `cookie` | String | Thời gian lưu cookie của nhà cung cấp. |
| `is_top_pick` | Boolean | Đánh dấu lựa chọn tốt nhất / Top Pick (Default: `false`). |
| `created_at` | Date | Thời gian tạo link. |

### 2.5. Collection `article_affiliate_relations` (Liên kết chi tiết Article - Affiliate)
*(Có thể duy trì dưới dạng Collection riêng hoặc nhúng trực tiếp trong Document `articles.affiliate_links` để tăng tốc độ đọc dữ liệu)*
| Tên trường (Field) | Kiểu dữ liệu | Mô tả chi tiết |
| :--- | :--- | :--- |
| `_id` | ObjectId | Khóa chính. |
| `article_id` | ObjectId (Ref: `articles`) | ID bài viết. |
| `affiliate_link_id` | ObjectId (Ref: `affiliate_links`) | ID link chiến dịch. |
| `position_label` | String | Vị trí hiển thị (`'top_cta'`, `'middle_comparison'`, `'footer_banner'`). |

### 2.6. Collection `click_logs` (Tracking Thống kê Click)
| Tên trường (Field) | Kiểu dữ liệu | Mô tả chi tiết |
| :--- | :--- | :--- |
| `_id` | ObjectId | Khóa chính. |
| `article_id` | ObjectId (Ref: `articles`) | Ghi nhận bài viết phát sinh lượt click. |
| `affiliate_link_id` | ObjectId (Ref: `affiliate_links`) | Ghi nhận chiến dịch affiliate được click. |
| `ip_address` | String | Địa chỉ IP của người dùng thực hiện click. |
| `clicked_at` | Date | Thời gian click thực tế (Default: `Date.now`). |

### 2.7. Collection `subscribers` (Đăng ký Nhận Tin Email)
| Tên trường (Field) | Kiểu dữ liệu | Mô tả chi tiết |
| :--- | :--- | :--- |
| `_id` | ObjectId | Khóa chính. |
| `email` | String | Địa chỉ email đăng ký (Unique, Required). |
| `subscribed_at` | Date | Thời điểm đăng ký. |

### 2.8. Collection `settings` (Cấu hình Cài đặt Website)
| Tên trường (Field) | Kiểu dữ liệu | Mô tả chi tiết |
| :--- | :--- | :--- |
| `_id` | ObjectId | Khóa chính (Chứa 1 Document cài đặt duy nhất). |
| `site_title` | String | Tên website. |
| `metaDescription` / `focusKeywords` | String | Cấu hình SEO mặc định toàn trang. |
| `primary_color` / `accent_color` | String | Màu sắc nhận diện chủ đạo và điểm nhấn. |
| `theme_mode` / `font_family` | String | Giao diện hiển thị (`dark`/`light`) và Font chữ. |
| `logo_url` / `favicon_url` | String | URL Logo & Favicon. |
| `banner_text` / `footer_text` | String | Nội dung Banner và Chân trang. |
| `geo_latitude` / `geo_longitude` | Number | Tọa độ Địa lý Geo SEO. |
| `geo_region_name` / `geo_placename` | String | Tên khu vực và địa danh Geo SEO. |
| `updated_at` | Date | Thời gian cập nhật gần nhất. |

---

## 3. Quyền Hạn CMS & Phân Luồng Logic

### 3.1. Giao diện Quản trị (CMS Dashboard Permission Matrix)
* **Admin:** Toàn quyền quản trị tất cả module (Users, Categories, Articles, Affiliate Links, Settings, Click Logs, Subscribers).
* **Editor / Author:**
  * **Bài viết (`articles`):** Chỉ xem/chỉnh sửa/xóa các bài viết do chính tài khoản tạo ra (Lọc theo query `author_id: user._id`).
  * **Kho Link Affiliate (`affiliate_links`):** Bị ẩn (Trả về 403 Forbidden). Chỉ được chèn các link đã được Admin duyệt sẵn vào bài viết.
  * **Báo cáo Click/Doanh thu:** Chỉ hiển thị số liệu liên quan đến bài viết thuộc sở hữu của mình.

### 3.2. Public Frontend Logic
* **Trang chủ & Bài viết nổi bật:** Lọc `status: 'published'` và `is_featured: true`.
* **Top Picks / Gợi ý hàng đầu:** Lấy danh sách từ collection `affiliate_links` với điều kiện `is_top_pick: true`.
* **Tracking Click:** Endpoint `/api/v1/public/tracking/redirect` thực hiện ghi nhận bản ghi mới vào collection `click_logs`, đồng thời chuyển hướng người dùng đến URL gốc của nhà cung cấp (`base_url`).
