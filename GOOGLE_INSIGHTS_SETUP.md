# Hướng dẫn kết nối Google Analytics & Search Console cho trang web

Hướng dẫn này dành cho người **không có kiến thức kỹ thuật**. Bạn chỉ cần:

- Một tài khoản Google (Gmail)
- Quyền truy cập quản trị (admin) vào trang web của bạn
- Khoảng 20–30 phút

Sau khi làm xong, tab **"Phân tích SEO"** trong trang quản trị sẽ hiển thị dữ liệu: lượt nhấp từ Google, lượt hiển thị, thứ hạng từ khóa, bài viết nào đang sụt giảm lưu lượng... (nói ngắn gọn: bạn sẽ biết khách tìm gì trên Google và vào bài viết nào của bạn).

---

## Tổng quan: cần lấy 3 thông tin gì?

| # | Thông tin | Lấy từ đâu | Trông nó như thế nào |
|---|-----------|------------|----------------------|
| 1 | **GA4 Property ID** | Google Analytics | Một dãy số, ví dụ `123456789` |
| 2 | **Search Console Site URL** | Google Search Console | Địa chỉ website, ví dụ `https://yourdomain.com/` |
| 3 | **Service Account JSON** | Google Cloud Console | Một đoạn văn bản dài bắt đầu bằng `{` và kết thúc bằng `}` |

Bạn cứ làm theo thứ tự từng phần bên dưới. Lấy xong thông tin nào, cứ tạm ghi ra file Notepad/Word.

---

## PHẦN 1: Lấy GA4 Property ID (dễ nhất, làm trước)

Điều kiện: website của bạn đã được cài Google Analytics 4 **và đang thu thập dữ liệu**. Nếu trong Google Analytics bạn thấy thông báo kiểu *"Trang web của bạn chưa bật tính năng thu thập dữ liệu"* hoặc *"Your property isn't collecting data"*, hãy làm thêm **Phần 1B** bên dưới trước khi tiếp tục.

1. Mở trình duyệt, vào địa chỉ: **https://analytics.google.com**
2. Đăng nhập bằng tài khoản Google đã quản lý website.
3. Nhìn xuống **góc dưới bên trái** màn hình, nhấn vào biểu tượng **bánh răng** (Admin / Quản trị).
4. Bạn sẽ thấy màn hình chia thành 2 cột. Ở cột bên phải (cột "Property" / "Thuộc tính"), nhấn **Property Settings** (Cài đặt thuộc tính).
5. Ngay dòng đầu tiên bạn sẽ thấy **Property ID** (ID thuộc tính) — một dãy số, ví dụ:

   ```
   Property ID: 358123456
   ```

6. Copy dãy số đó, lưu lại.

> **Lưu ý quan trọng:** dãy số cần lấy là **Property ID** (chỉ toàn số).
> KHÔNG phải chuỗi kiểu `G-AB12CD34EF` — chuỗi đó gọi là "Measurement ID", là một thứ khác. Nếu bạn thấy `G-...` thì đó là nhầm.

### PHẦN 1B: Bật thu thập dữ liệu trên website (khi GA4 báo "chưa thu thập dữ liệu")

Nói đơn giản: Property ID là "địa chỉ nhà kho" để website đọc số liệu, còn thẻ đo lường `G-XXXXXX` là "người ghi chép" đứng trên website đếm khách. Thiếu người ghi chép thì kho nào cũng trống.

1. Trong Google Analytics, nhấn **Admin** (bánh răng, góc dưới trái).
2. Ở cột Property, chọn **Data streams** (Luồng dữ liệu).
3. Nếu **chưa có luồng nào**: nhấn **Add stream** → chọn **Web** → nhập địa chỉ website (ví dụ `https://yourdomain.com`) → đặt tên → **Create stream**.
4. Nếu **đã có luồng**: nhấn vào luồng đó để mở chi tiết.
5. Trong luồng, tìm dòng **Measurement ID** — một chuỗi bắt đầu bằng `G-`, ví dụ `G-AB12CD34EF`. Copy chuỗi này (lần này chính là chuỗi `G-...`, khác với Phần 1).
6. Vào trang quản trị website: **Cấu hình website** → tab con **SEO & dữ liệu AI** → ô **"Mã đo lường Google Analytics (GA4)"** → dán chuỗi `G-...` vào → bấm **Lưu toàn bộ cấu hình**. Website sẽ tự gắn thẻ, không cần sửa code.
7. Kiểm tra ngay lập tức:
   - Mở website của bạn trong một tab khác (tự vào 1 lượt).
   - Quay lại Google Analytics → **Reports** → **Realtime** (Thời gian thực).
   - Thấy "1 user" là thẻ đã hoạt động.
