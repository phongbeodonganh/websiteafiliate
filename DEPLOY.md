# Hướng Dẫn Deploy Lên VPS (Ubuntu 23.04, 4GB RAM, 32GB Disk)

Deploy kiểu: **Node.js (Next.js) chạy qua PM2 + Nginx reverse proxy + HTTPS (Certbot)**. Không dùng Docker — với quy mô 50-100 concurrent users, PM2 + Nginx đơn giản, đủ ổn định, dễ debug hơn.

DB vẫn dùng **MongoDB Atlas** (cloud) như hiện tại — VPS chỉ chạy app Next.js, không cần cài MongoDB trên server.

---

## 0. Trước khi bắt đầu

- ⚠️ Bạn vừa gõ mật khẩu root ra chat — **đổi mật khẩu root ngay sau khi setup xong** (bước 6 có hướng dẫn), và chuyển hẳn sang SSH key, tắt đăng nhập bằng password.
- Cần chuẩn bị sẵn: 1 **domain** trỏ về IP `103.90.225.161` (bản ghi A) nếu muốn có HTTPS qua Certbot — nếu chưa có domain, xem mục 9 (chạy tạm bằng IP, không có HTTPS, **không nên dùng lâu dài** vì mật khẩu đăng nhập admin sẽ gửi ở dạng plain-text qua HTTP).
- Chuẩn bị sẵn `MONGODB_URI` (Atlas connection string thật, không dùng fallback hardcode).

---

## 1. SSH vào server & cập nhật hệ thống

```bash
ssh root@103.90.225.161

apt update && apt upgrade -y
```

## 2. Tạo user riêng (không chạy app bằng root)

```bash
adduser deploy
usermod -aG sudo deploy
su - deploy
```

Từ đây làm mọi thứ với user `deploy`, không dùng root nữa.

## 3. Cài Node.js, Git, PM2, Nginx

```bash
# Node.js 22 LTS (khớp Next.js 16 yêu cầu Node >= 20)
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs git nginx

node -v   # kiểm tra >= v20
npm -v

sudo npm install -g pm2
```

## 4. Đưa code lên server

Cách đơn giản nhất — clone từ git remote (nếu repo đã push lên GitHub/GitLab):

```bash
cd ~
git clone <URL_REPO_CUA_BAN> websiteafiliate
cd websiteafiliate
```

Nếu chưa có remote git, dùng `rsync` từ máy local (chạy lệnh này ở máy Windows của bạn qua Git Bash, không phải trên server):

```bash
rsync -avz --exclude 'node_modules' --exclude '.next' --exclude '.git' \
  "d:/affiliate/websiteafiliate/" deploy@103.90.225.161:~/websiteafiliate/
```

## 5. Cấu hình biến môi trường production

**Không copy `.env.local`/`mongodb.env` từ máy local sang** — tạo mới trên server với secret riêng cho production:

```bash
cd ~/websiteafiliate

# Sinh JWT_SECRET mới, khác hẳn secret ở máy dev
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
```

Tạo file `.env.local`:

```bash
nano .env.local
```

Nội dung:

```
JWT_SECRET="<dán-secret-vừa-sinh-ở-trên>"
MONGODB_URI="mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/websiteafiliate?retryWrites=true&w=majority"
NODE_ENV=production

# Resend + AIDEALSUK Insider (see INSIDER_EMAIL_SETUP.md)
NEXT_PUBLIC_SITE_URL="https://aidealsuk.com"
EMAIL_SITE_NAME="AIDEALSUK"
EMAIL_FROM="AIDEALSUK Insider <insider@aidealsuk.com>"
EMAIL_REPLY_TO="support@aidealsuk.com"
RESEND_API="<Resend API key>"
RESEND_WEBHOOK_SECRET="<Resend webhook signing secret>"
INSIDER_TOKEN_SECRET="<random secret, at least 32 bytes>"
INSIDER_CRON_SECRET="<different random secret, at least 32 bytes>"
INSIDER_CONFIRM_TOKEN_TTL_HOURS=24
INSIDER_DIGEST_LATEST_LIMIT=5
INSIDER_DIGEST_HOTTEST_LIMIT=3

# Cloudflare R2 (giống hệt giá trị trong .env.local ở máy local — bucket dùng chung)
R2_ACCOUNT_ID="7929e845b9844a3cdb2cab8314760931"
R2_BUCKET_NAME="affiliate-storage"
R2_ACCESS_KEY_ID="<copy từ .env.local local>"
R2_SECRET_ACCESS_KEY="<copy từ .env.local local>"
R2_ENDPOINT="https://7929e845b9844a3cdb2cab8314760931.r2.cloudflarestorage.com"
R2_PUBLIC_URL="https://media.aidealsuk.com"
```

