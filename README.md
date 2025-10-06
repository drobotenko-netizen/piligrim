# 🏛️ Piligrim - Система управления рестораном

## 🚀 Быстрый деплой

### Автоматический деплой
```bash
# 1. Создать тег
git tag v2025.01.10-XX
git push origin v2025.01.10-XX

# 2. Запустить деплой
./deploy.sh v2025.01.10-XX
```

### Проверка статуса
```bash
./check_server_version.sh
```

## 📚 Документация по деплою
- [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) - Подробное руководство
- [QUICK_DEPLOY.md](QUICK_DEPLOY.md) - Быстрые команды
- [DEPLOY_INSTRUCTIONS.md](DEPLOY_INSTRUCTIONS.md) - Инструкции для мониторинга

## 🌐 Приложение
- **Frontend**: https://piligrim.5-star-roi.ru/
- **API**: https://piligrim.5-star-roi.ru/api/health

## ⚠️ Важные заметки
- **Автодеплой не работает** - используем только ручной деплой
- **GitHub Actions** собирает образы успешно, но деплой застревает
- **SSH**: `yc-vm` (51.250.41.78, yc-user)
- **Образы**: GitHub Container Registry (GHCR)

## 🔧 Техническая информация
- **Frontend**: Next.js 14
- **Backend**: Express.js + Prisma
- **Database**: SQLite
- **Proxy**: Caddy
- **Deployment**: Docker + Docker Compose

## 📝 История версий
- **v2025.01.10-01**: Исправления 401 ошибок, добавлен credentials: 'include'
- **v2025.01.10-02-05**: Попытки исправить автодеплой (неудачно)

---
*Последнее обновление: 2025-01-10*