8. Banner "chưa bật thu thập dữ liệu" sẽ tự biến mất sau khi có lượt truy cập đầu tiên (có thể mất tới 24–48 giờ).

> Nếu ô "Mã đo lường Google Analytics (GA4)" đã có sẵn chuỗi `G-...` rồi mà GA4 vẫn báo chưa thu thập: đợi thêm 24–48h, hoặc kiểm tra chuỗi `G-...` đó có đúng là Measurement ID của luồng web trong GA4 này không (dán nhầm ID của property khác cũng gây hiện tượng trống dữ liệu).

---

## PHẦN 2: Lấy Search Console Site URL

Điều kiện: website của bạn đã được thêm vào Google Search Console. Nếu chưa, vào **https://search.google.com/search-console** và thêm website theo hướng dẫn trên màn hình.

1. Mở trình duyệt, vào địa chỉ: **https://search.google.com/search-console**
2. Đăng nhập và **chọn website của bạn** ở danh sách phía trên cùng bên trái.
3. Nhìn vào **góc trên cùng bên trái** màn hình — bạn sẽ thấy tên tài sản (property) website. Nhấn vào đó để xem địa chỉ đầy đủ.
4. Copy chính xác địa chỉ đó. Nó sẽ có **một trong hai dạng**:

   - Dạng 1 (URL-prefix): `https://yourdomain.com/`
   - Dạng 2 (Domain): `sc-domain:yourdomain.com`

5. Copy nguyên xi, kể cả dấu `/` cuối hoặc chữ `sc-domain:` phía trước. Đó chính là giá trị **Search Console Site URL**.

> Hai dạng trên là hai loại tài sản khác nhau trong Search Console. Bạn dùng đúng cái đang hiển thị của website mình, không cần tự chế.

---

## PHẦN 3: Tạo Service Account JSON (phần dài nhất, làm cẩn thận từng bước)

Đây là "chìa khóa" giúp website của bạn tự động đọc dữ liệu từ Google. Hãy tưởng tượng như tạo một "tài khoản nhân viên robot" và cho nó quyền xem số liệu.

### Bước 3.1 — Vào Google Cloud Console

1. Mở trình duyệt, vào địa chỉ: **https://console.cloud.google.com**
2. Đăng nhập bằng tài khoản Google của bạn.
3. Ở thanh phía trên cùng, bên trái, có một ô chọn dự án (project). Nhấn vào đó, chọn **New Project** (Dự án mới).
   - Đặt tên bất kỳ, ví dụ: `website-bao-cao`
   - Nhấn **Create** và đợi vài giây cho dự án được tạo.
4. Quay lại ô chọn dự án trên cùng, **chọn dự án vừa tạo** để làm việc với nó.

### Bước 3.2 — Bật 2 API của Google

1. Vẫn trong Google Cloud Console, mở menu ba gạch ngang (góc trên bên trái) → **APIs & Services** → **Library**.
2. Trong ô tìm kiếm, gõ: `Google Analytics Data API` → nhấn vào kết quả → nhấn nút **Enable** (Bật).
3. Quay lại Library, tìm tiếp: `Google Search Console API` → nhấn vào kết quả → nhấn **Enable**.

Đến đây website "được phép" nói chuyện với Google Analytics và Search Console.

### Bước 3.3 — Tạo Service Account

1. Mở menu ba gạch → **IAM & Admin** → **Service Accounts**.
2. Nhấn **+ Create Service Account** (Tạo tài khoản dịch vụ).
3. Điền:
   - **Service account name**: tên bất kỳ, ví dụ `bao-cao-website`
   - Hai ô còn lại (ID sẽ tự sinh, Description) có thể bỏ trống.
