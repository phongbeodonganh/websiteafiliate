# Quản lý store, coupon và promo code

Đăng nhập bằng tài khoản **admin** tại `/admin`, chọn **Store & coupon** trong menu.

1. Chọn **Thêm store** hoặc chọn store có sẵn để chỉnh sửa. Store có sẵn và các mã hiện tại được giữ lại cho tới khi admin lưu phiên bản quản lý trong database.
2. Nhập tên, mô tả, website hoặc link affiliate và danh mục. Đường dẫn tự tạo từ tên nếu để trống; đường dẫn cố định sau khi lưu.
3. Tải ảnh store hoặc nhập URL ảnh. Ảnh này xuất hiện trên homepage và trang store. Dùng ảnh ngang cho thẻ homepage; giới hạn upload là 5 MB (JPG, PNG, WebP, GIF).
4. Viết bài giới thiệu bằng trình soạn thảo có sẵn. Dùng nút ảnh hoặc kéo thả để đăng ảnh quảng cáo trong bài viết.
5. Thêm Q&A bằng các trường câu hỏi/câu trả lời.
6. Thêm ưu đãi: **Promo code** yêu cầu mã; **Coupon / deal** không cần mã. Có thể đặt link riêng, điều kiện áp dụng, ngày bắt đầu, ngày hết hạn và ngày kiểm tra thực tế.
7. Chọn **Xuất bản**, bật **Hiển thị store trên homepage** nếu muốn, rồi **Lưu store**.

Homepage hiển thị tối đa 6 store theo thứ tự tăng dần (cùng thứ tự thì xếp theo tên). Mục **Browse all stores** và menu **Stores & coupons** mở `/stores`. Trang chi tiết có URL `/store/{slug}`.

Bản nháp và store đã lưu trữ ẩn khỏi homepage, directory, sitemap và trang chi tiết. **Lưu trữ store** giữ dữ liệu để có thể xuất bản lại. Ưu đãi tắt, chưa đến ngày bắt đầu hoặc đã hết hạn không hiển thị công khai. Store vẫn hiển thị khi không có coupon đang hoạt động, với thông báo rõ ràng.

Ngày bắt đầu tính từ 00:00 UTC và ngày hết hạn tính hết ngày theo UTC; để trống nếu không giới hạn. Khi khách giữ trang mở, danh sách kiểm tra lại mã hết hạn mỗi 15 giây. Ngày kiểm tra không tự tạo cho ưu đãi mới; chỉ điền khi đã kiểm tra thực tế.

Tính năng dùng MongoDB và endpoint upload hiện có, không cần thêm biến môi trường hoặc thao tác seed database. Collection `stores` được Mongoose tạo khi lưu store đầu tiên. Upload cần cấu hình kho ảnh hiện tại của project hoạt động bình thường.

API quản trị: `GET/POST /api/v1/cms/stores`, `PUT/DELETE /api/v1/cms/stores/{id}`. DELETE lưu trữ store, không xóa vĩnh viễn. Mọi phương thức yêu cầu admin; nội dung HTML được làm sạch và các URL chỉ chấp nhận HTTP/HTTPS.
