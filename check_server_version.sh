#!/bin/bash

echo "🔍 Проверка версии на сервере..."
echo ""

echo "📊 Информация о контейнерах:"
ssh yc-vm "docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}' | grep -E '(piligrim|web|api)'"
echo ""

echo "📦 Образы Docker:"
ssh yc-vm "docker images --format 'table {{.Repository}}\t{{.Tag}}\t{{.ID}}\t{{.CreatedAt}}\t{{.Size}}' | grep piligrim"
echo ""

echo "🌐 Проверка доступности:"
echo -n "Frontend: "
FRONTEND_CODE=$(curl -s -o /dev/null -w "%{http_code}" https://piligrim.5-star-roi.ru/)
if [[ "$FRONTEND_CODE" =~ ^(200|307|302)$ ]]; then
    echo "✅ Работает (HTTP $FRONTEND_CODE)"
else
    echo "❌ Недоступен (HTTP $FRONTEND_CODE)"
fi

echo -n "API: "
if curl -s -o /dev/null -w "%{http_code}" https://piligrim.5-star-roi.ru/api/health | grep -q "200"; then
    echo "✅ Работает"
else
    echo "❌ Недоступен"
fi
echo ""

echo "📅 Время создания образов:"
ssh yc-vm "docker images --format '{{.Repository}}:{{.Tag}} - {{.CreatedAt}}' | grep piligrim"
echo ""

echo "🔧 Для обновления до последней версии:"
echo "ssh yc-vm"
echo "cd /opt/apps/piligrim"
echo "IMAGE_WEB=ghcr.io/drobotenko-netizen/piligrim/piligrim-web:v2025.01.10-01 \\"
echo "IMAGE_API=ghcr.io/drobotenko-netizen/piligrim/piligrim-api:v2025.01.10-01 \\"
echo "docker compose -f docker-compose.prod.yml pull"
echo "docker compose -f docker-compose.prod.yml up -d"
echo ""

echo "📋 Логи для диагностики:"
echo "ssh yc-vm 'cd /opt/apps/piligrim && docker compose logs --tail=20 web'"
echo "ssh yc-vm 'cd /opt/apps/piligrim && docker compose logs --tail=20 api'"
