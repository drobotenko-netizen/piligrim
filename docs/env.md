### Переменные окружения (сервер)

Создайте файл `server/.env` со значениями:

MESSAGGIO_API_KEY=0198aca3-882a-7718-955a-87116ce7201c
MESSAGGIO_BASE_URL=https://otp.messaggio.com/api/v1
ALLOWED_ORIGINS=http://localhost:3000
AUTH_JWT_SECRET=please-change-this
MAGIC_LINK_SECRET=please-change-this-too
SERVER_PUBLIC_URL=http://localhost:4000
FRONTEND_BASE_URL=http://localhost:3000
TELEGRAM_BOT_TOKEN=8466721340:AAGaA3Y1nozm5YLTP_F2ChpyCQdDktyF6_0
TELEGRAM_WEBHOOK_SECRET=<set-your-random-secret>
TELEGRAM_POLLING=1
Примечание по Telegram:
- Для локальной разработки включите `TELEGRAM_POLLING=1` (long polling), вебхук не нужен.
- Для продакшена можно настроить webhook и выключить polling.
IIKO_HOST=piligrim-arsenev-co.iiko.it
IIKO_LOGIN=drobotenko
# Либо плейн-пароль, либо SHA1 (только один из вариантов)
IIKO_PASS=Cxd8hj97yGH
# IIKO_PASS_SHA1=9c06db3576d98d3abddccbe2a801665c370c566b

Примечание: храните секреты вне Git. Для локальной разработки достаточно `.env` в папке `server`.

### Настройка доставки OTP в Telegram через Messaggio

1) В кабинете Messaggio включите сервис OTP и создайте шаблон сообщения для Telegram.
2) Подключите и активируйте Telegram-канал доставки (укажите отправителя/бота согласно требованиям Messaggio).
3) Убедитесь, что ваш номер телефона привязан к аккаунту Telegram и доступен для получения сообщений от подключённого бота/канала.
4) Проверьте корректность `MESSAGGIO_API_KEY` и `MESSAGGIO_BASE_URL=https://otp.messaggio.com/api/v1`.
5) На клиенте при отправке кода выбирайте канал «Telegram» — приложение передаст `channel='telegram'` в эндпоинт `/api/auth/otp/send`.

