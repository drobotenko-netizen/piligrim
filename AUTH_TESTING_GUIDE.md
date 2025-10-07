# Руководство по тестированию системы авторизации

## Что изменилось

✅ **Удалено:**
- Messaggio OTP интеграция
- Endpoints `/api/auth/otp/send` и `/api/auth/otp/verify`
- Зависимость от внешнего SMS сервиса

✅ **Оставлено:**
- Telegram бот для авторизации
- Magic links для входа в систему
- JWT токены для сессий
- Система ролей и разрешений

## Новые API endpoints

- `GET /api/auth/_ping` - проверка работоспособности
- `GET /api/auth/me` - информация о текущем пользователе
- `POST /api/auth/dev-login` - DEV вход для разработки
- `POST /api/auth/logout` - выход из системы
- `POST /api/auth/telegram-bind` - привязка Telegram (DEV)

## Процесс авторизации

### 1. Создание пользователя (администратором)
```bash
curl -X POST http://localhost:4000/api/admin/users \
  -H "Content-Type: application/json" \
  -H "x-role: ADMIN" \
  -d '{"fullName": "Тестовый Пользователь", "phone": "+1234567890"}'
```

### 2. Генерация кода привязки Telegram
```bash
curl -X POST http://localhost:4000/api/admin/users/{userId}/telegram-binding-code \
  -H "Content-Type: application/json" \
  -H "x-role: ADMIN"
```

### 3. Привязка через Telegram бота
- Отправить `/start {код_привязки}` боту
- Получить подтверждение привязки

### 4. Вход через Telegram
- Отправить `/login` боту
- Получить ссылку для входа
- Перейти по ссылке и автоматически авторизоваться

## Тестирование

### Автоматическое тестирование
```bash
# Запустить сервер
cd server && npm run dev

# В другом терминале запустить тесты
node test-auth-flow.js
```

### Ручное тестирование

1. **Проверка health endpoint:**
```bash
curl http://localhost:4000/api/health
```

2. **Проверка auth ping:**
```bash
curl http://localhost:4000/api/auth/_ping
```

3. **DEV вход (если есть пользователи):**
```bash
curl -X POST http://localhost:4000/api/auth/dev-login \
  -H "Content-Type: application/json" \
  -d '{"phone": "+1234567890"}'
```

4. **Проверка авторизации:**
```bash
curl http://localhost:4000/api/auth/me \
  -H "Cookie: access_token={полученный_токен}"
```

## Переменные окружения

Обновите `server/.env`:
```env
# Удалите эти строки:
# MESSAGGIO_API_KEY=...
# MESSAGGIO_BASE_URL=...

# Оставьте только:
AUTH_JWT_SECRET=<генерировать-256-бит-секрет>
MAGIC_LINK_SECRET=<генерировать-256-бит-секрет>
TELEGRAM_BOT_TOKEN=<ваш-токен-бота>
TELEGRAM_POLLING=1
SERVER_PUBLIC_URL=http://localhost:4000
FRONTEND_BASE_URL=http://localhost:3000
```

## Проверка работы фронтенда

1. Запустите сервер: `cd server && npm run dev`
2. Запустите клиент: `cd client && npm run dev`
3. Откройте http://localhost:3000
4. Должна отобразиться страница с инструкциями по входу через Telegram

## Возможные проблемы

### Сервер не запускается
- Проверьте, что все зависимости установлены: `npm install`
- Проверьте переменные окружения в `.env`

### Telegram бот не отвечает
- Проверьте `TELEGRAM_BOT_TOKEN`
- Убедитесь, что `TELEGRAM_POLLING=1`
- Проверьте логи сервера

### Фронтенд показывает ошибки
- Проверьте, что сервер запущен на порту 4000
- Проверьте CORS настройки
- Проверьте консоль браузера на ошибки

## Логи для отладки

Сервер выводит подробные логи:
```
[tg-polling] Message from chatId: 123456, text: "/start abc123"
[auth/me] cookie present: true
[auth/me] user resolved: user123 Тестовый Пользователь
```

Используйте эти логи для диагностики проблем.
