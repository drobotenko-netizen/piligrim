#!/bin/bash

echo "🔍 Проверка статуса деплоя..."
echo ""

echo "📋 Информация о релизе:"
echo "Тег: v2025.01.10-01"
echo "Коммит: $(git rev-parse HEAD)"
echo "Дата: $(date)"
echo ""

echo "🌐 Проверка доступности приложения:"
echo "Frontend: https://piligrim.5-star-roi.ru"
echo "API: https://api.piligrim.5-star-roi.ru"
echo ""

echo "📊 GitHub Actions:"
echo "Откройте https://github.com/drobotenko-netizen/piligrim/actions"
echo "Найдите workflow 'release' для тега v2025.01.10-01"
echo ""

echo "🚀 Что было исправлено:"
echo "✅ Ошибки 401 (Unauthorized) во всех компонентах"
echo "✅ Добавлен credentials: 'include' ко всем fetch запросам"
echo "✅ Исправлены ошибки 'Cannot read properties of undefined'"
echo "✅ Защита от undefined значений в компонентах"
echo "✅ Улучшена обработка ошибок"
echo ""

echo "📝 Для ручного деплоя (если нужно):"
echo "ssh yc-vm"
echo "cd /opt/apps/piligrim"
echo "IMAGE_WEB=ghcr.io/drobotenko-netizen/piligrim/piligrim-web:v2025.01.10-01 \\"
echo "IMAGE_API=ghcr.io/drobotenko-netizen/piligrim/piligrim-api:v2025.01.10-01 \\"
echo "docker compose -f docker-compose.prod.yml up -d"
echo ""

echo "🔧 Мониторинг на сервере:"
echo "docker compose logs -f --tail=50 web"
echo "docker compose logs -f --tail=50 api"
echo "docker compose ps"
