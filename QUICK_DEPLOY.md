# ⚡ Быстрый деплой Piligrim

## 🚀 Команды для деплоя

### 1. Создать тег и запустить сборку
```bash
git tag v2025.01.10-XX
git push origin v2025.01.10-XX
```

### 2. Автоматический деплой
```bash
./deploy.sh v2025.01.10-XX
```

### 3. Проверить статус
```bash
./check_server_version.sh
```

## 🔧 Ручной деплой (если скрипт не работает)
```bash
ssh yc-vm
docker pull ghcr.io/drobotenko-netizen/piligrim/piligrim-web:v2025.01.10-XX
docker pull ghcr.io/drobotenko-netizen/piligrim/piligrim-api:v2025.01.10-XX
docker stop api web && docker rm api web
docker run -d --name api --network infra_default --restart unless-stopped -e PORT=4000 -e NODE_ENV=production -e DATABASE_URL=file:/data/dev.db -v piligrim_api_data:/data ghcr.io/drobotenko-netizen/piligrim/piligrim-api:v2025.01.10-XX
docker run -d --name web --network infra_default --restart unless-stopped -e NODE_ENV=production -e PORT=3000 -e NEXT_PUBLIC_API_BASE=https://piligrim.5-star-roi.ru ghcr.io/drobotenko-netizen/piligrim/piligrim-web:v2025.01.10-XX
docker network connect proxy api && docker network connect proxy web
```

## 📊 Проверка
- **Frontend**: https://piligrim.5-star-roi.ru/
- **API**: https://piligrim.5-star-roi.ru/api/health

## ⚠️ Важно
- Автодеплой не работает - используем только ручной
- GitHub Actions собирает образы успешно
- SSH: `yc-vm` (51.250.41.78, yc-user)
