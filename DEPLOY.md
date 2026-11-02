# Zalo Bot — Hướng dẫn Deploy

## Yêu cầu VPS

| Thông số | Tối thiểu | Khuyến nghị |
|----------|-----------|-------------|
| RAM | 2 GB | 4 GB |
| CPU | 1 core | 2 core |
| Disk | 10 GB | 20 GB |
| OS | Ubuntu 20.04+ / Debian 11+ | Ubuntu 22.04 |
| Vị trí | Vietnam | Vietnam (tránh bị Zalo block) |

> **Bắt buộc cần VPS riêng** vì Zalo Bot dùng Playwright + Chromium (trình duyệt headless) để điều khiển Zalo Web. Không chạy được trên serverless (Vercel, Cloudflare Workers...).

---

## Cách 1: Deploy 1 lệnh (Khuyên dùng)

```bash
# 1. Tải project lên VPS (git clone, scp, hoặc zip)

git clone <repo-url> zalo-bot
cd zalo-bot

# 2. Chạy script setup — tự động cài Docker, build, chạy
chmod +x setup-vps.sh
./setup-vps.sh
```

Script sẽ tự động:
- Cài Docker & Docker Compose
- Build cả 2 Docker images (web + zalo-bot)
- Khởi động services
- Hiển thị IP để truy cập

Truy cập: `http://<IP-VPS>:3000`

### Lần đầu dùng
1. Mở trang web trong trình duyệt
2. Chờ 30-60 giây để Chromium khởi động và tạo QR
3. Mở Zalo trên điện thoại → Quét mã QR
4. Sau khi login, session tự động lưu (không cần quét lại khi restart)

---

## Cách 2: Docker Compose thủ công

```bash
# 1. Cài Docker (nếu chưa có)
curl -fsSL https://get.docker.com | sh

# 2. Build và chạy
cd zalo-bot
docker compose up -d --build

# 3. Xem logs
docker compose logs -f

# 4. Xem trạng thái
docker compose ps
```

### Lệnh quản lý

```bash
docker compose logs -f zalo-bot   # Xem log bot only
docker compose restart zalo-bot  # Restart bot (lỗi, cần quét QR lại)
docker compose restart web       # Restart web only
docker compose down               # Dừng tất cả
docker compose up -d --build     # Rebuild & chạy lại
docker compose pull               # Pull image mới (nếu có registry)
```

---

## Cách 3: Chạy trực tiếp (không Docker)

```bash
# 1. Cài system dependencies
sudo apt update && sudo apt install -y \
  libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 \
  libcups2 libdrm2 libxkbcommon0 libxcomposite1 \
  libxdamage1 libxfixes3 libxrandr2 libgbm1 libasound2 \
  libpango-1.0-0 libcairo2 libatspi2.0-0 \
  fonts-noto-cjk

# 2. Cài Bun
curl -fsSL https://bun.sh/install | bash

# 3. Chạy Zalo Bot service (terminal 1)
cd mini-services/zalo-bot
bun install
bunx playwright install --with-deps chromium
bun run dev &

# 4. Chạy Next.js frontend (terminal 2)
cd ../..
bun install
bun run db:push
bun run build
bun run start
```

---

## API Endpoints

| Method | Path | Mô tả |
|--------|------|--------|
| GET | `/api/zalo/status` | Trạng thái bot |
| GET | `/api/zalo/qr-image` | QR code PNG |
| POST | `/api/zalo/send` | Gửi tin `{to, message}` |
| GET | `/api/zalo/conversations` | Danh sách hội thoại |
| POST | `/api/zalo/conversations/read` | Đọc tin `{name, limit?}` |
| GET | `/api/zalo/logs` | Logs |
| DELETE | `/api/zalo/logs` | Xóa logs |
| GET | `/api/zalo/logout` | Đăng xuất |
| POST | `/api/zalo/restart` | Restart browser |

### Ví dụ curl

```bash
# Gửi tin nhắn
curl -X POST http://<IP-VPS>:3000/api/zalo/send \
  -H "Content-Type: application/json" \
  -d '{"to": "Nguyễn Văn A", "message": "Xin chào!"}'

# Kiểm tra trạng thái
curl http://<IP-VPS>:3000/api/zalo/status

# Đọc tin nhắn từ hội thoại
curl -X POST http://<IP-VPS>:3000/api/zalo/conversations/read \
  -H "Content-Type: application/json" \
  -d '{"name": "Nguyễn Văn A", "limit": 20}'
```

---

## Lưu ý quan trọng

1. **Session persistence**: Session lưu vào Docker volume `zalo-bot-data`. Không mất khi restart container.
2. **Memory**: Chromium cần ~500MB-1GB RAM. Đảm bảo VPS đủ RAM.
3. **VPS location**: Nên dùng VPS cùng khu vực (Việt Nam) để tránh bị block.
4. **Session timeout**: Zalo có thể hết hạn sau vài tuần. Cần quét QR lại khi đó.
5. **QR hết hạn**: QR Zalo hết hạn nhanh (~30s). Frontend tự refresh. Nếu không thấy QR, chờ thêm hoặc bấm "Làm mới".
6. **Chỉ 1 lần gửi**: Bot gửi tuần tự. Không gửi 2 tin cùng lúc — tin thứ 2 sẽ bị từ chối (429).
