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
```

> Lưu ý: `JWT_SECRET` này **phải khác** secret đang dùng ở máy dev local — nếu trùng, ai có secret dev cũng ký được token hợp lệ trên production.

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
    server_name your-domain.com;   # thay bằng domain thật, hoặc IP nếu chưa có domain

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

## 9. HTTPS bằng Certbot (bắt buộc nếu có domain)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

Certbot tự sửa file Nginx để redirect HTTP → HTTPS và tự gia hạn cert định kỳ.

**Nếu chưa có domain:** truy cập tạm qua `http://103.90.225.161`, nhưng nên coi đây là môi trường test, không phải production thật — trang login gửi mật khẩu qua HTTP không mã hoá.

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

---

## Checklist trước khi coi là "go-live" thật

Tham khảo [GO_LIVE_TASKLIST.md](GO_LIVE_TASKLIST.md) — các mục sau **ảnh hưởng trực tiếp bước deploy này**:

- [ ] `JWT_SECRET` production khác hẳn secret local (bước 5)
- [ ] Domain trỏ đúng IP, HTTPS hoạt động (bước 9)
- [ ] IP VPS đã whitelist trên MongoDB Atlas (bước 6)
- [ ] Đã đổi mật khẩu root + chuyển SSH key (bước 11)
- [ ] `ufw` chỉ mở 22/80/443, không lộ port 3000 (bước 10)
- [ ] SEC-01 (mật khẩu MongoDB Atlas bị lộ) — vẫn đang bị block, cần chủ sở hữu Atlas xử lý
- [ ] SEO-01/SEO-02 (`sitemap.ts`, `robots.ts`) — chưa làm, nên hoàn thành trước khi chạy quảng cáo/SEO thật
