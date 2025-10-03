# Piligrim — прод: Яндекс.Облако + Git/CI

Короткая инструкция, как у нас всё собрано и что делать дальше.

## Архитектура
- ВМ: Yandex Compute Cloud, Ubuntu 24.04, публичный IP `51.250.41.78`.
- Прокси/SSL: Caddy в Docker (авто‑HTTPS Let’s Encrypt).
- Приложения:
  - `web` (Next.js) — порт 3000.
  - `api` (Express+Prisma) — порт 4000, SQLite в Docker‑томе.
- Домены:
  - `piligrim.5-star-roi.ru` → `web`.
  - `api.piligrim.5-star-roi.ru` → `api`.

## Доступ и SSH
- Удобный алиас на вашей машине (пример):
  ```ssh
  Host yc-vm
    HostName 51.250.41.78
    User yc-user
    IdentityFile ~/.ssh/id_ed25519
    IdentitiesOnly yes
  ```
- Подключение: `ssh yc-vm`.

## DNS
В панели DNS (у регистратора):
- A: `piligrim` → `51.250.41.78`
- A: `api.piligrim` → `51.250.41.78`
TTL 300–600.

## Где что на сервере
- Прокси Caddy: `/opt/infra/caddy/`
  - `docker-compose.yml` — стек прокси.
  - `Caddyfile` — маршрутизация.
- Приложение: `/opt/apps/piligrim/`
  - `docker-compose.prod.yml` — стек `web`/`api` (см. репозиторий).
  - Том SQLite: volume `api_data` (маппится в `/data` внутри контейнера `api`).

## Образы
- GHCR (GitHub Container Registry):
  - `ghcr.io/<OWNER>/<REPO>/piligrim-web:<tag>`
  - `ghcr.io/<OWNER>/<REPO>/piligrim-api:<tag>`
Пример для нашего репо: `ghcr.io/drobotenko-netizen/piligrim/piligrim-web:v2025.10.03-09`.

## Ручной деплой (без CI)
1) Залогиниться на GHCR на сервере (нужен `read:packages` токен):
   ```bash
   echo "$GHCR_READ_TOKEN" | docker login ghcr.io -u "$GHCR_READ_USER" --password-stdin
   ```
2) Обновить прокси (на всякий):
   ```bash
   cd /opt/infra/caddy && docker compose up -d
   docker network create proxy || true
   docker network connect proxy caddy || true
   ```
3) Обновить приложение (подставьте теги):
   ```bash
   cd /opt/apps/piligrim
   IMAGE_WEB=ghcr.io/drobotenko-netizen/piligrim/piligrim-web:<TAG> \
   IMAGE_API=ghcr.io/drobotenko-netizen/piligrim/piligrim-api:<TAG> \
   docker compose -f docker-compose.prod.yml pull || true

   IMAGE_WEB=ghcr.io/drobotenko-netizen/piligrim/piligrim-web:<TAG> \
   IMAGE_API=ghcr.io/drobotenko-netizen/piligrim/piligrim-api:<TAG> \
   docker compose -f docker-compose.prod.yml up -d
   ```
4) Проверка:
   - https://piligrim.5-star-roi.ru
   - https://api.piligrim.5-star-roi.ru

## Откат
- Выберите предыдущий тег и повторите п.3 с прежними тегами.
- Если затронута БД (SQLite): восстановить из бэкапа (см. ниже).

## Бэкапы SQLite
Сделать снапшот тома `api_data`:
```bash
# Временный контейнер для копии БД
cid=$(docker create --volumes-from $(docker ps -qf name=api) alpine:3 tar czf - /data)
mkdir -p /opt/backups && docker cp "$cid":- /opt/backups/backup-$(date +%F-%H%M).tgz
docker rm -v "$cid"
```
Восстановление — распаковать архив в том и перезапустить `api`.

## CI/CD (GitHub Actions, по тегу)
- Репозиторий: `git@github.com:drobotenko-netizen/piligrim.git`
- Теги релизов: `vYYYY.MM.DD-XX` (пример: `v2025.10.03-09`).
- Секреты в репозитории (Settings → Secrets → Actions):
  - `SSH_HOST=51.250.41.78`
  - `SSH_USER=yc-user`
  - `SSH_KEY=<приватный SSH-ключ целиком>`
  - `GHCR_READ_USER=<github username>`
  - `GHCR_READ_TOKEN=<PAT read:packages>`
- Старт релиза:
  ```bash
  git tag v2025.10.03-10 && git push origin v2025.10.03-10
  ```
(Workflow `release` соберёт образы и задеплоит.)

## Логи и управление
```bash
# Прокси
cd /opt/infra/caddy && docker compose logs -f --tail=200 caddy

# Приложение
cd /opt/apps/piligrim && docker compose ps
cd /opt/apps/piligrim && docker compose logs -f --tail=200 web
cd /opt/apps/piligrim && docker compose logs -f --tail=200 api
```
Перезапуск сервиса: `docker compose restart web` / `api`.

## Локальная разработка
```bash
# web
cd client && npm i && npm run dev
# api
cd server && npm i && npm run dev
```
`NEXT_PUBLIC_API_BASE` указывает на ваш back (локально: `http://localhost:4000`).

## Траблшутинг
- Сертификат не выпускается → проверьте A‑записи DNS и доступность 80/443.
- 502/Bad Gateway → `docker compose logs` у `web`/`api`.
- Нет доступа к GHCR → проверьте `docker login ghcr.io` и валидность `GHCR_READ_TOKEN`.
- Откат после неудачного релиза: перезапустите с предыдущими тегами + при необходимости восстановите БД из /opt/backups.

---
Кратко: заходите по SSH → `docker compose up -d` в `/opt/infra/caddy` и `/opt/apps/piligrim` с нужными тегами → проверка доменов. Для автоматизации используйте релиз‑теги и Actions.
