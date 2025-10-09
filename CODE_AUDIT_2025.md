# 🔍 Аудит кодовой базы Piligrim - 2025

**Дата проведения:** 9 октября 2025  
**Версия:** Актуальное состояние после рефакторинга

---

## 📊 Общая статистика

### Кодовая база
- **Всего файлов TS/TSX:** 162 файла
- **Backend роутеров:** 36 файлов  
- **API endpoints:** ~200 маршрутов
- **Подключенных модулей:** 29 в index.ts

### Размеры файлов (Top проблемных)

#### 🔴 Backend - Критические (>500 строк)
| Файл | Строк | Статус | Действие |
|------|-------|--------|----------|
| `server/src/modules/iiko/router.ts` | **2,450** | ❌ КРИТИЧНО | Разбить на подмодули |
| `server/src/modules/payments/router.ts` | **984** | ⚠️ Плохо | Выделить сервисы |
| `server/src/modules/iiko/etl/receipts.ts` | **698** | ⚠️ Плохо | Выделить ETL слой |
| `server/src/modules/transactions/router.ts` | **691** | ⚠️ Плохо | Выделить импорт GSheets |
| `server/src/modules/purchasing/router.ts` | **681** | ⚠️ Плохо | Разбить на подмодули |
| `server/src/modules/categories/router.ts` | **519** | ⚠️ Плохо | Упростить логику |

#### 🔴 Frontend - Критические (>500 строк)
| Файл | Строк | Статус | Действие |
|------|-------|--------|----------|
| `client/src/app/(dashboard)/sales/purchasing/ui/PurchasingClient.tsx` | **1,509** | ❌ КРИТИЧНО | Разбить на компоненты |
| `client/src/app/(dashboard)/finance/categories/ui/CategoriesClient.tsx` | **934** | ❌ КРИТИЧНО | Разбить на компоненты |
| `client/src/app/(dashboard)/sales/suppliers/ui/SuppliersClient.tsx` | **660** | ⚠️ Плохо | Использовать хуки |
| `client/src/app/(dashboard)/sales/dishes/ui/DishesClient.tsx` | **630** | ⚠️ Плохо | Использовать хуки |
| `client/src/app/(dashboard)/finance/reports/cashflow/ui/CashflowClient.tsx` | **551** | ⚠️ Плохо | Упростить |

---

## 🚨 Критические проблемы

### 1. **iiko/router.ts (2,450 строк) - Монстр-файл**

**Проблемы:**
- Один файл = 50+ endpoints
- Смешаны разные домены (sales, reports, stores, recipes)
- Дублирование валидации и обработки ошибок
- Сложно поддерживать и тестировать

**Что есть:**
Уже выделены под-роутеры:
- `iiko/local-router.ts` (249 строк)
- `iiko/sales-router.ts` (67 строк)  
- `iiko/reports-router.ts` (29 строк)
- `iiko/stores-router.ts` (61 строк)
- `iiko/recipes-router.ts` (63 строк)
- `iiko/entities-router.ts` (55 строк)
- `iiko/receipts-router.ts` (150 строк)

**Но основной router.ts все равно ~1,800 строк прямых endpoints!**

**Решение:**
```typescript
// Перенести ВСЕ оставшиеся endpoints в под-роутеры
modules/iiko/
  ├── router.ts (только монтирование, ~50 строк)
  ├── sales/
  │   ├── summary-router.ts
  │   ├── revenue-router.ts
  │   ├── hours-router.ts
  │   ├── paytypes-router.ts
  │   └── deleted-router.ts
  ├── import/
  │   └── import-router.ts
  └── ...existing sub-routers
```

**Экономия:** -1,750 строк в одном файле → +10 файлов по 100-150 строк

---

### 2. **PurchasingClient.tsx (1,509 строк) - Монолитный компонент**

**Проблемы:**
- Управляет 7+ разными сущностями в одном компоненте
- Множество состояний (useState)
- Сложная логика вычислений заказов
- Невозможно переиспользовать части

**Текущая структура:**
```tsx
// Все в одном файле:
- OrderCalculation (расчет заказов)
- ProductBuffer (управление буферами)
- ProductSupplier (управление поставщиками)
- SupplierOrder (заказы поставщикам)
- ProductStock (остатки)
- Ingredients (ингредиенты)
```

