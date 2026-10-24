# Đối chiếu và nâng cấp homepage TheHavenDeals

Nguồn tham chiếu: https://www.trustedcoupon.com/ — khảo sát homepage ngày 23/10/2026.

## Những điểm quan sát được

TrustedCoupon đặt các đường dẫn store, tìm kiếm, các thẻ ưu đãi có mức tiết kiệm và hành động mua/lấy mã ở vị trí nổi bật. Trang có luồng ưu đãi mới, lựa chọn danh mục, nhóm sản phẩm có giá tham chiếu, nhóm ưu đãi theo chủ đề, newsletter và giải thích quan hệ affiliate ở cuối trang.

## Đối chiếu với TheHavenDeals

| Nội dung / nhu cầu | Trước thay đổi | Thay đổi đã triển khai |
| --- | --- | --- |
| Tiếp cận deal ngay đầu trang | Hero tập trung vào một sản phẩm và điểm biên tập | Hero gọn, tìm store/sản phẩm/coupon, đường dẫn đến deal và store, một ưu đãi thật từ catalogue |
| Xem mã và ưu đãi ngay homepage | Chỉ có carousel store và danh sách sản phẩm | Khu vực coupon/deal, mức tiết kiệm, điều kiện, ngày kiểm tra và hạn dùng khi có dữ liệu |
| Tìm đúng ưu đãi | Tìm kiếm sản phẩm/store, chưa có tìm kiếm offer | Tìm theo nội dung offer và mã, lọc danh mục, phân biệt promo code và deal không cần mã |
| Thứ tự khám phá | Chưa có luồng offer | Theo ngày kiểm tra/cập nhật, lượt click store hoặc ngày kết thúc |
| Hành động dùng coupon | Đi sâu vào trang store | Sao chép mã, trạng thái sao chép, link affiliate qua endpoint tracking hiện có |
| Sản phẩm đang giảm giá | Giá tham chiếu nằm trong thẻ sản phẩm | Nhóm riêng dùng sản phẩm thật có giá hiện tại thấp hơn giá tham chiếu |
| Điều hướng trang dài | Menu danh mục chung | Thanh đường dẫn đến deal, store, danh mục, sản phẩm giảm giá, hướng dẫn và FAQ |
| Giải thích quy trình | Có phương pháp chọn sản phẩm | Bổ sung ba bước sử dụng coupon và FAQ cho người mua |
| Newsletter, hướng dẫn mua, disclosure | Đã có | Giữ lại và đưa disclosure ngắn lên hero; liên kết chính sách kiểm tra coupon tại vùng deal |
| Khung store | Đã được căn lại theo yêu cầu trước | Giữ chiều rộng tối đa 1.256px và lề responsive |

## Quy tắc dữ liệu

- Chỉ lấy offer thuộc store đã xuất bản. Homepage mặc định tôn trọng `showOnHomepage`; khi tìm kiếm hoặc lọc danh mục có thể tìm trong các store đã xuất bản khác.
- Loại offer không active, chưa bắt đầu, đã hết hạn hoặc có ngày hiệu lực không hợp lệ; kiểm tra lại danh sách mỗi phút khi trang mở.
- Không gắn nhãn đã kiểm tra cho offer thiếu `checkedAt`, không tự tạo ngày hết hạn, lượt click hay mức tiết kiệm.
- Sắp xếp popular dùng số click của store, và nhãn giao diện nói rõ đó là store được click nhiều. Không suy diễn ra số lần coupon được sử dụng.
- Nhóm sản phẩm giảm giá không dùng sản phẩm demo. Giá thấp hơn giá tham chiếu không được gọi là lịch sử giảm giá hay giá thấp nhất thị trường.
- Liên kết đến retailer dùng endpoint tracking/kiểm tra blacklist hiện có. Không tự động mở store khi người dùng chỉ muốn sao chép mã.
- Không có offer phù hợp thì hiển thị trạng thái trống và đường dẫn tìm store; nhóm giảm giá tự ẩn khi thiếu dữ liệu hợp lệ.

## Các phần cần dữ liệu bổ sung nếu muốn mở rộng

Nhóm freeship độc lập cần trường điều kiện giao hàng có cấu trúc; lịch sử giảm giá cần snapshot giá theo thời gian; nhãn coupon độc quyền cần bằng chứng và trường đánh dấu riêng. Phiên bản này dùng các thông tin đã có để tránh tạo nhãn không có căn cứ.

## Kiểm tra sau thay đổi

- ESLint cho các file TypeScript/TSX thay đổi và `tsc --noEmit`: đạt.
- 10 kiểm thử của `homepage-deals` và `store-discovery`: đạt.
- Chrome: kiểm tra ở chiều rộng 320, 390, 700, 1024 và 1440px; không có tràn ngang, chiều rộng khung store bằng khung deal.
- Đã thử lọc promo code, sao chép mã, liên kết tracking, xem thêm từ 6 lên 12 offer, lọc danh mục và trạng thái tìm kiếm không có kết quả.
