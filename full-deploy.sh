#!/bin/bash

# 🚀 Полный скрипт деплоя Piligrim
# Автоматически делает коммит, тег, сборку и деплой
# Использование: ./full-deploy.sh "Описание изменений"

set -e

COMMIT_MESSAGE="$1"

if [ -z "$COMMIT_MESSAGE" ]; then
    echo "❌ Ошибка: Укажите описание изменений"
    echo "Использование: ./full-deploy.sh \"Описание изменений\""
    echo ""
    echo "Примеры:"
    echo "  ./full-deploy.sh \"Исправление ошибки в отчетах\""
    echo "  ./full-deploy.sh \"Добавление новой функции экспорта\""
    echo "  ./full-deploy.sh \"Обновление зависимостей\""
    exit 1
fi

# Генерируем версию на основе текущей даты и времени
VERSION="v$(date +%Y.%m.%d-%H%M)"
echo "🚀 Начинаем полный деплой версии $VERSION"
echo "📝 Описание: $COMMIT_MESSAGE"
echo ""

# Проверяем, что мы в git репозитории
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo "❌ Ошибка: Не в git репозитории"
    exit 1
fi

# Проверяем, что нет незакоммиченных изменений
if ! git diff-index --quiet HEAD --; then
    echo "📝 Обнаружены изменения в коде"
    
    # Показываем статус
    echo "📊 Статус git:"
    git status --short
    
    echo ""
    read -p "Продолжить с коммитом изменений? (Y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Nn]$ ]]; then
        echo "❌ Деплой отменен"
        exit 1
    fi
    
    # Добавляем все изменения
    echo "📦 Добавляем изменения..."
    git add .
    
    # Коммитим
    echo "💾 Создаем коммит..."
    git commit -m "$COMMIT_MESSAGE"
    
    echo "✅ Изменения закоммичены"
else
    echo "✅ Нет незакоммиченных изменений"
fi

# Пушим в main
echo "📤 Отправляем изменения в репозиторий..."
git push origin main

# Создаем тег
echo "🏷️  Создаем тег $VERSION..."
git tag "$VERSION"
git push origin "$VERSION"

echo "✅ Тег $VERSION создан и отправлен"
echo ""

# Ждем сборки образов
echo "⏳ Ждем сборки образов в GitHub Actions..."
echo "📊 Отслеживаем: https://github.com/drobotenko-netizen/piligrim/actions"
echo ""

# Проверяем статус сборки (максимум 10 минут)
TIMEOUT=600
ELAPSED=0
INTERVAL=30

while [ $ELAPSED -lt $TIMEOUT ]; do
    echo "⏱️  Проверяем статус сборки... ($ELAPSED/$TIMEOUT сек)"
    
    # Получаем статус последнего workflow
    LATEST_RUN=$(curl -s "https://api.github.com/repos/drobotenko-netizen/piligrim/actions/runs?per_page=1" | jq -r '.workflow_runs[0]')
    STATUS=$(echo "$LATEST_RUN" | jq -r '.status')
    CONCLUSION=$(echo "$LATEST_RUN" | jq -r '.conclusion // "null"')
    BRANCH=$(echo "$LATEST_RUN" | jq -r '.head_branch')
    
    echo "📊 Статус: $STATUS, Заключение: $CONCLUSION, Ветка: $BRANCH"
    
    if [ "$BRANCH" = "$VERSION" ]; then
        if [ "$STATUS" = "completed" ]; then
            if [ "$CONCLUSION" = "success" ]; then
                echo "✅ Сборка образов завершена успешно!"
                break
            else
                echo "❌ Сборка образов завершилась с ошибкой: $CONCLUSION"
                echo "🔍 Проверьте логи: https://github.com/drobotenko-netizen/piligrim/actions"
                exit 1
            fi
        elif [ "$STATUS" = "in_progress" ] || [ "$STATUS" = "queued" ]; then
            echo "⏳ Сборка продолжается..."
        else
            echo "⚠️  Неожиданный статус: $STATUS"
        fi
    else
        echo "⏳ Ждем запуска сборки для тега $VERSION..."
    fi
    
    sleep $INTERVAL
    ELAPSED=$((ELAPSED + INTERVAL))
done

if [ $ELAPSED -ge $TIMEOUT ]; then
    echo "⏰ Таймаут ожидания сборки (10 минут)"
    echo "🔍 Проверьте статус вручную: https://github.com/drobotenko-netizen/piligrim/actions"
    read -p "Продолжить деплой? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Деплой отменен"
        exit 1
    fi
fi

echo ""
echo "🚀 Начинаем деплой на сервер..."

# Выполняем деплой на сервер
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
echo "🎉 Полный деплой версии $VERSION завершен!"
echo "📝 Описание: $COMMIT_MESSAGE"
echo "🌐 Приложение: https://piligrim.5-star-roi.ru/"
echo "🔧 API: https://piligrim.5-star-roi.ru/api/health"
echo "📊 GitHub Actions: https://github.com/drobotenko-netizen/piligrim/actions"
echo ""
echo "📋 Для проверки статуса используйте: ./check_server_version.sh"