> Lưu ý: `JWT_SECRET` này **phải khác** secret đang dùng ở máy dev local — nếu trùng, ai có secret dev cũng ký được token hợp lệ trên production.
>
> Riêng khối R2 thì **dùng chung giá trị** với máy local (cùng 1 bucket Cloudflare, không phải sinh riêng) — chỉ copy nguyên từ `.env.local` ở máy Windows sang.

## 6. MongoDB Atlas — whitelist IP của VPS

Vào MongoDB Atlas → **Network Access** → **Add IP Address** → nhập `103.90.225.161` (IP VPS này). Nếu không làm bước này, app sẽ không kết nối được DB (Atlas mặc định chặn IP lạ).

> ⚠️ Nhắc lại từ audit trước: mật khẩu DB Atlas hiện tại (`pnv6555_db_user`) từng bị lộ trong lịch sử git và **chưa được đổi** vì cluster thuộc quyền sở hữu bên thứ ba (xem `GO_LIVE_TASKLIST.md`, mục SEC-01). Cân nhắc xin đổi mật khẩu này trước khi go-live chính thức.

## 7. Build & chạy bằng PM2

```bash
cd ~/websiteafiliate
npm install
npm run build
```

Tạo file `ecosystem.config.js` để PM2 quản lý:

```bash
nano ecosystem.config.js
```

```js
module.exports = {
  apps: [
    {
      name: 'websiteafiliate',
      script: 'npm',
      args: 'start',
      cwd: '/home/deploy/websiteafiliate',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      instances: 1,
      autorestart: true,
      max_memory_restart: '600M',
    },
  ],
};
```

