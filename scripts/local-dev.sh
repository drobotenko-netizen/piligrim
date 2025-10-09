#!/bin/bash

# Скрипт для локальной разработки и тестирования

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "🔧 Настройка локальной разработки..."

# Функция для запуска сервера
start_server() {
  echo "🚀 Запуск API сервера..."
  cd "$PROJECT_ROOT/server"
  npm run dev &
  SERVER_PID=$!
  echo "Server PID: $SERVER_PID"
  sleep 3
}

# Функция для запуска клиента
start_client() {
  echo "🌐 Запуск Frontend..."
  cd "$PROJECT_ROOT/client"
  npm run dev &
  CLIENT_PID=$!
  echo "Client PID: $CLIENT_PID"
  sleep 3
}

# Функция для получения dev токена
get_dev_token() {
  echo "🔑 Получение dev токена..."
  sleep 2
  RESPONSE=$(curl -s -X POST http://localhost:4000/api/auth/dev-login \
    -H "Content-Type: application/json" \
    -d '{"phone": "+79999999999"}')
  
  TOKEN=$(echo $RESPONSE | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)
  
  if [ -n "$TOKEN" ]; then
    echo "✅ Токен получен"
    echo "access_token=$TOKEN" > "$PROJECT_ROOT/dev_cookies.txt"
    echo ""
    echo "📝 Токен сохранен в dev_cookies.txt"
    echo "Используйте: --cookie \"\$(cat dev_cookies.txt)\""
  else
    echo "❌ Не удалось получить токен"
    echo "Ответ: $RESPONSE"
  fi
}

# Функция для тестирования API
test_api() {
  echo ""
  echo "🧪 Тестирование API..."
  echo ""
  
  echo "1. Health check:"
  curl -s http://localhost:4000/api/health | jq '.'
  echo ""
  
  echo "2. Last data date:"
  curl -s http://localhost:4000/api/iiko/last-data-date | jq '.'
  echo ""
  
  if [ -f "$PROJECT_ROOT/dev_cookies.txt" ]; then
    echo "3. Auth check (with token):"
    curl -s http://localhost:4000/api/auth/me \
      --cookie "$(cat $PROJECT_ROOT/dev_cookies.txt)" | jq '.'
    echo ""
  fi
}

# Функция для остановки процессов
cleanup() {
  echo ""
  echo "🛑 Остановка процессов..."
  if [ -n "$SERVER_PID" ]; then
    kill $SERVER_PID 2>/dev/null || true
  fi
  if [ -n "$CLIENT_PID" ]; then
    kill $CLIENT_PID 2>/dev/null || true
  fi
  # Также убиваем по портам
  lsof -ti:4000 | xargs kill -9 2>/dev/null || true
  lsof -ti:3000 | xargs kill -9 2>/dev/null || true
  echo "✅ Процессы остановлены"
}

# Обработка сигналов
trap cleanup EXIT INT TERM

# Парсинг аргументов
case "${1:-help}" in
  start)
    start_server
    start_client
    echo ""
    echo "✅ Серверы запущены:"
    echo "   API:      http://localhost:4000"
    echo "   Frontend: http://localhost:3000"
    echo ""
    echo "Нажмите Ctrl+C для остановки"
    wait
    ;;
    
  api)
    start_server
    echo ""
    echo "✅ API сервер запущен: http://localhost:4000"
    echo "Нажмите Ctrl+C для остановки"
    wait
    ;;
    
  client)
    start_client
    echo ""
    echo "✅ Frontend запущен: http://localhost:3000"
    echo "Нажмите Ctrl+C для остановки"
    wait
    ;;
    
  token)
    get_dev_token
    ;;
    
  test)
    test_api
    ;;
    
  stop)
    cleanup
    ;;
    
  help|*)
    echo "Использование: $0 [команда]"
    echo ""
    echo "Команды:"
    echo "  start   - Запустить API и Frontend"
    echo "  api     - Запустить только API сервер"
    echo "  client  - Запустить только Frontend"
    echo "  token   - Получить dev токен для тестирования"
    echo "  test    - Протестировать API"
    echo "  stop    - Остановить все процессы"
    echo "  help    - Показать эту справку"
    echo ""
    echo "Примеры:"
    echo "  $0 start          # Запустить всё"
    echo "  $0 api            # Только API"
    echo "  $0 token          # Получить токен"
    echo "  $0 test           # Тест API"
    ;;
esac

