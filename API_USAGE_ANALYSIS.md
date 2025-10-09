# Детальный анализ использования API

## 📊 Карта использования API endpoints

### Серверные endpoints и их использование клиентом

#### Финансовые модули

| Endpoint | Методы | Используется в | Частота |
|----------|--------|---------------|---------|
| `/api/transactions` | GET, POST, PATCH, DELETE, POST /clear, POST /load-from-gsheets | `TransactionsClient.tsx` | Высокая |
| `/api/payments` | GET, POST, PATCH, DELETE | `PaymentsClient.tsx` | Высокая |
| `/api/categories` | GET, POST, PATCH, DELETE | `CategoriesClient.tsx` | Высокая |
| `/api/expense-docs` | GET, POST, PATCH, DELETE | `ExpenseDocsClient.tsx` | Высокая |
| `/api/accounts` | GET, POST, PATCH | `AccountsClient.tsx` | Средняя |
| `/api/balances` | GET | `BalancesClient.tsx` | Низкая |
| `/api/reports/cashflow` | GET | `CashflowClient.tsx` | Средняя |
| `/api/reports/pnl` | GET | `PnlClient.tsx` | Средняя |
| `/api/reports/aging` | GET | `AgingClient.tsx` | Низкая |
| `/api/counterparties` | GET, POST, PATCH, DELETE | `CounterpartiesClient.tsx` | Средняя |
| `/api/counterparty-types` | GET, POST, PATCH, DELETE | `CounterpartyTypesClient.tsx` | Низкая |
| `/api/channels` | GET, POST, PATCH, DELETE | - | Низкая |
| `/api/tender-types` | GET, POST, PATCH, DELETE | - | Низкая |

#### HR модули

| Endpoint | Методы | Используется в | Частота |
|----------|--------|---------------|---------|
| `/api/employees` | GET, POST, PATCH | `EmployeesClient.tsx`, `TimesheetsClient.tsx`, `PayrollClient.tsx` | Высокая |
| `/api/positions` | GET, POST, PATCH, GET /rates, POST /rates | `PositionsClient.tsx`, `EmployeesClient.tsx` | Высокая |
| `/api/timesheets` | GET, POST, PATCH | `TimesheetsClient.tsx` | Высокая |
| `/api/payroll` | GET, POST | `PayrollClient.tsx` | Средняя |
| `/api/adjustments` | GET, POST, PATCH, DELETE | `AdjustmentsClient.tsx` | Средняя |
| `/api/payouts` | GET, POST, PATCH | `PayoutsClient.tsx` | Средняя |
| `/api/shifts` | GET, POST, PATCH, DELETE, POST /import-from-iiko | `ShiftsClient.tsx` | Средняя |

#### Закупки

| Endpoint | Методы | Используется в | Частота |
|----------|--------|---------------|---------|
| `/api/purchasing/orders` | GET, POST, PATCH, DELETE | `PurchasingClient.tsx` | Высокая |
| `/api/purchasing/buffers` | GET, POST, PATCH, DELETE | `PurchasingClient.tsx` | Высокая |
| `/api/purchasing/suppliers` | GET, POST, PATCH, DELETE | `PurchasingClient.tsx`, `SuppliersClient.tsx` | Высокая |
| `/api/purchasing/products` | GET | `PurchasingClient.tsx`, `DishesClient.tsx` | Высокая |
| `/api/purchasing/stock` | GET | `PurchasingClient.tsx` | Средняя |
| `/api/purchasing/calculate` | POST | `PurchasingClient.tsx` | Средняя |
| `/api/purchasing/settings` | GET, POST | `PurchasingSettingsClient.tsx` | Низкая |
| `/api/purchasing/buffer/chart` | GET | `BufferChartDialog.tsx` | Низкая |

#### iiko интеграция

| Endpoint | Методы | Используется в | Частота |
|----------|--------|---------------|---------|
| `/api/iiko/sales/summary` | GET | `SummaryClient.tsx` | Высокая |
| `/api/iiko/sales/hours` | GET | `HoursClient.tsx` | Средняя |
| `/api/iiko/sales/revenue` | GET | `RevenueClient.tsx` | Высокая |
| `/api/iiko/sales/paytypes` | GET | `PaytypesClient.tsx` | Средняя |
| `/api/iiko/sales/receipts` | GET | `ReceiptsClient.tsx` | Средняя |
| `/api/iiko/sales/returns/month` | GET | `ReturnsClient.tsx` | Низкая |
| `/api/iiko/sales/deleted/month` | GET | - | Низкая |
| `/api/iiko/sales/total/month` | GET | `RevenueClient.tsx` | Средняя |
| `/api/iiko/stores/balances` | GET | `BalancesClient.tsx` | Средняя |
| `/api/iiko/stores/consumption` | GET | `ConsumptionClient.tsx` | Низкая |
| `/api/iiko/recipes` | GET | `RecipesClient.tsx` | Средняя |
| `/api/iiko/entities/products` | GET | `DishesClient.tsx` | Высокая |
| `/api/iiko/entities/suppliers` | GET | `SuppliersClient.tsx`, `CustomersClient.tsx` | Средняя |
| `/api/iiko/import/receipts` | POST | `ImportClient.tsx` | Низкая |
| `/api/iiko/local/*` | GET | Различные | Средняя |

