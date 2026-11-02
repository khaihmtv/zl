---
Task ID: 1
Agent: Main Agent
Task: Xây dựng ứng dụng Zalo Bot hoàn chỉnh - QR Login, Gửi/Đọc tin nhắn, Deploy

Work Log:
- Phân tích code gốc của người dùng (apiZalo.zip): Express + Playwright automation cho Zalo
- Xác định vấn đề: Code cũ không có UI chuyên nghiệp, không có đọc tin nhắn, session management chưa tối ưu
- Tạo mini-service Zalo Bot (port 3003) với TypeScript + Express + Playwright: QR login, gửi tin, đọc tin nhắn, session persistence, auto-restart browser
- Cập nhật Prisma schema với MessageLog và ApiConfig models
- Xây dựng 7 API proxy routes trong Next.js (/api/zalo/*)
- Tạo Zustand store cho state management
- Xây dựng 5 UI components: StatusCard, QrLogin, SendMessage, ConversationsPanel, LogsPanel
- Xây dựng trang chính với Tabs layout (Gửi tin, Đọc tin, Logs)
- Tạo Dockerfile cho Next.js và mini-service Zalo Bot
- Tạo docker-compose.yml cho deploy production
- Viết hướng dẫn deploy (DEPLOY.md)
- Fix ESLint errors (import paths, module ignores)
- Verify: Page returns 200, 37KB content, all key UI elements present, API endpoints working

Stage Summary:
- Mini-service: /mini-services/zalo-bot/index.ts (TypeScript, Express, Playwright)
- Frontend: Next.js 16 + shadcn/ui + Tailwind CSS
- API Proxy: 7 routes in /src/app/api/zalo/*
- Components: /src/components/zalo/* (5 components)
- Deploy: Dockerfile, docker-compose.yml, DEPLOY.md, setup-vps.sh
- Page verified: 200 OK, standalone build works, server.js runs correctly

---
Task ID: 2
Agent: Main Agent
Task: Fix Docker deploy lỗi "Module not found .next/standalone/server.js" + cải thiện UX khi service chưa chạy

Work Log:
- Phát hiện bug: Dockerfile copy `.next/standalone` vào `/app/` nhưng CMD vẫn trỏ `.next/standalone/server.js` (sai path)
- Fix Dockerfile: CMD đổi thành `bun server.js`, thêm verify step `ls .next/standalone/server.js`
- Fix mini-service Dockerfile: thêm `--with-deps` cho `playwright install` để cài system deps luôn
- Thêm `.dockerignore` root project để tránh copy node_modules/upload/examples vào Docker context
- Cập nhật Status API trả thêm `serviceConnected: true/false` để phân biệt bot offline vs service chưa chạy
- Cập nhật StatusCard: hiện banner hướng dẫn deploy VPS khi service chưa kết nối
- Cập nhật QrLogin: hiện thông báo "Chưa kết nối được Bot Service" thay vì spinner vô tận
- Tạo `setup-vps.sh`: script deploy tự động 1 click (cài Docker, build, chạy)
- Cập nhật DEPLOY.md với bảng yêu cầu VPS, 3 cách deploy, API docs
- Verify standalone build: `bun .next/standalone/server.js` trả 200 OK, 25KB

Stage Summary:
- Root cause: `CMD ["bun", ".next/standalone/server.js"]` → phải là `CMD ["bun", "server.js"]`
- Frontend giờ phân biệt rõ: service chưa chạy vs bot chưa login
- Script deploy 1 lệnh: `chmod +x setup-vps.sh && ./setup-vps.sh`

---
Task ID: 3
Agent: Main Agent
Task: Fix Docker container networking - web container không kết nối được zalo-bot container

Work Log:
- Phát hiện root cause: Tất cả API routes dùng `http://localhost:3003` cứng. Trong Docker, `localhost` của web container trỏ về chính nó, không phải zalo-bot container
- Tạo file `src/lib/zalo-bot-url.ts`: export `ZALO_BOT_URL` đọc từ `process.env.ZALO_BOT_URL` hoặc fallback `http://localhost:3003`
- Cập nhật 7 API proxy routes: status, send, qr-image, logout, logs, conversations, restart - đều import và dùng `ZALO_BOT_URL`
- Cập nhật `docker-compose.yml`: thêm env var `ZALO_BOT_URL=http://zalo-bot:3003` cho web service (Docker service name resolution)
- Thêm `serviceConnected?: boolean` vào `ZaloStatus` interface trong `zalo-client.ts`
- Fix StatusCard: `(status as any)?.serviceConnected` → `status?.serviceConnected` (proper typing)

Stage Summary:
- Root cause: Docker container networking - localhost trong container không trỏ tới container khác
- Fix: env var `ZALO_BOT_URL=http://zalo-bot:3003` trong docker-compose.yml + shared constant
- Locally vẫn hoạt động bình thường (fallback localhost:3003)
- Lint pass sạch

---
Task ID: 4
Agent: Main Agent
Task: Nâng cấp - Quản lý đơn hàng, gửi tổng hợp qua Zalo

Work Log:
- Cập nhật Prisma schema thêm 3 models: Customer, Order, OrderItem
- Push schema + generate Prisma client thành công
- Tạo 4 API routes:
  - POST/GET /api/orders - CRUD đơn hàng với search, pagination
  - DELETE /api/orders/[id] - Xóa đơn hàng
  - GET /api/orders/summary - Tổng hợp khách hàng (tổng đơn, tổng tiền)
  - POST /api/orders/send - Gửi thông tin đơn/tổng hợp qua Zalo Bot
- Build component OrderPanel với 3 sub-tabs:
  - Tạo đơn: form nhập SĐT, tên khách, mặt hàng (tên, SL, giá) → tự tính tổng, hỗ trợ auto-send Zalo
  - Danh sách đơn: search theo SĐT, expand xem chi tiết, gửi lại/gửi qua Zalo, xóa đơn
  - Tổng hợp: tổng tiền hàng, tổng khách, mỗi khách có tổng đơn + tổng tiền + gửi tổng hợp qua Zalo
- Format tin nhắn Zalo đẹp với emoji, bảng chi tiết mặt hàng
- Thêm tab 'Đơn hàng' làm tab mặc định trong page.tsx
- Verify: DB operations test pass, message format test pass, ESLint clean

Stage Summary:
- Database: Customer + Order + OrderItem (SQLite cascade delete)
- APIs: /api/orders, /api/orders/[id], /api/orders/summary, /api/orders/send
- UI: OrderPanel component với 3 sub-tabs (Tạo/Danh sách/Tổng hợp)
- Zalo integration: gửi đơn hàng + tổng hợp khách hàng qua tin nhắn Zalo

---
Task ID: 4
Agent: Main Agent
Task: Fix "table Customer does not exist" lỗi khi tạo đơn hàng trong Docker

Work Log:
- Phân tích screenshot: lỗi `prisma.customer.upsert()` - bảng `Customer` không tồn tại trong DB
- Nguyên nhân: Dockerfile chỉ chạy `prisma generate` (tạo client code), không chạy `prisma db push` (tạo bảng)
- SQLite volume mới tạo thì trống, không có bảng nào
- Tạo `docker-entrypoint.sh`: chạy `prisma db push --skip-generate` trước khi start server
- Cập nhật Dockerfile: thêm COPY prisma engine binary + schema vào runtime, dùng ENTRYPOINT
- Verify: lint pass, không có import path sai khác

Stage Summary:
- Fix: docker-entrypoint.sh tự động tạo bảng DB khi container start
- Dockerfile giờ copy cả prisma engine vào runtime image
- Rebuild Docker sẽ fix lỗi "table does not exist"
