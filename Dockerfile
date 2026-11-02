# ---- Build Stage ----
FROM node:20-slim AS builder

RUN npm install -g bun

WORKDIR /app

# Copy package files first (layer caching)
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile 2>/dev/null || bun install

# Copy source
COPY . .

# Generate Prisma client (with debian-openssl-3.0.x binary target)
RUN bunx prisma generate

# Create a template database with all tables
RUN mkdir -p /app/db-template && \
    DATABASE_URL="file:/app/db-template/zalo-bot.db" bunx prisma db push --accept-data-loss 2>&1

# Build Next.js (standalone output)
RUN bun run build

# Verify standalone was generated
RUN ls -la .next/standalone/server.js || (echo "ERROR: standalone server.js not found!" && ls -la .next/ && exit 1)

# Copy static assets INTO standalone dir so it's self-contained
RUN cp -r .next/static .next/standalone/.next/static && \
    cp -r public .next/standalone/public

# ---- Runtime Stage ----
FROM node:20-slim

# Install OpenSSL (required by Prisma engine at runtime)
RUN apt-get update -y && \
    apt-get install -y openssl && \
    rm -rf /var/lib/apt/lists/*

RUN npm install -g bun

WORKDIR /app

# Copy the ENTIRE standalone directory contents
COPY --from=builder /app/.next/standalone ./

# Create db directory
RUN mkdir -p /app/db

# Copy the pre-built template database (has all tables)
COPY --from=builder /app/db-template/zalo-bot.db /app/db-template/zalo-bot.db

# Copy entrypoint script
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x docker-entrypoint.sh

EXPOSE 3000

ENV NODE_ENV=production
ENV DATABASE_URL=file:/app/db/zalo-bot.db
ENV HOSTNAME=0.0.0.0

ENTRYPOINT ["./docker-entrypoint.sh"]
