# BẢN ĐẶC TẢ KỸ THUẬT VÀ KIẾN TRÚC THÔNG TIN (V4.0)
**Phiên bản:** 4.0  
**Mô hình:** Website Tin Tức / Blog Kết Hợp Tiếp Thị Liên Kết (Cơ sở dữ liệu quan hệ đa chiều, phân nhóm danh mục đa cấp và cơ chế gắn đa liên kết Affiliate, kèm phân quyền chi tiết Admin vs Editor/Author).

---

## 1. Sơ đồ Quan hệ Cơ sở Dữ liệu & Các Trường Thông Tin (Database Fields & ERD)

Hệ thống sử dụng các bảng chuẩn hóa để giải quyết triệt để bài toán: 1 bài viết chứa nhiều nhóm danh mục (Categories/Sub-categories), chứa nhiều nút Affiliate khác nhau, và phân quyền tuyệt đối giữa Admin và Editor/Author.

### 1.1. Bảng `users` (Quản lý Nhân sự & Phân quyền)
| Tên trường (Field) | Kiểu dữ liệu | Ràng buộc & Mô tả chi tiết |
| :--- | :--- | :--- |
| `id` | INTEGER | Khóa chính (Primary Key), tự tăng. |
| `username` | TEXT | Tên đăng nhập duy nhất (Unique, Not Null). |
| `password_hash` | TEXT | Mật khẩu đã mã hóa Bcrypt (Not Null). |
| `role` | TEXT | Phân quyền hệ thống: `'admin'`, `'editor'`, `'author'`. |
| `status` | TEXT | Trạng thái tài khoản: `'active'` hoặc `'inactive'`. |

### 1.2. Bảng `categories` & `sub_categories` (Phân nhóm danh mục đa cấp)
Để giải quyết bài toán chia nhóm nhỏ (Ví dụ: Danh mục lớn "Tài chính", nhóm nhỏ "Quỹ REITs", "Crypto"), ta tách thành bảng Danh mục cha và Danh mục con.
| Bảng & Tên trường | Kiểu dữ liệu | Mô tả chi tiết |
| :--- | :--- | :--- |
| **`categories`** (`id`, `name`, `slug`) | INTEGER, TEXT, TEXT | Danh mục cấp 1 (Ví dụ: ID 1 - Tài chính, ID 2 - Bất động sản). |
| **`sub_categories`** (`id`, `category_id`, `name`, `slug`) | INTEGER, INTEGER, TEXT, TEXT | Danh mục cấp 2 thuộc cấp 1 (Ví dụ: Thuộc Tài chính có Quỹ mở, Crypto). Liên kết qua `category_id`. |

### 1.3. Bảng `articles` (Bài viết chi tiết)
| Tên trường (Field) | Kiểu dữ liệu | Ràng buộc & Mô tả chi tiết |
| :--- | :--- | :--- |
| `id` | INTEGER | Khóa chính, tự tăng. |
| `author_id` | INTEGER | Khóa ngoại liên kết `users.id` (Xác định quyền sở hữu bài viết). |
| `category_id` | INTEGER | Khóa ngoại liên kết `categories.id`. |
| `sub_category_id` | INTEGER | Khóa ngoại liên kết `sub_categories.id` (Phân nhóm chi tiết). |
| `title` | TEXT | Tiêu đề bài viết (Not Null). |
| `slug` | TEXT | Đường dẫn URL thân thiện (Unique, Index). |
| `excerpt` | TEXT | Đoạn mô tả ngắn (Sapo) hiển thị trang chủ. |
| `content` | TEXT | Nội dung bài viết định dạng Rich Text/HTML. |
| `status` | TEXT | Trạng thái: `'draft'`, `'published'`. |
| `is_featured` | BOOLEAN | Đánh dấu bài viết nổi bật / Hot tuần (True/False). |
| `view_count` | INTEGER | Lượt xem tự động tăng (Default: 0). |
| `meta_title` / `meta_description` | TEXT | Thẻ SEO On-page tối ưu tìm kiếm. |

