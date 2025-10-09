# 🛠️ Руководство по разработке и тестированию

## Локальная разработка

### Быстрый старт

```bash
# Запустить API и Frontend
./scripts/local-dev.sh start

# Или отдельно
./scripts/local-dev.sh api      # Только API (localhost:4000)
./scripts/local-dev.sh client   # Только Frontend (localhost:3000)
```

### Получение токена для локального тестирования

```bash
# Получить dev токен
./scripts/local-dev.sh token

# Токен сохранится в dev_cookies.txt
# Используйте его для curl запросов:
curl http://localhost:4000/api/auth/me --cookie "$(cat dev_cookies.txt)"
```

### Тестирование локального API

```bash
./scripts/local-dev.sh test
```

### Остановка

```bash
./scripts/local-dev.sh stop
# или просто Ctrl+C
```

## Работа с базой данных

### Локально

```bash
cd server

# Применить миграции
npm run prisma:migrate

# Сгенерировать Prisma Client
npm run prisma:generate

# Открыть Prisma Studio
npm run prisma:studio
```

### На проде

```bash
# Подключиться к Prisma Studio на проде
ssh yc-vm "sudo docker exec api npx prisma studio --browser none --port 5555" &

# Открыть туннель
ssh -L 5555:localhost:5555 yc-vm

# Теперь открыть в браузере: http://localhost:5555
```

## Тестирование на продакшене

### Настройка

1. Получите токен через скрипт:
   ```bash
   ./scripts/get-prod-token.sh
   ```
   
2. Или вручную:
   - Откройте Telegram бот @piligrim_app_bot
   - Отправьте `/login`
   - Откройте ссылку в браузере
   - DevTools (F12) → Application → Cookies → скопируйте `access_token`
   - Вставьте в скрипт

### Запуск тестов

```bash
# Все тесты
./scripts/test-prod.sh all

# Отдельные тесты
./scripts/test-prod.sh health      # Health check
./scripts/test-prod.sh auth        # Проверка авторизации
./scripts/test-prod.sh iiko        # Тест iiko API
./scripts/test-prod.sh purchasing  # Тест purchasing API
./scripts/test-prod.sh logs        # Логи контейнеров
./scripts/test-prod.sh status      # Статус контейнеров
```

## Процесс разработки

### 1. Локальная разработка

```bash
# 1. Запустить локально
./scripts/local-dev.sh start

# 2. Получить токен
./scripts/local-dev.sh token

# 3. Разработка с hot-reload
# Код автоматически перезагружается при изменениях

# 4. Тестирование
./scripts/local-dev.sh test
curl http://localhost:4000/api/ваш-endpoint --cookie "$(cat dev_cookies.txt)"
```

### 2. Проверка перед деплоем

```bash
# Локальная сборка клиента
cd client
npm run build

# Проверка TypeScript
cd server
npm run build
```

### 3. Деплой

```bash
# Закоммитить изменения
git add .
git commit -m "Ваше описание"
git push origin main

# GitHub Actions автоматически:
# - Соберет Docker образы
# - Задеплоит на сервер
# - Обновит контейнеры
```

### 4. Тестирование на проде

```bash
# Подождать 3-4 минуты после push

# Проверить статус
./scripts/test-prod.sh status

# Посмотреть логи
./scripts/test-prod.sh logs

# Запустить тесты
./scripts/test-prod.sh all
```

## Полезные команды

### Локально

```bash
# Убить процессы на портах
lsof -ti:4000 | xargs kill -9  # API
lsof -ti:3000 | xargs kill -9  # Frontend

# Проверить запущенные процессы
lsof -i:4000
lsof -i:3000

# Посмотреть логи
tail -f server/logs/app.log  # если есть
```

### На проде

```bash
# SSH на сервер
ssh yc-vm

# Логи контейнеров
sudo docker logs api --tail 100 -f
sudo docker logs web --tail 100 -f

# Статус контейнеров
sudo docker ps

# Перезапустить контейнеры
sudo docker restart api web

# Выполнить команду в контейнере
sudo docker exec api node -e "console.log('test')"
sudo docker exec api npx prisma studio --browser none --port 5555
```

## Структура проекта

```
/Users/denisdrobotenko/Piligrim/
├── server/              # Backend (Express + Prisma)
│   ├── src/
│   │   ├── index.ts    # Entry point
│   │   ├── modules/    # API modules
│   │   └── utils/      # Utilities
│   ├── prisma/         # Database schema
│   └── package.json
├── client/              # Frontend (Next.js)
│   ├── src/
│   │   ├── app/        # Pages
│   │   ├── components/ # Components
│   │   └── lib/        # Utils
│   └── package.json
├── scripts/             # Development scripts
│   ├── local-dev.sh    # Локальная разработка
│   ├── test-prod.sh    # Тестирование на проде
│   └── build-on-server.sh
└── .github/workflows/   # CI/CD
    └── release.yml      # Auto-deploy
```

## Переменные окружения

### Локально

Создайте `server/.env`:

```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="dev-secret"
MAGIC_LINK_SECRET="dev-magic-secret"

# iiko API
IIKO_HOST="ваш_iiko_host"
IIKO_LOGIN="ваш_логин"
IIKO_PASS="ваш_пароль"

# Telegram
TELEGRAM_BOT_TOKEN="ваш_токен"
TELEGRAM_POLLING=true

# URLs
SERVER_PUBLIC_URL="http://localhost:4000"
FRONTEND_BASE_URL="http://localhost:3000"
```

### На проде

Переменные хранятся в `/srv/piligrim/app/server/.env` на сервере.

## Troubleshooting

### Ошибка "Port already in use"

```bash
./scripts/local-dev.sh stop
# или
lsof -ti:4000 | xargs kill -9
lsof -ti:3000 | xargs kill -9
```

### Ошибка авторизации локально

```bash
# Получите новый токен
./scripts/local-dev.sh token
```

### Не работает на проде

```bash
# Проверьте логи
./scripts/test-prod.sh logs

# Проверьте статус
./scripts/test-prod.sh status

# Перезапустите контейнеры
ssh yc-vm "sudo docker restart api web"
```

### База данных не синхронизирована

```bash
# Локально
cd server
npm run prisma:generate
npm run prisma:migrate

# На проде
ssh yc-vm "sudo docker exec api npx prisma migrate deploy"
```

## Tips

1. **Всегда тестируйте локально перед деплоем**
2. **Проверяйте логи после деплоя** (`./scripts/test-prod.sh logs`)
3. **Используйте Prisma Studio** для отладки БД
4. **Коммитьте часто** с понятными сообщениями
5. **Не коммитьте `.env` файлы** и токены

## Контакты

- Telegram: @denisvladivostok
- Проект: piligrim.5-star-roi.ru