4. Nhấn **Create and Continue** (Tạo và tiếp tục).
5. Ở bước "Grant this service account access to project" → cứ **bấm Continue** (bỏ qua, không cần chọn gì).
6. Bước cuối → **Done** (Hoàn tất).

### Bước 3.4 — Tải file JSON (đây chính là Service Account JSON)

1. Trong danh sách Service Accounts, **nhấn vào tài khoản vừa tạo** (dòng có email giống `bao-cao-website@website-bao-cao.123456.iam.gserviceaccount.com`).
2. Chuyển sang tab **Keys** (Khóa) ở phía trên.
3. Nhấn **Add Key** → **Create new key**.
4. Chọn loại **JSON** → nhấn **Create**.
5. Một file có đuôi `.json` sẽ tự tải về máy (ví dụ `website-bao-cao-abc123.json`).
6. **Mở file này bằng Notepad** (nhấn chuột phải → Open with → Notepad). Bạn sẽ thấy nội dung dạng:

   ```json
   {
     "type": "service_account",
     "project_id": "website-bao-cao",
     "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQ...",
     "client_email": "bao-cao-website@website-bao-cao.iam.gserviceaccount.com",
     ...nhiều dòng nữa...
   }
   ```

7. **Copy toàn bộ nội dung** từ dấu `{` đến dấu `}` (Ctrl+A rồi Ctrl+C cũng được). Đây chính là giá trị **Service Account JSON**.

8. **Ghi nhớ riêng email trong dòng `"client_email"`** (ví dụ trên là `bao-cao-website@website-bao-cao.iam.gserviceaccount.com`) — bạn sẽ dùng nó ở Phần 4.

> **Bảo mật:** nội dung file này giống như mật khẩu. Đừng gửi cho ai, đừng đăng lên nơi công khai.

---

## PHẦN 4: Cho "tài khoản robot" quyền xem dữ liệu

Tạo xong chìa khóa rồi, nhưng Google chưa cho nó vào cửa. Bạn phải cấp quyền cho email `client_email` ở **2 nơi**:

### 4.1 — Cấp quyền trong Google Analytics

1. Vào **https://analytics.google.com** → chọn đúng website.
2. Nhấn biểu tượng **bánh răng** (Admin) ở góc dưới trái.
3. Ở cột Property, tìm và nhấn **Property Access Management** (Quản lý quyền truy cập thuộc tính).
4. Nhấn nút **+** (góc trên phải) → **Add users** (Thêm người dùng).
5. Dán email `client_email` của bạn vào ô email.
6. Chọn quyền: **Viewer** (Người xem).
7. Bỏ qua phần thông báo (Notify), nhấn **Add**.

### 4.2 — Cấp quyền trong Search Console

1. Vào **https://search.google.com/search-console** → chọn website của bạn.
2. Menu trái, cuộn xuống nhấn **Settings** (Cài đặt) → **Users and permissions** (Người dùng và quyền).
3. Nhấn **Add user** (Thêm người dùng).
4. Dán email `client_email` vào.
5. Chọn quyền: **Restricted** (Hạn chế) — đủ để đọc dữ liệu, an toàn nhất. Hoặc **Full** cũng được.
6. Nhấn **Add**.

---

## PHẦN 5: Nhập vào trang quản trị website

Giờ bạn có đủ 3 thứ trong tay:

- GA4 Property ID (dãy số)
- Search Console Site URL (`https://...` hoặc `sc-domain:...`)
- Service Account JSON (đoạn văn bản `{...}`)

Còn lại chỉ là điền vào form:

1. Đăng nhập trang quản trị: địa chỉ `/admin` của website bạn.
2. Menu bên trái, chọn **Cấu hình website**.
3. Ở đầu trang, chọn tab con **Tích hợp Google Insights**.
4. Điền 3 ô:
   - **Service Account JSON**: dán toàn bộ nội dung đã copy ở Phần 3 (từ `{` đến `}`). Nếu ô này báo "Đã lưu trên máy chủ" thì nghĩa là trước đó đã có — chỉ cần dán lại khi muốn thay thế.
   - **GA4 Property ID**: dán dãy số ở Phần 1.
   - **Search Console Site URL**: dán địa chỉ ở Phần 2.
