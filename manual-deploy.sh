#!/bin/bash

# 🚀 Ручной деплой Piligrim без GitHub Actions
# Собирает и деплоит код напрямую на сервер

set -e

COMMIT_MESSAGE="$1"

if [ -z "$COMMIT_MESSAGE" ]; then
    echo "❌ Ошибка: Укажите описание изменений"
    echo "Использование: ./manual-deploy.sh \"Описание изменений\""
    exit 1
fi

# Генерируем версию на основе текущей даты и времени
VERSION="v$(date +%Y.%m.%d-%H%M)"
echo "🚀 Начинаем ручной деплой версии $VERSION"
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

# Деплой на сервер
echo "🔄 Выполняем деплой на сервер..."

ssh yc-vm << EOF
set -e

echo "📥 Клонируем репозиторий..."
cd /tmp
rm -rf piligrim-deploy
git clone https://github.com/drobotenko-netizen/piligrim.git piligrim-deploy
cd piligrim-deploy
git checkout $VERSION

echo "🐳 Собираем образы на сервере..."

# Собираем API образ
echo "📦 Собираем API образ..."
cd server
docker build -t piligrim-api:$VERSION .
cd ..

# Собираем WEB образ
echo "📦 Собираем WEB образ..."
cd client
docker build -t piligrim-web:$VERSION .
cd ..

echo "🛑 Останавливаем старые контейнеры..."
docker stop api web 2>/dev/null || true
docker rm api web 2>/dev/null || true

echo "🚀 Запускаем новые контейнеры..."
docker run -d --name api --network infra_default --restart unless-stopped \\
  -e PORT=4000 -e NODE_ENV=production -e DATABASE_URL=file:/data/dev.db \\
  -e FRONTEND_BASE_URL=https://piligrim.5-star-roi.ru \\
  -e SERVER_PUBLIC_URL=https://piligrim.5-star-roi.ru \\
  -e TELEGRAM_BOT_TOKEN=8466721340:AAGaA3Y1nozm5YLTP_F2ChpyCQdDktyF6_0 \\
  -e TELEGRAM_POLLING=1 \\
  -v piligrim_api_data:/data piligrim-api:$VERSION

docker run -d --name web --network infra_default --restart unless-stopped \\
  -e NODE_ENV=production -e PORT=3000 -e NEXT_PUBLIC_API_BASE=https://piligrim.5-star-roi.ru \\
  piligrim-web:$VERSION

echo "🔗 Подключаем к сети proxy..."
docker network connect proxy api 2>/dev/null || true
docker network connect proxy web 2>/dev/null || true

echo "⏱️  Ждем запуска контейнеров..."
sleep 5

echo "📊 Статус контейнеров:"
docker ps --format "table {{.Names}}\\t{{.Image}}\\t{{.Status}}"

echo "🧹 Очищаем временные файлы..."
cd /tmp
rm -rf piligrim-deploy

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
echo "🎉 Ручной деплой версии $VERSION завершен!"
echo "📝 Описание: $COMMIT_MESSAGE"
echo "🌐 Приложение: https://piligrim.5-star-roi.ru/"
echo "🔧 API: https://piligrim.5-star-roi.ru/api/health"
echo ""
echo "📋 Для проверки статуса используйте: ./check_server_version.sh"