#### Аутентификация и админка

| Endpoint | Методы | Используется в | Частота |
|----------|--------|---------------|---------|
| `/api/auth/magic/callback` | GET | Magic link auth | Средняя |
| `/api/auth/magic/verify` | POST | Magic link auth | Средняя |
| `/api/auth/dev-login` | POST | Dev режим | Низкая |
| `/api/admin/users` | GET, POST, PATCH | `UsersClient.tsx` | Низкая |
| `/api/admin/roles` | GET, POST, PATCH | `RolesClient.tsx` | Низкая |
| `/api/admin/audit` | GET | `AuditClient.tsx` | Низкая |

#### GSheets интеграция

| Endpoint | Методы | Используется в | Частота |
|----------|--------|---------------|---------|
| `/api/gsheets/cashflow` | GET, POST | `CashflowClient.tsx` (gsheets) | Средняя |
| `/api/gsheets/import` | POST | - | Низкая |

---

## 🔍 Дублирование функциональности

### 1. **Duplicate endpoints: iiko API vs Local DB**

Многие iiko endpoints имеют дубли с префиксом `/local`:

```
/api/iiko/sales/summary        → получает из iiko API
/api/iiko/local/sales/summary  → получает из локальной БД
```

**Найдено дублей:**
- `sales/summary` (iiko + local)
- `sales/paytypes` (iiko + local)
- `sales/deleted/summary` (только local)

**Проблема:** Клиент должен знать, откуда брать данные

**Решение:** 
Унифицировать в один endpoint с параметром `source=iiko|local`:
```typescript
GET /api/iiko/sales/summary?date=2025-01-01&source=local
```

### 2. **Похожая CRUD логика**

Следующие модули имеют практически идентичную CRUD структуру:

**Простой CRUD (только list, create, update, delete):**
- `employees`
- `positions`
- `counterparties`
- `counterparty-types`
- `channels`
- `tender-types`

**CRUD + специфичная логика:**
- `accounts` (+ балансы)
- `categories` (+ иерархия, перенос)
- `payments` (+ аллокации)
- `expense-docs` (+ связи с payments)

**Возможность:** Использовать базовый CRUD контроллер для простых сущностей

### 3. **Повторяющиеся query параметры**

Многие endpoints используют одинаковые параметры:

**Date range:**
```typescript
?from=YYYY-MM-DD&to=YYYY-MM-DD
```
Используется в: `transactions`, `payments`, `expense-docs`, `reports`

**Year + Month:**
```typescript
?year=YYYY&month=MM
```
Используется в: `timesheets`, `payroll`, `iiko/sales/*`, `positions/rates`

**Single date:**
```typescript
?date=YYYY-MM-DD
```
Используется в: `iiko/sales/summary`, `iiko/sales/hours`, `shifts`

**Решение:** Создать общие валидаторы (уже предложено в основном отчете)

---

## 📈 Анализ частоты вызовов

### Самые частые API вызовы (по количеству в коде)

```
/api/employees          - ~25 вызовов
/api/positions          - ~20 вызовов
/api/purchasing/*       - ~45 вызовов
/api/iiko/*             - ~60 вызовов
/api/transactions       - ~15 вызовов
/api/payments           - ~18 вызовов
/api/categories         - ~22 вызова
```

### Тяжелые endpoints (требуют оптимизации)

1. **`/api/transactions/load-from-gsheets`**
   - Обрабатывает большие объемы данных
   - Нет прогресс-бара на клиенте
   - **Решение:** WebSocket для отслеживания прогресса

2. **`/api/iiko/import/receipts`**
   - ETL процесс, долгая операция
   - Блокирует UI
   - **Решение:** Background job + polling статуса

3. **`/api/purchasing/calculate`**
   - Сложные вычисления
   - Может быть медленным при большом количестве товаров
   - **Решение:** Кеширование результатов

4. **`/api/reports/cashflow`**
   - Агрегация больших данных
   - Медленно для больших периодов
   - **Решение:** Пагинация + кеширование

---

## 🎯 Recommendations: API Design

### 1. RESTful консистентность

Сейчас есть несколько паттернов:

**Хорошо (RESTful):**
```
GET    /api/employees
POST   /api/employees
PATCH  /api/employees/:id
DELETE /api/employees/:id
```

**Плохо (не RESTful):**
```
POST /api/transactions/clear          → DELETE /api/transactions
POST /api/transactions/load-from-gsheets → POST /api/transactions/import
POST /api/shifts/import-from-iiko     → POST /api/shifts/import
```

