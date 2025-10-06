# 🚀 Руководство по деплою Piligrim

## 📋 Быстрый деплой (для ИИ)

### 1. Создание тега и запуск сборки
```bash
# Создать тег
git tag v2025.01.10-XX
git push origin v2025.01.10-XX

# Дождаться завершения сборки образов в GitHub Actions
# Проверить: https://github.com/drobotenko-netizen/piligrim/actions
```

### 2. Ручной деплой на сервер
```bash
# Подключиться к серверу
ssh yc-vm

# Загрузить новые образы
docker pull ghcr.io/drobotenko-netizen/piligrim/piligrim-web:v2025.01.10-XX
docker pull ghcr.io/drobotenko-netizen/piligrim/piligrim-api:v2025.01.10-XX

# Остановить старые контейнеры
docker stop api web
docker rm api web

# Запустить новые контейнеры
docker run -d --name api --network infra_default --restart unless-stopped \
  -e PORT=4000 -e NODE_ENV=production -e DATABASE_URL=file:/data/dev.db \
  -v piligrim_api_data:/data ghcr.io/drobotenko-netizen/piligrim/piligrim-api:v2025.01.10-XX

docker run -d --name web --network infra_default --restart unless-stopped \
  -e NODE_ENV=production -e PORT=3000 -e NEXT_PUBLIC_API_BASE=https://piligrim.5-star-roi.ru \
  ghcr.io/drobotenko-netizen/piligrim/piligrim-web:v2025.01.10-XX

# Подключить к сети proxy для Caddy
docker network connect proxy api
docker network connect proxy web

# Проверить статус
docker ps
curl https://piligrim.5-star-roi.ru/api/health
```

## 🔧 Информация о сервере

### SSH подключение
- **Хост**: `yc-vm` (алиас в ~/.ssh/config)
- **IP**: `51.250.41.78`
- **Пользователь**: `yc-user`
- **SSH ключ**: `~/.ssh/id_ed25519`

### Структура на сервере
- **Приложение**: `/srv/piligrim/app/`
- **Caddy**: `/opt/infra/caddy/`
- **Docker сети**: `infra_default` (основная), `proxy` (для Caddy)

### Контейнеры
- **API**: `api` (порт 4000)
- **Web**: `web` (порт 3000)
- **Caddy**: `caddy` (порты 80, 443)

## 🌐 URL приложения
- **Frontend**: https://piligrim.5-star-roi.ru/
- **API**: https://piligrim.5-star-roi.ru/api/health

## 📊 Проверка статуса
```bash
# Локальная проверка
./check_server_version.sh

# Проверка на сервере
ssh yc-vm "docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}'"
ssh yc-vm "curl -s https://piligrim.5-star-roi.ru/api/health"
```

## 🐛 Troubleshooting

### Если контейнеры не запускаются
```bash
# Проверить логи
ssh yc-vm "docker logs api"
ssh yc-vm "docker logs web"

# Проверить сети
ssh yc-vm "docker network ls"
ssh yc-vm "docker network inspect infra_default"
```

### Если приложение недоступно
```bash
# Проверить Caddy
ssh yc-vm "docker logs caddy"

# Проверить конфигурацию Caddy
ssh yc-vm "docker exec caddy cat /etc/caddy/Caddyfile"
```

## 📝 История версий
- **v2025.01.10-01**: Исправления 401 ошибок, добавлен credentials: 'include'
- **v2025.01.10-02**: Попытка исправить GitHub Actions (неудачно)
- **v2025.01.10-03**: Упрощение workflow (неудачно)
- **v2025.01.10-04**: Обновление GitHub Secrets (неудачно)
- **v2025.01.10-05**: Улучшение обработки ошибок (неудачно)

## ⚠️ Важные заметки
1. **Автодеплой не работает** - используем только ручной деплой
2. **GitHub Actions** собирает образы успешно, но деплой застревает
3. **Ручной деплой** работает быстро и надежно
4. **Всегда проверяем** статус после деплоя
5. **Образы хранятся** в GitHub Container Registry (GHCR)

## 🔄 Типичный workflow
1. Вносим изменения в код
2. Коммитим и пушим в main
3. Создаем тег v2025.01.10-XX
4. Ждем сборки образов в GitHub Actions
5. Выполняем ручной деплой на сервер
6. Проверяем работоспособность

---
*Документ создан: 2025-01-10*
*Последнее обновление: 2025-01-10*
