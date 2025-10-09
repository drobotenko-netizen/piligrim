#!/bin/bash

# Скрипт для получения токена с продакшена через Telegram

echo "🔑 Получение токена для тестирования на продакшене"
echo ""
echo "Шаги:"
echo "1. Откройте Telegram бот @piligrim_app_bot"
echo "2. Отправьте команду /login"
echo "3. Откройте полученную ссылку в браузере"
echo "4. Откройте DevTools (F12) → Application → Cookies"
echo "5. Скопируйте значение cookie 'access_token'"
echo ""
read -p "Вставьте токен: " TOKEN

if [ -z "$TOKEN" ]; then
  echo "❌ Токен не указан"
  exit 1
fi

# Сохраняем в формате curl cookies
cat > prod_cookies.txt << EOF
# Netscape HTTP Cookie File
#HttpOnly_piligrim.5-star-roi.ru	FALSE	/	TRUE	9999999999	access_token	$TOKEN
EOF

echo ""
echo "✅ Токен сохранен в prod_cookies.txt"
echo ""
echo "Тестирование:"
curl -s https://piligrim.5-star-roi.ru/api/auth/me --cookie "$(cat prod_cookies.txt)" | jq '.'