**Рекомендация:** Привести к единому RESTful стилю

### 2. Версионирование API

Сейчас нет версионирования. При больших изменениях это может сломать клиентов.

**Рекомендация:**
```
/api/v1/employees
/api/v2/employees  (при breaking changes)
```

### 3. Pagination

Многие list endpoints не имеют пагинации:
- `/api/employees` - возвращает всех
- `/api/transactions` - может быть очень большой
- `/api/iiko/sales/receipts` - тысячи записей

**Рекомендация:** Добавить пагинацию:
```typescript
GET /api/employees?page=1&limit=50
Response: {
  data: [...],
  meta: {
    page: 1,
    limit: 50,
    total: 150,
    totalPages: 3
  }
}
```

### 4. Фильтрация и сортировка

Унифицировать параметры фильтрации:
```typescript
// Фильтры
GET /api/employees?active=true&department=KITCHEN

// Сортировка
GET /api/employees?sort=fullName&order=asc

// Поиск
GET /api/employees?search=Иван
```

### 5. Batch операции

Для операций с множественными записями:
```typescript
// Вместо множества вызовов DELETE
DELETE /api/employees/id1
DELETE /api/employees/id2
DELETE /api/employees/id3

// Сделать batch endpoint
DELETE /api/employees/batch
Body: { ids: ['id1', 'id2', 'id3'] }
```

---

## 🔄 Предложения по рефакторингу API структуры

### Новая структура модулей

```
server/src/
├── modules/
│   ├── finance/              # Объединить финансовые модули
│   │   ├── transactions/
│   │   ├── payments/
│   │   ├── categories/
│   │   ├── accounts/
│   │   ├── balances/
│   │   ├── expense-docs/
│   │   └── reports/
│   ├── hr/                   # Объединить HR модули
│   │   ├── employees/
│   │   ├── positions/
│   │   ├── timesheets/
│   │   ├── payroll/
│   │   ├── adjustments/
│   │   ├── payouts/
│   │   └── shifts/
│   ├── purchasing/           # Уже существует
│   │   ├── orders/
│   │   ├── products/
│   │   ├── suppliers/
│   │   ├── buffers/
│   │   └── stock/
│   ├── sales/                # Переименовать iiko
│   │   ├── integration/      # iiko API клиент
│   │   ├── receipts/
│   │   ├── revenue/
│   │   ├── summary/
│   │   ├── dishes/
│   │   ├── customers/
│   │   └── suppliers/
│   ├── admin/
│   │   ├── users/
│   │   ├── roles/
│   │   └── audit/
│   └── auth/
│       ├── magic-link/
│       └── telegram/
├── services/                 # Бизнес-логика
│   ├── payment-allocation.service.ts
│   ├── gsheets-import.service.ts
│   ├── iiko-etl.service.ts
│   ├── order-calculation.service.ts
│   └── report-generator.service.ts
├── utils/
│   ├── common-middleware.ts  # Новый
│   ├── crud-service.ts       # Новый
│   ├── validators.ts         # Новый
│   ├── tenant.ts
│   ├── auth.ts
│   └── prisma-audit-mw.ts
└── types/                    # Общие типы
    ├── finance.types.ts
    ├── hr.types.ts
    ├── purchasing.types.ts
    └── sales.types.ts
```

---

## 📋 Action Items

### Высокий приоритет

- [ ] Создать `utils/common-middleware.ts` с asyncHandler, validateDate, validateYearMonth
- [ ] Применить middleware к 5 самым частым endpoints
- [ ] Добавить пагинацию к `/api/employees`, `/api/transactions`
- [ ] Унифицировать `/api/iiko/*` и `/api/iiko/local/*` endpoints

### Средний приоритет

- [ ] Создать `services/` слой для тяжелой бизнес-логики
- [ ] Добавить версионирование API (v1)
- [ ] Рефакторинг не-RESTful endpoints
- [ ] Добавить batch операции для удаления/обновления

### Низкий приоритет

- [ ] Реорганизовать структуру modules/ по доменам
- [ ] Создать общие типы в `types/`
- [ ] Добавить OpenAPI/Swagger документацию
- [ ] Настроить rate limiting

---

## 📊 Метрики использования (для мониторинга)

После внедрения рекомендаций, отслеживать:

1. **Response time:**
   - Среднее время ответа API
   - P95, P99 метрики
   - Самые медленные endpoints

2. **Error rate:**
   - 4xx ошибки (клиентские)
   - 5xx ошибки (серверные)
   - По каждому endpoint

3. **Throughput:**
   - Запросов в секунду
   - По endpoint
   - По пользователю

4. **Cache hit rate:**
   - После внедрения кеширования
   - Для reports и iiko endpoints

**Инструменты:**
- Application monitoring: New Relic / DataDog
- Logging: Winston + ELK stack
- Metrics: Prometheus + Grafana