5. Cuộn lên đầu trang, nhấn nút vàng **Lưu toàn bộ cấu hình**.
6. Thấy thông báo "Đã lưu cấu hình..." là thành công.
7. Vào menu **Phân tích SEO** và nhấn nút **Làm mới** để tải dữ liệu.

Xong! Nếu mọi thứ ổn, biểu trạng thái trong tab cấu hình sẽ chuyển thành **"Đã cấu hình — (email robot)"**.

---

## Khi nào cần làm lại / thay đổi?

| Tình huống | Bạn cần làm gì |
|---|---|
| Đổi website, đổi tài khoản Analytics/Search Console | Lấy lại 3 giá trị mới và nhập lại như Phần 5 |
| Đánh mất hoặc nghi lộ file JSON | Xóa key cũ trong Google Cloud (tab Keys), tạo key mới, nhập lại |
| Muốn ngưng kết nối | Vào tab Tích hợp Google Insights, nhấn "Xóa credentials đã lưu" rồi bấm Lưu |

---

## Xử lý sự cố thường gặp

| Hiện tượng | Nguyên nhân có thể | Cách xử lý |
|---|---|---|
| Tab Phân tích SEO vẫn hiện cảnh báo "Chưa cấu hình" | Thiếu 1 trong 3 ô, hoặc quên bấm **Lưu toàn bộ cấu hình** | Kiểm tra đủ 3 ô chưa, bấm Lưu lại |
| Mở tab Phân tích SEO bị lỗi / không có dữ liệu | Chưa cấp quyền Viewer cho email robot trong **GA4** (Phần 4.1) | Làm lại Phần 4.1, đợi vài phút, nhấn Làm mới |
| Lỗi / không có dữ liệu ở phần Search Console | Chưa cấp quyền trong **Search Console** (Phần 4.2), hoặc dán sai Site URL | Làm lại Phần 4.2; kiểm tra Site URL copy đúng nguyên văn chưa |
| Có dữ liệu nhưng số liệu rất ít | Mới cấu hình xong, hoặc website ít traffic | Đợi vài ngày; số liệu cần thời gian tích lũy |
| Số liệu Search Console "lạc hậu" 1–2 ngày | Đặc thù của Google, dữ liệu Search Console luôn trễ khoảng 2 ngày | Đây là bình thường, không phải lỗi |
| Dán JSON xong bấm Lưu báo "Service Account JSON không hợp lệ" | Copy thiếu (thiếu `{` hoặc `}`), hoặc dán nhầm nội dung khác | Mở lại file .json bằng Notepad, Ctrl+A, Ctrl+C, dán lại từ đầu |
| Dán Property ID xong báo "không hợp lệ" | Đã dán nhầm Measurement ID dạng `G-XXXX` | Property ID phải là dãy số thuần (xem lại Phần 1) |
| GA4 báo "chưa bật tính năng thu thập dữ liệu" / trang Phân tích SEO thiếu số pageviews | Website chưa gắn thẻ đo lường `G-XXXXXX` | Làm Phần 1B: lấy Measurement ID dán vào ô "Mã đo lường Google Analytics (GA4)" rồi Lưu |

---

## Mách nhỏ cho người làm kỹ thuật (không bắt buộc đọc)

- Hệ thống ưu tiên giá trị lưu trong CSDL (nhập qua màn hình) hơn biến môi trường `GOOGLE_SERVICE_ACCOUNT_JSON` / `GA4_PROPERTY_ID` / `GSC_SITE_URL`. Biến env chỉ là phương án dự phòng khi CSDL chưa có giá trị.
- Service account JSON được lưu trong collection `Setting` của MongoDB và **không bao giờ** được trả về nguyên bản qua API — chỉ có email (`client_email`) dạng che.
- Thay đổi credentials có hiệu lực ngay, không cần restart server (cache config bị invalidate khi lưu settings).
- Có thể lưu JSON dạng base64 thay cho raw JSON nếu hệ thống dán text bị lỗi xuống dòng.
