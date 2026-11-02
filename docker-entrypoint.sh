#!/bin/sh
set -e

# If database doesn't exist, copy from template (has all tables pre-created)
if [ ! -f "/app/db/zalo-bot.db" ]; then
  echo "📦 Initializing database from template..."
  cp /app/db-template/zalo-bot.db /app/db/zalo-bot.db
  echo "✅ Database ready"
else
  echo "✅ Database already exists"
fi

echo "🚀 Starting Next.js server..."
exec bun server.js
