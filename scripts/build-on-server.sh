#!/usr/bin/env bash
set -euo pipefail

# Сборка образов прямо на сервере
echo "🚀 Собираем образы на сервере..."

ssh yc-vm << 'EOF'
set -e

cd /srv/piligrim/app

echo "🔨 Собираем образы с нашими изменениями..."

# Собираем образы с latest тегом
sudo docker compose -f docker-compose.prod.yml build --pull

echo "🛑 Останавливаем старые контейнеры..."
sudo docker stop api web 2>/dev/null || true
sudo docker rm api web 2>/dev/null || true

echo "🚀 Запускаем новые контейнеры..."

# Запускаем API с .env файлом
sudo docker run -d --name api --network infra_default --restart unless-stopped \
  -e PORT=4000 -e NODE_ENV=production -e DATABASE_URL=file:/data/dev.db \
  -v infra_api_data:/data \
  --env-file /srv/piligrim/app/server/.env \
  piligrim-api:latest

# Запускаем WEB
sudo docker run -d --name web --network infra_default --restart unless-stopped \
  -e NODE_ENV=production -e PORT=3000 \
  -e NEXT_PUBLIC_API_BASE=https://piligrim.5-star-roi.ru \
  piligrim-web:latest

echo "🔗 Подключаем к proxy..."
sudo docker network connect proxy api 2>/dev/null || true
sudo docker network connect proxy web 2>/dev/null || true

echo "🔄 Перезапускаем Caddy..."
sudo docker restart caddy

echo "⏳ Ждем запуска..."
sleep 20

echo "✅ Проверяем..."
curl -fsSL https://piligrim.5-star-roi.ru/api/health -o /dev/null && echo "✅ API работает" || echo "❌ API не работает"
curl -fsSL https://piligrim.5-star-roi.ru -o /dev/null && echo "✅ WEB работает" || echo "❌ WEB не работает"

echo "🎉 Обновление завершено с тегом: $TAG"

EOF

echo "🎉 Обновление завершено!"
