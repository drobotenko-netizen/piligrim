#!/bin/bash

# ⚡ Быстрое исправление и деплой
# Автоматически делает коммит с фиксом и деплоит
# Использование: ./quick-fix.sh "Краткое описание фикса"

set -e

FIX_MESSAGE="$1"

if [ -z "$FIX_MESSAGE" ]; then
    echo "❌ Ошибка: Укажите описание фикса"
    echo "Использование: ./quick-fix.sh \"Описание фикса\""
    echo ""
    echo "Примеры:"
    echo "  ./quick-fix.sh \"Исправление ошибки 401\""
    echo "  ./quick-fix.sh \"Фикс undefined в фильтрах\""
    echo "  ./quick-fix.sh \"Добавление credentials: include\""
    exit 1
fi

# Генерируем версию для фикса
VERSION="v$(date +%Y.%m.%d-%H%M)-fix"
echo "⚡ Быстрое исправление: $FIX_MESSAGE"
echo "🏷️  Версия: $VERSION"
echo ""

# Проверяем изменения
if git diff-index --quiet HEAD --; then
    echo "❌ Нет изменений для коммита"
    exit 1
fi

echo "📝 Обнаружены изменения:"
git status --short
echo ""

# Добавляем все изменения
git add .

# Коммитим с префиксом "fix:"
git commit -m "fix: $FIX_MESSAGE"

# Пушим
git push origin main

# Создаем тег
git tag "$VERSION"
git push origin "$VERSION"

echo "✅ Изменения отправлены, тег $VERSION создан"
echo ""

# Ждем сборки (сокращенное время ожидания)
echo "⏳ Ждем сборки образов..."
TIMEOUT=300  # 5 минут
ELAPSED=0
INTERVAL=20

while [ $ELAPSED -lt $TIMEOUT ]; do
    LATEST_RUN=$(curl -s "https://api.github.com/repos/drobotenko-netizen/piligrim/actions/runs?per_page=1" | jq -r '.workflow_runs[0]')
    STATUS=$(echo "$LATEST_RUN" | jq -r '.status')
    CONCLUSION=$(echo "$LATEST_RUN" | jq -r '.conclusion // "null"')
    BRANCH=$(echo "$LATEST_RUN" | jq -r '.head_branch')
    
    if [ "$BRANCH" = "$VERSION" ] && [ "$STATUS" = "completed" ]; then
        if [ "$CONCLUSION" = "success" ]; then
            echo "✅ Сборка завершена!"
            break
        else
            echo "❌ Ошибка сборки: $CONCLUSION"
            exit 1
        fi
    fi
    
    echo "⏳ Сборка... ($ELAPSED/$TIMEOUT сек)"
    sleep $INTERVAL
    ELAPSED=$((ELAPSED + INTERVAL))
done

if [ $ELAPSED -ge $TIMEOUT ]; then
    echo "⏰ Таймаут ожидания сборки"
    echo "🔍 Проверьте: https://github.com/drobotenko-netizen/piligrim/actions"
    exit 1
fi

# Быстрый деплой
echo "🚀 Деплоим на сервер..."

ssh yc-vm << EOF
set -e

echo "📥 Загружаем образы..."
docker pull ghcr.io/drobotenko-netizen/piligrim/piligrim-web:$VERSION
docker pull ghcr.io/drobotenko-netizen/piligrim/piligrim-api:$VERSION

echo "🔄 Перезапускаем контейнеры..."
docker stop api web && docker rm api web

docker run -d --name api --network infra_default --restart unless-stopped \\
  -e PORT=4000 -e NODE_ENV=production -e DATABASE_URL=file:/data/dev.db \\
  -v piligrim_api_data:/data ghcr.io/drobotenko-netizen/piligrim/piligrim-api:$VERSION

docker run -d --name web --network infra_default --restart unless-stopped \\
  -e NODE_ENV=production -e PORT=3000 -e NEXT_PUBLIC_API_BASE=https://piligrim.5-star-roi.ru \\
  ghcr.io/drobotenko-netizen/piligrim/piligrim-web:$VERSION

docker network connect proxy api && docker network connect proxy web
EOF

# Быстрая проверка
sleep 3
API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://piligrim.5-star-roi.ru/api/health)

if [ "$API_STATUS" = "200" ]; then
    echo "✅ Фикс $VERSION успешно задеплоен!"
    echo "🌐 https://piligrim.5-star-roi.ru/"
else
    echo "❌ Проблема после деплоя (HTTP $API_STATUS)"
fi
