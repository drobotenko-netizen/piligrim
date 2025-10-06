# Инструкции по деплою Piligrim

## Автоматический деплой (рекомендуется)

1. **Создать тег релиза:**
   ```bash
   git tag v2025.01.10-01
   git push origin v2025.01.10-01
   ```

2. **Проверить статус деплоя:**
   - Откройте https://github.com/drobotenko-netizen/piligrim/actions
   - Найдите workflow "release" для тега v2025.01.10-01
   - Дождитесь завершения всех шагов

3. **Проверить работу приложения:**
   - https://piligrim.5-star-roi.ru
   - https://api.piligrim.5-star-roi.ru

## Ручной деплой (если автоматический не работает)

1. **Подключиться к серверу:**
   ```bash
   ssh yc-vm
   ```

2. **Обновить прокси:**
   ```bash
   cd /opt/infra/caddy && docker compose up -d
   docker network create proxy || true
   docker network connect proxy caddy || true
   ```

3. **Обновить приложение:**
   ```bash
   cd /opt/apps/piligrim
   IMAGE_WEB=ghcr.io/drobotenko-netizen/piligrim/piligrim-web:v2025.01.10-01 \
   IMAGE_API=ghcr.io/drobotenko-netizen/piligrim/piligrim-api:v2025.01.10-01 \
   docker compose -f docker-compose.prod.yml pull

   IMAGE_WEB=ghcr.io/drobotenko-netizen/piligrim/piligrim-web:v2025.01.10-01 \
   IMAGE_API=ghcr.io/drobotenko-netizen/piligrim/piligrim-api:v2025.01.10-01 \
   docker compose -f docker-compose.prod.yml up -d
   ```

4. **Проверить логи:**
   ```bash
   cd /opt/apps/piligrim
   docker compose logs -f --tail=50 web
   docker compose logs -f --tail=50 api
   ```

## Что было исправлено в этом релизе

- ✅ Исправлены ошибки 401 (Unauthorized) во всех компонентах
- ✅ Добавлен `credentials: 'include'` ко всем fetch запросам
- ✅ Исправлены ошибки "Cannot read properties of undefined (reading 'filter')"
- ✅ Добавлена защита от undefined значений в инициализации компонентов
- ✅ Улучшена обработка ошибок и graceful degradation

## Откат (если что-то пошло не так)

1. **Вернуться к предыдущему тегу:**
   ```bash
   cd /opt/apps/piligrim
   IMAGE_WEB=ghcr.io/drobotenko-netizen/piligrim/piligrim-web:v2025.01.09-XX \
   IMAGE_API=ghcr.io/drobotenko-netizen/piligrim/piligrim-api:v2025.01.09-XX \
   docker compose -f docker-compose.prod.yml up -d
   ```

2. **Восстановить БД из бэкапа (если нужно):**
   ```bash
   # Создать бэкап перед откатом
   cid=$(docker create --volumes-from $(docker ps -qf name=api) alpine:3 tar czf - /data)
   mkdir -p /opt/backups && docker cp "$cid":- /opt/backups/backup-$(date +%F-%H%M).tgz
   docker rm -v "$cid"
   ```

## Мониторинг

- **Логи приложения:** `cd /opt/apps/piligrim && docker compose logs -f`
- **Логи прокси:** `cd /opt/infra/caddy && docker compose logs -f`
- **Статус контейнеров:** `docker compose ps`
- **Использование ресурсов:** `docker stats`
