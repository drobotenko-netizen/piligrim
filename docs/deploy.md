# Деплой Piligrim (Git-based)

Ниже схема деплоя на Linux‑сервер (например, ВМ в Яндекс Облаке) через bare‑репозиторий и git hook `post-receive`, который собирает образы и поднимает стек Caddy+web+api.

## 1) Подготовка на сервере (однократно)

```bash
# Директории
sudo mkdir -p /srv/piligrim/{repo,app}
sudo chown -R $USER:$USER /srv/piligrim

# Bare‑репозиторий
git init --bare /srv/piligrim/repo

# Хук post-receive
cat >/srv/piligrim/repo/hooks/post-receive <<'SH'
#!/usr/bin/env bash
set -euo pipefail

# PATH важен для docker compose в хуках
export PATH="/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"
LOG="/var/log/piligrim-deploy.log"
mkdir -p /var/log >/dev/null 2>&1 || true
exec >>"$LOG" 2>&1

REPO="/srv/piligrim/repo"
WORK_TREE="/srv/piligrim/app"
export TAG="$(date -u +%Y%m%d%H%M%S)"

echo "[deploy] ---- $(date -u +%F %T) ----"
echo "[deploy] checkout to $WORK_TREE"
git --work-tree="$WORK_TREE" --git-dir="$REPO" checkout -f
cd "$WORK_TREE"

# Сборка образов согласно docker-compose.prod.yml
# Получатся образы piligrim-web:${TAG} и piligrim-api:${TAG}
echo "[deploy] build images (client/server)"
IMAGE_WEB="piligrim-web:${TAG}" IMAGE_API="piligrim-api:${TAG}" \
  docker compose -f docker-compose.prod.yml build --pull

# Поднятие стека из infra/docker-compose.yml
# Caddy проксирует web:3000 и api:4000
# Переменная TAG прокинется во второй compose (infra)
echo "[deploy] up stack (Caddy + images)"
TAG="$TAG" docker compose -f infra/docker-compose.yml up -d

# Уборка висячих образов
docker image prune -f || true

echo "[deploy] done TAG=$TAG"
SH
chmod +x /srv/piligrim/repo/hooks/post-receive

# Сеть для обратного прокси (если ещё нет)
docker network create proxy || true
```

## 2) Настройка окружения

- На сервере создайте `/srv/piligrim/app/server/.env` с переменными:
  ```bash
  # --- Auth / CORS
  ALLOWED_ORIGINS=http://localhost:3000,https://piligrim.5-star-roi.ru
  AUTH_JWT_SECRET=please-change-this
  MAGIC_LINK_SECRET=please-change-this-too
  SERVER_PUBLIC_URL=https://piligrim.5-star-roi.ru
  FRONTEND_BASE_URL=https://piligrim.5-star-roi.ru

  # --- Telegram
  TELEGRAM_BOT_TOKEN=8466721340:AAGaA3Y1nozm5YLTP_F2ChpyCQdDktyF6_0
  TELEGRAM_BOT_USERNAME=piligrim_app_bot
  TELEGRAM_WEBHOOK_SECRET=5c1744514338e6d62239b059ca607931
  TELEGRAM_POLLING=1

  # --- Messaggio OTP
  MESSAGGIO_API_KEY=0198aca3-882a-7718-955a-87116ce7201c
  MESSAGGIO_BASE_URL=https://otp.messaggio.com/api/v1

  # --- IIKO
  IIKO_HOST=piligrim-arsenev-co.iiko.it
  IIKO_LOGIN=drobotenko
  IIKO_PASS=Cxd8hj97yGH
  ```
- Проверьте домены в `infra/Caddyfile` и откройте 80/443.
- Убедитесь, что у пользователя есть права на запуск Docker.

## 3) Первичный деплой

На вашей машины добавьте remote и запушьте ветку:

```bash
git remote add prod ssh://<user>@<server>/srv/piligrim/repo
git push prod main
```

## 4) Диагностика

```bash
# На сервере
sudo tail -n 200 /var/log/piligrim-deploy.log

docker compose -f infra/docker-compose.yml ps
docker compose -f infra/docker-compose.yml logs --tail=200 web
docker compose -f infra/docker-compose.yml logs --tail=200 api
```

## Примечания

- Если хотите собирать/push образы в Yandex Container Registry, замените этап build на CI‑сборку и `docker compose pull && up -d` в хуке, а `infra/docker-compose.yml` переключите на `image: cr.yandex/...:${TAG}`.