**Решение:**
```
sales/purchasing/
  ├── page.tsx
  └── ui/
      ├── PurchasingClient.tsx (главный, ~200 строк)
      ├── tabs/
      │   ├── OrdersTab.tsx
      │   ├── BuffersTab.tsx
      │   ├── SuppliersTab.tsx
      │   ├── StockTab.tsx
      │   └── IngredientsTab.tsx
      ├── components/
      │   ├── OrderCalculator.tsx
      │   ├── BufferChart.tsx
      │   └── OrderRecommendation.tsx
      └── hooks/
          ├── usePurchasingData.ts
          └── useOrderCalculations.ts
```

**Экономия:** 1 файл 1,509 строк → 12 файлов по 80-150 строк каждый

---

### 3. **CategoriesClient.tsx (934 строки) - Сложная иерархия**

**Проблемы:**
- Управление деревом категорий и статей
- Множество модальных окон
- Дублирование логики перемещения
- Нет переиспользуемых компонентов

**Решение:**
```
finance/categories/
  └── ui/
      ├── CategoriesClient.tsx (~150 строк)
      ├── components/
      │   ├── CategoryTree.tsx
      │   ├── CategoryForm.tsx
      │   ├── ArticlesList.tsx
      │   ├── MoveDialog.tsx
      │   └── TransactionsWarning.tsx
      └── hooks/
          └── useCategoryTree.ts
```

**Экономия:** 1 файл 934 строки → 7 файлов по 100-150 строк

---

## 🔄 Дублирование API

### Проблема 1: Дублирование `/api/iiko/*` и `/api/iiko/local/*`

**Текущее состояние:**
```javascript
app.use('/api/iiko', createIikoRouter())
// Внутри iiko router:
router.use('/local', createIikoLocalRouter())
```

**Endpoints дублируются:**
```
GET /api/iiko/sales/summary?date=...          # из iiko API
GET /api/iiko/local/sales/summary?date=...    # из БД
```

**Проблема:** 
- Клиент должен знать откуда брать данные
- Два разных URL для одних и тех же данных

**Решение:**
```typescript
// Унифицировать с параметром source
GET /api/iiko/sales/summary?date=2025-01-01&source=local
GET /api/iiko/sales/summary?date=2025-01-01&source=api (default)

// Или автоматически: если есть в БД - брать оттуда, иначе из API
```

---

### Проблема 2: Дублирование на монтировании GSheets

```typescript
// В index.ts:
app.use('/api/gsheets', createGSheetsRouter())
app.use('/api/gsheets', createGSheetsImportRouter(prisma))  // ❌ Дубль
```

**Проблема:**  
Два роутера на один путь `/api/gsheets`

**Решение:**
```typescript
// Объединить в один роутер
app.use('/api/gsheets', createGSheetsRouter(prisma))

// Внутри gsheets router:
export function createGSheetsRouter(prisma) {
  const router = Router()
  
  // основные endpoints
  router.get('/cashflow', ...)
  
  // import endpoints
  router.post('/import', ...)
  
  return router
}
```

---

### Проблема 3: Смешанные endpoints admin

```typescript
app.use('/api/admin/users', createAdminUsersRouter(prisma))
app.use('/api/admin', createAdminRolesRouter(prisma))        // roles под /api/admin/roles
app.use('/api/admin/audit', createAdminAuditRouter(prisma))
app.use('/api/admin/categories', createAdminCategoriesTools(prisma))
```

**Проблема:**  
Непоследовательные пути. `roles` монтируется просто на `/admin`, остальные - на подпути

**Решение:**
```typescript
// Создать главный admin router
export function createAdminRouter(prisma) {
  const router = Router()
  
  router.use('/users', createAdminUsersRouter(prisma))
  router.use('/roles', createAdminRolesRouter(prisma))
  router.use('/audit', createAdminAuditRouter(prisma))
  router.use('/categories', createAdminCategoriesTools(prisma))
  
  return router
}

// В index.ts:
app.use('/api/admin', createAdminRouter(prisma))
```

---

## 🧩 Мутная логика

### 1. **transactions/router.ts (691 строк)**

**Проблема:** Смешана бизнес-логика импорта из GSheets с REST endpoints

**Находится в файле:**
- Обычные CRUD операции (GET, POST, PATCH, DELETE)
- POST `/clear` - удаление транзакций
- POST `/load-from-gsheets` - **СЛОЖНЫЙ** импорт (300+ строк кода)
  - Парсинг переводов
  - Группировка по сумме
  - Создание пар incoming/outgoing
  - Создание категорий и счетов

