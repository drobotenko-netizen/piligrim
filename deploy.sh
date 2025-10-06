#!/bin/bash

# 🚀 Скрипт быстрого деплоя Piligrim
# Использование: ./deploy.sh v2025.01.10-XX

set -e

VERSION=$1

if [ -z "$VERSION" ]; then
    echo "❌ Ошибка: Укажите версию"
    echo "Использование: ./deploy.sh v2025.01.10-XX"
    exit 1
fi

echo "🚀 Начинаем деплой версии $VERSION"
echo ""

# Проверяем, что тег существует
if ! git tag | grep -q "^$VERSION$"; then
    echo "❌ Ошибка: Тег $VERSION не найден"
    echo "Доступные теги:"
    git tag | tail -5
    exit 1
fi

echo "✅ Тег $VERSION найден"
echo ""

# Проверяем статус GitHub Actions
echo "📊 Проверяем статус сборки образов..."
LATEST_RUN=$(curl -s "https://api.github.com/repos/drobotenko-netizen/piligrim/actions/runs?per_page=1" | jq -r '.workflow_runs[0].conclusion // "unknown"')

if [ "$LATEST_RUN" != "success" ]; then
    echo "⚠️  Предупреждение: Последний workflow завершился с статусом: $LATEST_RUN"
    echo "Проверьте: https://github.com/drobotenko-netizen/piligrim/actions"
    read -p "Продолжить деплой? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Деплой отменен"
        exit 1
    fi
fi

echo "✅ Сборка образов завершена"
echo ""

# Выполняем деплой на сервер
echo "🔄 Выполняем деплой на сервер..."

ssh yc-vm << EOF
set -e

echo "📥 Загружаем новые образы..."
docker pull ghcr.io/drobotenko-netizen/piligrim/piligrim-web:$VERSION
docker pull ghcr.io/drobotenko-netizen/piligrim/piligrim-api:$VERSION

echo "🛑 Останавливаем старые контейнеры..."
docker stop api web 2>/dev/null || true
docker rm api web 2>/dev/null || true

echo "🚀 Запускаем новые контейнеры..."
docker run -d --name api --network infra_default --restart unless-stopped \\
  -e PORT=4000 -e NODE_ENV=production -e DATABASE_URL=file:/data/dev.db \\
  -v piligrim_api_data:/data ghcr.io/drobotenko-netizen/piligrim/piligrim-api:$VERSION

docker run -d --name web --network infra_default --restart unless-stopped \\
  -e NODE_ENV=production -e PORT=3000 -e NEXT_PUBLIC_API_BASE=https://piligrim.5-star-roi.ru \\
  ghcr.io/drobotenko-netizen/piligrim/piligrim-web:$VERSION

echo "🔗 Подключаем к сети proxy..."
docker network connect proxy api 2>/dev/null || true
docker network connect proxy web 2>/dev/null || true

echo "⏱️  Ждем запуска контейнеров..."
sleep 5

echo "📊 Статус контейнеров:"
docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}"
EOF

echo ""
echo "🔍 Проверяем работоспособность..."

# Проверяем API
API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://piligrim.5-star-roi.ru/api/health)
if [ "$API_STATUS" = "200" ]; then
    echo "✅ API работает (HTTP $API_STATUS)"
else
    echo "❌ API недоступен (HTTP $API_STATUS)"
fi

# Проверяем Frontend
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://piligrim.5-star-roi.ru/)
if [[ "$FRONTEND_STATUS" =~ ^(200|307|302)$ ]]; then
    echo "✅ Frontend работает (HTTP $FRONTEND_STATUS)"
else
    echo "❌ Frontend недоступен (HTTP $FRONTEND_STATUS)"
fi

echo ""
echo "🎉 Деплой версии $VERSION завершен!"
echo "🌐 Приложение: https://piligrim.5-star-roi.ru/"
echo "🔧 API: https://piligrim.5-star-roi.ru/api/health"
echo ""
echo "📋 Для проверки статуса используйте: ./check_server_version.sh"
