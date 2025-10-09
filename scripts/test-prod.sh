#!/bin/bash

# Скрипт для тестирования на продакшене

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

PROD_URL="https://piligrim.5-star-roi.ru"
COOKIES_FILE="$PROJECT_ROOT/prod_cookies.txt"

echo "🧪 Тестирование на продакшене: $PROD_URL"
echo ""

# Проверка наличия cookies
if [ ! -f "$COOKIES_FILE" ]; then
  echo "⚠️  Файл $COOKIES_FILE не найден"
  echo "Получите токен через Telegram бот и сохраните cookies"
  exit 1
fi

# Функция для API теста
test_api() {
  local endpoint=$1
  local method=${2:-GET}
  local data=${3:-}
  
  echo "Testing: $method $endpoint"
  
  if [ "$method" = "POST" ]; then
    curl -s -X POST "$PROD_URL$endpoint" \
      --cookie "$(cat $COOKIES_FILE)" \
      -H "Content-Type: application/json" \
      -d "$data" | jq '.' 2>/dev/null || echo "Failed"
  else
    curl -s "$PROD_URL$endpoint" \
      --cookie "$(cat $COOKIES_FILE)" | jq '.' 2>/dev/null || echo "Failed"
  fi
  echo ""
}

case "${1:-all}" in
  health)
    echo "1. Health check:"
    curl -s "$PROD_URL/api/health" | jq '.'
    echo ""
    ;;
    
  auth)
    echo "2. Auth check:"
    test_api "/api/auth/me"
    ;;
    
  iiko)
    echo "3. iiko last data date:"
    test_api "/api/iiko/last-data-date"
    
    echo "4. iiko balances-table:"
    LAST_DATE=$(curl -s "$PROD_URL/api/iiko/last-data-date" | jq -r '.date')
    echo "   Using date: $LAST_DATE"
    test_api "/api/iiko/stores/balances-table" "POST" "{\"timestamp\":\"${LAST_DATE}T12:00:00.000\",\"from\":\"$LAST_DATE\",\"to\":\"$LAST_DATE\"}"
    ;;
    
  purchasing)
    echo "5. Purchasing APIs:"
    test_api "/api/purchasing/buffers"
    test_api "/api/purchasing/product-suppliers"
    test_api "/api/counterparties?type=Поставщик"
    ;;
    
  logs)
    echo "📋 Последние логи API:"
    ssh yc-vm "sudo docker logs api --tail 50"
    echo ""
    echo "📋 Последние логи Web:"
    ssh yc-vm "sudo docker logs web --tail 20"
    ;;
    
  status)
    echo "📊 Статус контейнеров:"
    ssh yc-vm "sudo docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Image}}'"
    ;;
    
  all)
    test_api "/api/health"
    test_api "/api/auth/me"
    test_api "/api/iiko/last-data-date"
    test_api "/api/purchasing/buffers"
    test_api "/api/counterparties?type=Поставщик"
    ;;
    
  *)
    echo "Использование: $0 [команда]"
    echo ""
    echo "Команды:"
    echo "  health      - Проверка health endpoint"
    echo "  auth        - Проверка авторизации"
    echo "  iiko        - Тест iiko API"
    echo "  purchasing  - Тест purchasing API"
    echo "  logs        - Показать логи контейнеров"
    echo "  status      - Статус контейнеров"
    echo "  all         - Все тесты (по умолчанию)"
    echo ""
    ;;
esac