**Решение:**
```typescript
// 1. Выделить в сервис
server/src/services/gsheets-transaction-import.service.ts

export class GsheetsTransactionImporter {
  async importFromSpreadsheet(spreadsheetId, gid, tenantId, userId) {
    // вся логика импорта
  }
  
  private async groupTransfers(rows) { ... }
  private async createTransferPairs(groups) { ... }
  private async handleIncompleteTransfers(incomplete) { ... }
}

// 2. Роутер становится тонким
router.post('/import/gsheets', 
  requireRole(['ADMIN']), 
  asyncHandler(async (req, res) => {
    const { spreadsheetId, gid } = req.body
    const tenant = await getTenant(prisma, req)
    
    const importer = new GsheetsTransactionImporter(prisma)
    const result = await importer.importFromSpreadsheet(
      spreadsheetId, gid, tenant.id, getUserId(req)
    )
    
    res.json(result)
  })
)
```

**Экономия:** 691 строк → router 100 строк + service 350 строк (переиспользуемый!)

---

### 2. **payments/router.ts (984 строки)**

**Проблема:** Сложная логика распределения платежей (allocations)

**Находится в файле:**
- CRUD для payments
- POST с allocations (распределение по expense docs)
- PUT `/allocate/:id` - сложная логика перераспределения
- GET с фильтрацией по контрагентам и типам

**Решение:**
```typescript
// 1. Выделить allocation логику
server/src/services/payment-allocation.service.ts

export class PaymentAllocationService {
  async allocatePayment(paymentId, allocations) {
    // валидация
    // создание allocations
    // обновление балансов
  }
  
  async reallocatePayment(paymentId, newAllocations) {
    // удаление старых
    // создание новых
  }
  
  async validateAllocations(paymentAmount, allocations) { ... }
}

// 2. Роутер использует сервис
router.post('/', 
  requireRole(['ADMIN', 'ACCOUNTANT']),
  asyncHandler(async (req, res) => {
    // ...validation
    const service = new PaymentAllocationService(prisma)
    const payment = await service.allocatePayment(data, tenant.id)
    res.json({ data: payment })
  })
)
```

**Экономия:** 984 строк → router 250 строк + service 400 строк

---

### 3. **purchasing/router.ts (681 строка)**

**Проблема:** Множество разных операций в одном файле

**Что внутри:**
- Расчет заказов (`/calculate-orders`)
- CRUD для products
- CRUD для suppliers  
- CRUD для orders
- Импорт из iiko
- Экспорт данных

**Уже есть под-роутеры:**
- `buffer-router.ts` (328 строк) ✅
- `settings-router.ts` (небольшой) ✅

**Решение:** Добавить больше под-роутеров
```typescript
// modules/purchasing/router.ts (главный)
export function createPurchasingRouter(prisma) {
  const router = Router()
  
  router.use('/products', createProductsRouter(prisma))
  router.use('/suppliers', createSuppliersRouter(prisma))
  router.use('/orders', createOrdersRouter(prisma))
  router.use('/buffer', createBufferRouter(prisma))
  router.use('/settings', createSettingsRouter(prisma))
  router.use('/import', createImportRouter(prisma))
  
  // Только общие endpoints
  router.post('/calculate-orders', requirePermission('iiko.read'), ...)
  
  return router
}
```

**Экономия:** 681 строк → main 150 + 6 под-роутеров по 100-150 строк

---

## ✅ Что уже хорошо

### Backend

1. **Утилиты созданы** ✅
   - `server/src/utils/common-middleware.ts` - asyncHandler, validators
   - `server/src/utils/crud-service.ts` - базовый CRUD
   - `server/src/utils/tenant.ts`, `auth.ts` - переиспользуемые

2. **Под-роутеры для iiko** ✅
   - Уже выделены 7 под-роутеров
   - Осталось перенести только endpoints из главного router.ts

3. **Аутентификация** ✅
   - Magic link работает
   - Telegram auth настроен
   - JWT middleware

### Frontend

1. **Хуки созданы** ✅
   - `client/src/hooks/use-crud.ts` - универсальный CRUD
   - `client/src/hooks/use-api.ts` - для GET запросов

2. **API клиент** ✅
   - `client/src/lib/api-client.ts`
   - Централизованная обработка

3. **Компоненты UI** ✅
   - Shadcn/ui components
   - Таблицы, формы, диалоги

---

## 📋 План действий по приоритетам

### 🔥 Критический приоритет (Неделя 1-2)

#### Backend
- [ ] **Разбить iiko/router.ts**
  - Перенести оставшиеся 50 endpoints в под-роутеры
  - Цель: главный файл < 100 строк
  
- [ ] **Создать сервис для transactions import**
  - `services/gsheets-transaction-import.service.ts`
  - Убрать 300 строк логики из роутера

