# Обновление переменных окружения для Production

## ❌ Удалить из server/.env на сервере:

```bash
# Эти строки больше не нужны после удаления Messaggio:
MESSAGGIO_API_KEY=0198aca3-882a-7718-955a-87116ce7201c
MESSAGGIO_BASE_URL=https://otp.messaggio.com/api/v1
```

## ✅ Обновить секреты в server/.env на сервере:

```bash
# Заменить небезопасные секреты на надежные:
AUTH_JWT_SECRET=<сгенерировать-256-бит-секрет>
MAGIC_LINK_SECRET=<сгенерировать-256-бит-секрет>

# Остальные переменные оставить как есть:
ALLOWED_ORIGINS=https://piligrim.5-star-roi.ru
SERVER_PUBLIC_URL=https://piligrim.5-star-roi.ru
FRONTEND_BASE_URL=https://piligrim.5-star-roi.ru
TELEGRAM_BOT_TOKEN=8466721340:AAGaA3Y1nozm5YLTP_F2ChpyCQdDktyF6_0
TELEGRAM_BOT_USERNAME=piligrim_app_bot
TELEGRAM_WEBHOOK_SECRET=5c1744514338e6d62239b059ca607931
TELEGRAM_POLLING=1
IIKO_HOST=piligrim-arsenev-co.iiko.it
IIKO_LOGIN=drobotenko
IIKO_PASS=Cxd8hj97yGH
DATABASE_URL=file:/data/dev.db
NODE_ENV=production
```

## 🔧 Команды для генерации безопасных секретов:

```bash
# Сгенерировать 256-битные секреты:
openssl rand -hex 32
# или
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 📝 Порядок обновления на сервере:

1. Создать бэкап текущего .env:
   ```bash
   cp /srv/piligrim/app/server/.env /srv/piligrim/app/server/.env.backup
   ```

2. Отредактировать .env файл:
   ```bash
   nano /srv/piligrim/app/server/.env
   ```

3. Удалить строки с MESSAGGIO_*
4. Обновить AUTH_JWT_SECRET и MAGIC_LINK_SECRET
5. Сохранить файл

6. Перезапустить приложение:
   ```bash
   cd /opt/apps/piligrim
   docker compose -f docker-compose.prod.yml restart api
   ```
