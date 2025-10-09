# 🏛️ Piligrim - Система управления рестораном

## 🚀 Деплой

### GitHub Actions деплой (основной способ)
```bash
git add -A
git commit -m "Описание изменений"
git push origin main
```

**Процесс:** коммит → push → GitHub Actions → сборка образов → деплой на сервер

### Отслеживание деплоя
- Смотри статус в GitHub: `Actions` → `release`
- URL: https://github.com/drobotenko-netizen/piligrim/actions

### Проверка статуса
```bash
ssh yc-vm "docker compose -f /srv/piligrim/app/infra/docker-compose.yml ps"
```

## 📚 Документация
- [docs/deploy.md](docs/deploy.md) - Подробное руководство по деплою
- [docs/telegram-auth.md](docs/telegram-auth.md) - Система авторизации через Telegram

## 🌐 Приложение
- **Frontend**: https://piligrim.5-star-roi.ru/
- **API**: https://piligrim.5-star-roi.ru/api/health

## ⚠️ Важные заметки
- **Деплой**: Git-based через post-receive хук на сервере
- **SSH**: `yc-vm` (51.250.41.78, yc-user)
- **Авторизация**: Telegram бот `@piligrim_app_bot`

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