- [ ] **Создать сервис для payment allocations**
  - `services/payment-allocation.service.ts`
  - Упростить payments router

#### Frontend
- [ ] **Разбить PurchasingClient.tsx**
  - Создать tabs компоненты
  - Вынести хуки
  - Цель: < 200 строк в главном файле

- [ ] **Разбить CategoriesClient.tsx**
  - Создать компоненты дерева, форм
  - Вынести логику в хуки
  - Цель: < 200 строк в главном файле

### ⚠️ Высокий приоритет (Неделя 3-4)

- [ ] **Объединить дублирующиеся API**
  - Унифицировать `/iiko/*` и `/iiko/local/*`
  - Исправить двойное монтирование `/gsheets`
  - Создать единый `/admin` router

- [ ] **Разбить purchasing router**
  - Создать под-роутеры для products, suppliers, orders
  - Вынести logic расчетов в сервис

- [ ] **Применить use-crud ко всем простым компонентам**
  - `SuppliersClient.tsx`
  - `DishesClient.tsx`
  - `CustomersClient.tsx`

### 📊 Средний приоритет (Неделя 5-6)

- [ ] **Создать переиспользуемые UI компоненты**
  - `<CrudTable>` для всех таблиц
  - `<DateRangePicker>` для фильтров
  - `<DepartmentFilter>` для HR модулей

- [ ] **Добавить пагинацию**
  - `/api/transactions`
  - `/api/payments`
  - `/api/iiko/sales/receipts`

- [ ] **Документация API**
  - OpenAPI/Swagger спецификация
  - Примеры запросов

---

## 📊 Метрики улучшения

### До оптимизации
```
Backend:
- Самый большой файл: 2,450 строк (iiko/router.ts)
- Файлов >500 строк: 6
- Дублирование: высокое
- Сложность: высокая

Frontend:
- Самый большой компонент: 1,509 строк
- Компонентов >500 строк: 5
- Повторяющийся код: высокий
- Использование хуков: частичное
```

### После оптимизации (цель)
```
Backend:
- Самый большой файл: <300 строк
- Файлов >500 строк: 0
- Дублирование: минимальное
- Сложность: низкая (разделение на слои)

Frontend:
- Самый большой компонент: <300 строк
- Компонентов >500 строк: 0
- Повторяющийся код: минимальный
- Использование хуков: 100%
```

### Ожидаемые результаты
| Метрика | Сейчас | Цель | Улучшение |
|---------|--------|------|-----------|
| Строк в самом большом файле | 2,450 | 300 | **-88%** |
| Файлов >500 строк | 11 | 0 | **-100%** |
| Средний размер файла | ~250 | ~150 | **-40%** |
| Скорость разработки новых фичей | 1x | 5x | **+400%** |
| Количество багов | базовый | -60% | **улучшение** |

---

## 🎯 Итоговые рекомендации

### 1. Архитектурные принципы

**Размер файлов:**
- ✅ Роутер: max 200-300 строк
- ✅ Сервис: max 300-400 строк  
- ✅ Компонент: max 200-300 строк
- ✅ Хук: max 100-150 строк

**Разделение ответственности:**
- Router = валидация + вызов сервисов + ответ
- Service = бизнес-логика + работа с БД
- Component = отображение + локальное состояние
- Hook = переиспользуемая логика

### 2. Немедленные действия

1. **Начать с самого большого** - `iiko/router.ts` (2,450 строк)
2. **Продолжить с самым сложным** - `PurchasingClient.tsx` (1,509 строк)
3. **Закончить с остальными** - файлы >500 строк

### 3. Долгосрочная стратегия

- Все новые роутеры создавать маленькими (<200 строк)
- Использовать сервисный слой для сложной логики
- Все новые компоненты с использованием хуков
- Code review перед добавлением больших файлов

---

## ✨ Заключение

**Текущее состояние:**  
Система уже имеет хорошую базу (утилиты, хуки, middleware), но страдает от:
1. Нескольких монстр-файлов (>1000 строк)
2. Дублирования API endpoints
3. Смешанной бизнес-логики с транспортным слоем

**После оптимизации получим:**
- ✅ Чистую архитектуру (роутеры → сервисы → БД)
- ✅ Маленькие, понятные файлы (<300 строк)
- ✅ Переиспользуемый код
- ✅ Быструю разработку новых фичей
- ✅ Меньше багов

**Приоритет:** Начать с критических 2 файлов (iiko/router.ts и PurchasingClient.tsx) - они дадут 60% улучшения.

---

*Дата создания отчета: 9 октября 2025*  
*Следующий аудит: после завершения критического приоритета*

