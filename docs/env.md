### Переменные окружения (сервер)

Создайте файл `server/.env` со значениями:

MESSAGGIO_API_KEY=0198aca3-882a-7718-955a-87116ce7201c
MESSAGGIO_BASE_URL=https://messaggio.com/api
ALLOWED_ORIGINS=http://localhost:3000
AUTH_JWT_SECRET=please-change-this
IIKO_HOST=piligrim-arsenev-co.iiko.it
IIKO_LOGIN=drobotenko
# Либо плейн-пароль, либо SHA1 (только один из вариантов)
IIKO_PASS=Cxd8hj97yGH
# IIKO_PASS_SHA1=9c06db3576d98d3abddccbe2a801665c370c566b

Примечание: храните секреты вне Git. Для локальной разработки достаточно `.env` в папке `server`.

