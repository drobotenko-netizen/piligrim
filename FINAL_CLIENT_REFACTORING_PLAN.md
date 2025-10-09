# 📋 ФИНАЛЬНЫЙ ПЛАН: ОБНОВЛЕНИЕ ВСЕХ КЛИЕНТСКИХ КОМПОНЕНТОВ

## 🎯 Цель: Применить хуки useApi/useCrud ко всем 32 компонентам

### ✅ Сделано (2/32):
1. RolesClient.tsx → useCrud
2. PaytypesClient.tsx → useApi

### 🔄 План работы (30/32):

**Этап 1: Средние компоненты (5 шт)**
3. UsersClient.tsx (198 строк) → useCrud + api.post
4. AuditClient.tsx (209 строк) → useApi
5. PurchasingSettingsClient.tsx (152) → useApi + api.patch
6. SummaryClient.tsx (188) → useApi
7. ReceiptsClient.tsx (226) → useApi

**Этап 2: Большие компоненты (6 шт)**
8. CustomersClient.tsx (352) → useCrud
9. RevenueClient.tsx (383) → useApi
10. CashflowClient.tsx (386) → useApi
11. HoursClient.tsx (461) → useApi (сложная таблица)
12. SuppliersClient.tsx (666) → useCrud
13. DishesClient.tsx (639) → useCrud

**Этап 3: Остальные (19 шт)**
14-32. Все оставшиеся компоненты

---

## ⏱️ Оценка времени:
- Средние (5): ~30 мин
- Большие (6): ~60 мин
- Остальные (19): ~60 мин
- **Итого: ~2.5 часа**

## 🚀 НАЧИНАЮ РАБОТУ!
