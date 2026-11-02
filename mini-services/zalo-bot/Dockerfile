FROM node:20-slim

# Install ALL system dependencies including Chromium's
RUN apt-get update && apt-get install -y \
    libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 \
    libcups2 libdrm2 libxkbcommon0 libxcomposite1 \
    libxdamage1 libxfixes3 libxrandr2 libgbm1 libasound2 \
    libpango-1.0-0 libcairo2 libatspi2.0-0 \
    libxshmfence1 libgdk-pixbuf2.0-0 \
    fonts-noto-cjk \
    --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install bun
RUN npm install -g bun

# Copy package files
COPY package.json bun.lock* ./
RUN bun install

# Install Playwright + Chromium + system deps
RUN bunx playwright install --with-deps chromium

# Copy source
COPY . .

# Create data directory for session and logs
RUN mkdir -p /app/data

ENV NODE_ENV=production

EXPOSE 3003

CMD ["bun", "index.ts"]
