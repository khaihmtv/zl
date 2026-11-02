#!/bin/bash
# =============================================================
#  Zalo Bot — Setup VPS tự động
#  Chạy trên VPS Ubuntu/Debian sạch:
#    chmod +x setup-vps.sh && ./setup-vps.sh
# =============================================================
set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Zalo Bot — VPS Setup${NC}"
echo -e "${GREEN}========================================${NC}"

# ---- 1. Cài Docker ----
echo -e "${YELLOW}[1/4] Cài đặt Docker...${NC}"
if command -v docker &> /dev/null; then
    echo "  Docker đã có ✓"
else
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
    echo "  Docker cài xong ✓"
fi

if command -v docker compose &> /dev/null || docker compose version &> /dev/null; then
    echo "  Docker Compose đã có ✓"
else
    apt-get update && apt-get install -y docker-compose-plugin 2>/dev/null || true
    echo "  Docker Compose cài xong ✓"
fi

# ---- 2. Tạo thư mục project ----
echo -e "${YELLOW}[2/4] Chuẩn bị source code...${NC}"
PROJECT_DIR="/opt/zalo-bot"
mkdir -p "$PROJECT_DIR"

# Copy files cần thiết vào /opt/zalo-bot
# (Giả sử bạn đã clone/download project vào thư mục hiện tại)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

if [ -f "$SCRIPT_DIR/docker-compose.yml" ]; then
    cp -r "$SCRIPT_DIR"/* "$PROJECT_DIR/" 2>/dev/null || true
    cp -r "$SCRIPT_DIR"/.env* "$PROJECT_DIR/" 2>/dev/null || true
    echo "  Đã copy source vào $PROJECT_DIR ✓"
else
    echo -e "${RED}  Lỗi: Không tìm thấy docker-compose.yml trong thư mục hiện tại${NC}"
    echo "  Hãy đặt script này cùng thư mục với project và chạy lại."
    exit 1
fi

cd "$PROJECT_DIR"

# ---- 3. Build Docker images ----
echo -e "${YELLOW}[3/4] Build Docker images (lần đầu có thể mất 5-10 phút)...${NC}"
docker compose build --no-cache 2>&1 | tail -5
echo "  Build xong ✓"

# ---- 4. Khởi động ----
echo -e "${YELLOW}[4/4] Khởi động services...${NC}"
docker compose up -d

# Đợi services khởi động
echo "  Đợi services khởi động..."
sleep 5

# Kiểm tra trạng thái
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Trạng thái services:${NC}"
echo -e "${GREEN}========================================${NC}"
docker compose ps
echo ""

# Lấy IP VPS
SERVER_IP=$(hostname -I | awk '{print $1}')

# Kiểm tra zalo-bot đã sẵn sàng chưa
echo -e "${YELLOW}Đợi Zalo Bot khởi động browser (30s)...${NC}"
sleep 30

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  HOÀN TẤT!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "  Truy cập:  ${GREEN}http://${SERVER_IP}:3000${NC}"
echo ""
echo "  Lần đầu dùng:"
echo "    1. Mở link bên trên"
echo "    2. Chờ hiện QR code (30-60 giây)"
echo "    3. Mở Zalo trên điện thoại → Quét mã QR"
echo "    4. Sau khi login, session tự lưu — không cần quét lại"
echo ""
echo "  Lệnh hữu ích:"
echo "    docker compose logs -f          # Xem logs realtime"
echo "    docker compose restart zalo-bot # Restart bot"
echo "    docker compose down              # Dừng tất cả"
echo "    docker compose up -d --build     # Rebuild & chạy"
echo ""

# Show logs
echo -e "${YELLOW}Logs realtime (Ctrl+C để thoát):${NC}"
docker compose logs -f --tail=30