### 1.4. Bảng `affiliate_links` (Kho Link Gốc - Chỉ Admin quản lý)
| Tên trường (Field) | Kiểu dữ liệu | Mô tả chi tiết |
| :--- | :--- | :--- |
| `id` | INTEGER | Khóa chính, tự tăng. |
| `name` | TEXT | Tên định danh chiến dịch (Ví dụ: Mở TK Chứng khoán MBS). |
| `base_url` | TEXT | Đường dẫn gốc của nhà cung cấp (Ví dụ: `https://aff.com/?id=123`). |
| `commission` | TEXT | Mức hoa hồng (Ví dụ: 50,000 VND / Lead). |

### 1.5. Bảng trung gian `article_affiliate_relations` (1 bài viết gắn NHIỀU link Affiliate)
Giải quyết bài toán: Một bài viết phân tích dài có thể cần gắn 3-4 link affiliate khác nhau ở đầu, giữa và cuối bài.
| Tên trường (Field) | Kiểu dữ liệu | Mô tả chi tiết |
| :--- | :--- | :--- |
| `id` | INTEGER | Khóa chính. |
| `article_id` | INTEGER | Khóa ngoại trỏ tới `articles.id`. |
| `affiliate_link_id` | INTEGER | Khóa ngoại trỏ tới `affiliate_links.id`. |
| `position_label` | TEXT | Vị trí hiển thị trên bài (Ví dụ: `'top_cta'`, `'middle_comparison'`, `'footer_banner'`). |

### 1.6. Bảng `click_logs` (Tracking Thống kê Click)
| Tên trường (Field) | Kiểu dữ liệu | Mô tả chi tiết |
| :--- | :--- | :--- |
| `id` | INTEGER | Khóa chính. |
| `article_id` / `affiliate_link_id` | INTEGER | Khóa ngoại ghi nhận ngữ cảnh click. |
| `clicked_at` | TEXT | Thời gian click thực tế (Timestamp). |

---

## 2. Phân Tích Chi Tiết Giao Diện & Logic (Admin vs. Editor/Author)

### 2.1. Phân quyền Giao diện Quản trị (CMS Dashboard Views)
| Module Quản Trị | Giao diện & Quyền hạn của Admin | Giao diện & Quyền hạn của Editor / Author |
| :--- | :--- | :--- |
| **Quản lý Bài viết (`articles`)** | Thấy **toàn bộ** bài viết của tất cả nhân sự trên hệ thống. Có quyền duyệt, sửa, xóa bất kỳ bài nào. | Chỉ thấy danh sách bài viết do **chính mình tạo ra** (Backend tự động lọc `WHERE author_id = user.id`). Không thấy bài của người khác. |
| **Kho Link Affiliate (`affiliate_links`)** | **Toàn quyền** Thêm, Sửa, Xóa các link chiến dịch gốc và mức hoa hồng. | **Ẩn hoàn toàn (403).** Không được phép xem hoặc chỉnh sửa kho link gốc. |
| **Gắn Link vào Bài viết** | Được chọn bất kỳ link nào từ kho link gốc để cấu hình nhiều vị trí trong bài viết. | Chỉ được chọn các link có sẵn trong kho do Admin cung cấp để chèn vào bài của mình, không sửa được URL gốc. |
| **Thống kê Doanh thu & Clicks** | Xem Dashboard KPI toàn hệ thống, Top Creator Leaderboard của tất cả nhân sự. | Chỉ xem được số liệu Clicks và Views giới hạn trên các bài viết do chính họ sở hữu. |

### 2.2. Logic Phân Nhóm & Nhãn Hiển Thị Ngoài Trang Chủ (Public Frontend)
Hệ thống dựa vào các trường dữ liệu để tự động gom nhóm bài viết ra các tab giao diện:
*   **Bài viết Hot Tuần:** Lọc các bài viết có trường `is_featured = TRUE` kết hợp lượng tương tác cao trong 7 ngày gần nhất.
*   **Bài viết Xem Nhiều:** Sắp xếp danh sách theo trường `view_count DESC` giảm dần.
*   **Bài viết Mới Nhất:** Sắp xếp theo trường `created_at DESC`.
*   **Phân nhóm Danh mục Đa cấp:** Khi người dùng bấm vào danh mục cấp 1 (Ví dụ: Tài chính), hệ thống load danh sách bài viết theo `category_id`, kèm thanh lọc nhanh theo các danh mục con (`sub_category_id`).