Chạy:

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup   # copy lệnh nó in ra và chạy để PM2 tự khởi động lại khi reboot server
```

Kiểm tra:

```bash
pm2 status
pm2 logs websiteafiliate
curl -I http://localhost:3000
```

## 8. Cấu hình Nginx reverse proxy

```bash
sudo nano /etc/nginx/sites-available/websiteafiliate
```

```nginx
server {
    listen 80;
    server_name aidealsuk.com www.aidealsuk.com;

    # Mặc định Nginx chỉ cho phép body request tối đa 1MB — thấp hơn cả giới hạn
    # 5MB app tự áp cho upload ảnh (src/app/api/v1/cms/upload/route.ts), nên phải
    # nới ở đây, nếu không mọi upload ảnh > ~1MB sẽ bị Nginx chặn thẳng bằng 413
    # trước khi tới được Next.js (app không kịp trả lỗi JSON rõ ràng của riêng nó).
    client_max_body_size 10m;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

> `X-Real-IP`/`X-Forwarded-For` ở đây quan trọng — [rateLimit.ts](src/lib/rateLimit.ts) (SEC-04) và click tracking dùng đúng 2 header này để nhận diện IP thật của khách truy cập, không có thì mọi request đều bị coi là cùng 1 IP.

```bash
sudo ln -s /etc/nginx/sites-available/websiteafiliate /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 9. HTTPS bằng Certbot

Domain `aidealsuk.com` đã trỏ sẵn A record về đúng IP VPS này (đã kiểm tra), nên chạy được ngay:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d aidealsuk.com -d www.aidealsuk.com
```

Certbot tự sửa file Nginx để redirect HTTP → HTTPS và tự gia hạn cert định kỳ.

> ⚠️ Certbot thường **tách file thành 2 block riêng**: block `listen 80` gốc (giờ chỉ redirect sang HTTPS) và 1 block **`listen 443 ssl` mới do Certbot tự sinh** — chứa toàn bộ `location`/`proxy_pass` thật. Directive `client_max_body_size` thêm ở bước 8 nằm trong block 80 sẽ **không tự áp dụng** sang block 443 mới này (mỗi block Nginx độc lập trừ khi đặt ở cấp `http {}`). Sau khi chạy Certbot, mở lại `/etc/nginx/sites-available/websiteafiliate`, xác nhận `client_max_body_size 10m;` có mặt trong **cả 2 block**, rồi `sudo nginx -t && sudo systemctl reload nginx`. Kiểm tra nhanh bằng `sudo nginx -T | grep -B5 client_max_body_size` — phải thấy directive xuất hiện ở cả block 80 và 443.

## 10. Firewall (ufw)

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'   # gồm cả 80 và 443
sudo ufw enable
sudo ufw status
```

Không mở port 3000 ra ngoài — chỉ Nginx (proxy nội bộ tới `localhost:3000`) mới cần truy cập nó.

## 11. Bảo mật server sau khi setup xong

```bash
# Đổi mật khẩu root (mật khẩu cũ đã lộ trong chat)
sudo passwd root

# Tạo SSH key ở máy Windows (PowerShell/Git Bash), rồi copy public key lên server:
#   ssh-copy-id deploy@103.90.225.161
# Sau khi xác nhận login bằng key được, tắt password login:
sudo nano /etc/ssh/sshd_config
#   PasswordAuthentication no
#   PermitRootLogin no
sudo systemctl restart sshd
```

---

## 12. Cập nhật code sau này

```bash
cd ~/websiteafiliate
git pull
npm install
npm run build
pm2 reload websiteafiliate
```

`pm2 reload` (thay vì `restart`) giúp zero-downtime khi cập nhật.

### 12b. Tự động hoá bằng GitHub Actions (khuyến nghị)

Thay vì SSH tay mỗi lần, workflow [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) chạy qua SSH mỗi khi push lên `feature/namdt25-develop` (hoặc bấm chạy tay qua tab Actions → "Run workflow"): `git fetch` + `git reset --hard origin/feature/namdt25-develop` (đồng bộ đúng y hệt code trên remote, bỏ qua mọi thay đổi cục bộ còn sót lại trên VPS) → `npm install` → `npm run build` → `pm2 reload websiteafiliate`.

Cần cấu hình 1 lần trên GitHub repo, mục **Settings → Secrets and variables → Actions**:

| Secret | Giá trị |
|---|---|
| `SSH_HOST` | `103.90.225.161` |
| `SSH_USER` | `deploy` |
| `SSH_PRIVATE_KEY` | private key riêng cho CI (không dùng key cá nhân) — tạo bằng `ssh-keygen -t ed25519 -f ~/.ssh/gh_deploy_key -N ""`, rồi thêm public key (`gh_deploy_key.pub`) vào `~/.ssh/authorized_keys` của user `deploy` trên VPS |

Nếu `git reset`/`npm install`/`npm run build` lỗi, workflow dừng ngay (nhờ `set -e`) và **không** chạy `pm2 reload` — production vẫn giữ bản build cũ, không bị deploy dở dang.

> Lưu ý: `git reset --hard` sẽ xoá sạch mọi thay đổi cục bộ chưa commit trong `~/websiteafiliate` trên VPS (kể cả `.env.local`? — **không**, `.env.local` nằm ngoài git nên an toàn, chỉ các file *có trong git* mới bị reset). Vì vậy đừng sửa tay code hoặc chạy `npm install` thủ công trực tiếp trong thư mục này trên VPS — mọi thay đổi cục bộ sẽ mất ở lần deploy tiếp theo. Cần thử gì thì làm ở nhánh riêng rồi push, đừng sửa trực tiếp trên server.

---

## Checklist trước khi coi là "go-live" thật

Tham khảo [GO_LIVE_TASKLIST.md](GO_LIVE_TASKLIST.md) và [R2_IMAGE_STORAGE_TASKLIST.md](R2_IMAGE_STORAGE_TASKLIST.md) — các mục sau **ảnh hưởng trực tiếp bước deploy này**:

- [ ] `JWT_SECRET` production khác hẳn secret local (bước 5)
- [ ] Domain trỏ đúng IP, HTTPS hoạt động (bước 9)
- [ ] IP VPS đã whitelist trên MongoDB Atlas (bước 6)
- [ ] Đã đổi mật khẩu root + chuyển SSH key (bước 11)
- [ ] `ufw` chỉ mở 22/80/443, không lộ port 3000 (bước 10)
- [x] SEO-01/SEO-02 (`sitemap.ts`, `robots.ts`) — đã làm, tự hoạt động đúng sau khi deploy, không cần thêm thao tác gì
- [x] SEO-03 (`next/image`) — đã làm, cần domain R2/Unsplash nằm trong `next.config.ts` remotePatterns (đã cấu hình sẵn)
- [ ] SEC-01 (mật khẩu MongoDB Atlas bị lộ) — vẫn đang bị block, cần chủ sở hữu Atlas xử lý
- [x] R2-03 (custom domain cho ảnh R2) — đã gắn `media.aidealsuk.com`, nhớ đổi `R2_PUBLIC_URL` trên server production sang giá trị mới rồi restart app (bước 6)
