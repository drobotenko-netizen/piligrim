# Полный аудит системы Piligrim

**Дата:** 9 октября 2025  
**Проанализировано:** Backend (Node.js/Express/Prisma) + Frontend (Next.js/React)

---

## 📊 Общая статистика

### Серверная часть (Backend)
- **Всего модулей:** 41 файл TypeScript
- **Общее количество строк:** ~10,525 строк кода
- **API endpoints:** ~201 роутов
- **Утилит:** getTenant (65 использований), requireRole (35 использований)

### Клиентская часть (Frontend)  
- **Клиентских компонентов:** 37 *Client.tsx файлов
- **Вызовов API:** 210+ fetch запросов
- **useState/useEffect:** 429+ использований хуков
- **Async функций:** 168+ асинхронных функций

---

## 🗂️ Структура серверных модулей

### Очень большие файлы (требуют рефакторинга)

| Файл | Строк | Проблема |
|------|-------|----------|
| `iiko/router.ts` | **2,450** | ❌ Монолитный роутер, множество эндпоинтов |
| `payments/router.ts` | **984** | ⚠️ Сложная логика распределения платежей |
| `iiko/etl/receipts.ts` | **698** | ⚠️ ETL логика смешана с бизнес-логикой |
| `transactions/router.ts` | **691** | ⚠️ Сложная логика импорта из GSheets |
| `purchasing/router.ts` | **681** | ⚠️ Множество различных операций |
| `categories/router.ts` | **519** | ⚠️ Работа с категориями и статьями |
| `reports/router.ts` | **502** | ⚠️ Множество различных отчетов |

### Средние файлы (приемлемо)

| Файл | Строк |
|------|-------|
| `admin/audit.ts` | 479 |
| `iiko/client.ts` | 427 |
| `purchasing/buffer-router.ts` | 347 |
| `iiko/local-router.ts` | 270 |
| `shifts/router.ts` | 243 |
| `auth/magic.ts` | 217 |
| `expense-docs/router.ts` | 201 |

### Малые файлы (хорошо структурированы)

| Файл | Строк |
|------|-------|
| `employees/router.ts` | 43 |
| `timesheets/router.ts` | 53 |
| `admin/roles.ts` | 59 |
| `positions/router.ts` | 112 |
| `accounts/router.ts` | 137 |

---

## 🎨 Структура клиентских компонентов

### Очень большие компоненты (требуют разбиения)

| Компонент | Строк | Проблема |
|-----------|-------|----------|
| `PurchasingClient.tsx` | **1,509** | ❌ Монолитный компонент закупок |
| `PurchasingClient.backup.tsx` | **1,273** | ❌ Backup файл (удалить!) |
| `CategoriesClient.tsx` | **934** | ❌ Сложное управление категориями |
| `SuppliersClient.tsx` | **666** | ⚠️ Управление поставщиками |
| `DishesClient.tsx` | **639** | ⚠️ Управление блюдами |
| `CashflowClient.tsx` | **553** | ⚠️ Отчет по движению денежных средств |
| `HoursClient.tsx` | **461** | ⚠️ Почасовая статистика |

### Средние компоненты

| Компонент | Строк |
|-----------|-------|
| `ExpenseDocsClient.tsx` | 410 |
| `PnlClient.tsx` | 406 |
| `RevenueClient.tsx` | 383 |
| `CustomersClient.tsx` | 352 |
| `BalancesClient.tsx` | 350 |
| `TransactionsClient.tsx` | 348 |
| `PaymentsClient.tsx` | 337 |

---

## 🔍 Анализ API endpoints

### Распределение по модулям

```
/api/iiko/*              - 50+ endpoints (iiko интеграция)
/api/payments/*          - 4 endpoints
/api/transactions/*      - 7 endpoints  
/api/categories/*        - 11 endpoints
/api/purchasing/*        - 14 endpoints
/api/reports/*           - 5 endpoints
/api/shifts/*            - 4 endpoints
/api/admin/*             - 6 endpoints
/api/auth/*              - 5 endpoints
/api/employees/*         - 3 endpoints
/api/positions/*         - 6 endpoints
/api/timesheets/*        - 3 endpoints
... и другие
```

### Проблемные моменты

#### 1. **Модуль iiko/router.ts (2,450 строк)**
**Проблемы:**
- Один файл содержит десятки endpoints
- Смешаны различные домены: sales, reports, stores, recipes, entities
- Дублирование логики валидации и обработки ошибок
- Уже есть под-роутеры, но главный роутер все равно перегружен

**Подключенные суб-роутеры:**
- `iiko/local-router.ts` (270 строк)
- `iiko/sales-router.ts` (67 строк)
- `iiko/reports-router.ts` (29 строк)
- `iiko/stores-router.ts` (61 строк)
- `iiko/recipes-router.ts` (63 строк)
- `iiko/entities-router.ts` (55 строк)
- `iiko/receipts-router.ts` (152 строк)

**Но в основном router.ts еще остается ~1,800 строк прямых endpoints!**

#### 2. **Дублирование обработки ошибок**

Повторяющийся паттерн во всех роутерах:
```typescript
try {
  // логика
  res.json({ data })
} catch (e: any) {
  res.status(500).json({ error: String(e?.message || e) })
}
```

**Найдено:** 397 блоков try-catch в 34 файлах

#### 3. **Дублирование валидации**

Повторяющиеся проверки:
```typescript
const year = Number(req.query.year)
const month = Number(req.query.month)
if (!year || !month || month < 1 || month > 12) {
  return res.status(400).json({ error: 'year=YYYY&month=MM required' })
}
```

Встречается в множестве endpoints (iiko/router.ts, reports/router.ts и др.)

#### 4. **Получение tenant и userId**

Каждый роутер вызывает:
```typescript
const tenant = await getTenant(prisma, req as any)
const userId = getUserId(req as any)
```

**Использований:** 65 раз getTenant, но это можно сделать в middleware!

---

## 🎯 Дублирование кода на клиенте

### 1. **Fetch паттерны**

Каждый *Client.tsx компонент повторяет:

```typescript
const API_BASE = getApiBase()

async function refresh() {
  const res = await fetch(`${API_BASE}/api/...`, { credentials: 'include' })
  const json = await res.json()
  setData(json.data)
}

async function create() {
  await fetch(`${API_BASE}/api/...`, { 
    method: 'POST', 
    headers: { 'Content-Type': 'application/json' }, 
    body: JSON.stringify(payload), 
    credentials: 'include' 
  })
  await refresh()
}
```

**Повторяется в 37+ компонентах!**

### 2. **State management**

Типичный паттерн в каждом компоненте:
```typescript
const [items, setItems] = useState<Type[]>([])
const [form, setForm] = useState<FormType>({...})
const [editingId, setEditingId] = useState<string | null>(null)
const [loading, setLoading] = useState(false)
```

### 3. **CRUD операции**

Повторяющаяся логика create/update/delete в каждом компоненте

### 4. **Department фильтры**

```typescript
const [activeDept, setActiveDept] = useState<'ALL' | 'KITCHEN' | 'HALL' | 'BAR' | 'OPERATORS' | 'OFFICE'>('ALL')
```

Повторяется в: `EmployeesClient`, `TimesheetsClient`, `PositionsClient`, `PayrollClient`

### 5. **Date pickers и форматирование**

Логика работы с датами дублируется в множестве компонентов

---

## 📦 Неиспользуемые файлы

1. **PurchasingClient.backup.tsx (1,273 строки)** - старая версия, нужно удалить
2. **RevenueClient.tsx.backup** - backup файл
3. Возможно есть другие backup/unused файлы

---

## 🚀 Рекомендации по оптимизации

### Серверная часть

#### 1. **Разбить iiko/router.ts**

Текущий размер: **2,450 строк**

**Рекомендуемая структура:**

```
modules/iiko/
  ├── router.ts (главный, только монтирует суб-роутеры)
  ├── sales/
  │   ├── summary-router.ts (summary endpoints)
  │   ├── revenue-router.ts (revenue endpoints)
  │   ├── hours-router.ts
  │   ├── paytypes-router.ts
  │   └── returns-router.ts
  ├── local/
  │   ├── sales-router.ts
  │   ├── summary-router.ts
  │   └── paytypes-router.ts
  ├── import-router.ts (ETL endpoints)
  ├── stores-router.ts (уже есть)
  ├── recipes-router.ts (уже есть)
  └── entities-router.ts (уже есть)
```

**Экономия:** Вместо 1 файла 2,450 строк → 10-15 файлов по 100-200 строк

#### 2. **Создать общие middleware**

**Файл:** `server/src/utils/common-middleware.ts`

```typescript
// Автоматическая обработка ошибок
export function asyncHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next))
      .catch((e: any) => {
        res.status(500).json({ error: String(e?.message || e) })
      })
  }
}

// Middleware для автоматического добавления tenant
export function attachTenant(prisma: PrismaClient) {
  return async (req: Request, res: Response, next: NextFunction) => {
    (req as any).tenant = await getTenant(prisma, req)
    next()
  }
}

// Валидация query параметров
export function validateYearMonth() {
  return (req: Request, res: Response, next: NextFunction) => {
    const year = Number(req.query.year)
    const month = Number(req.query.month)
    if (!year || !month || month < 1 || month > 12) {
      return res.status(400).json({ error: 'year=YYYY&month=MM required' })
    }
    (req as any).year = year
    (req as any).month = month
    next()
  }
}

export function validateDate() {
  return (req: Request, res: Response, next: NextFunction) => {
    const date = String(req.query.date || '').trim()
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'date=YYYY-MM-DD required' })
    }
    (req as any).date = date
    next()
  }
}
```

**Использование:**
```typescript
// Было:
router.get('/sales/revenue', async (req, res) => {
  try {
    const year = Number(req.query.year)
    const month = Number(req.query.month)
    if (!year || !month || month < 1 || month > 12) {
      return res.status(400).json({ error: 'year=YYYY&month=MM required' })
    }
    const revenue = await client.salesRevenueByDay(year, month)
    res.json({ year, month, revenue })
  } catch (e: any) {
    res.status(500).json({ error: String(e?.message || e) })
  }
})

// Стало:
router.get('/sales/revenue', 
  validateYearMonth(), 
  asyncHandler(async (req: any, res) => {
    const { year, month } = req
    const revenue = await client.salesRevenueByDay(year, month)
    res.json({ year, month, revenue })
  })
)
```

**Экономия:** Минус ~500-1000 строк повторяющегося кода

#### 3. **Создать базовый CRUD сервис**

Многие роутеры повторяют стандартный CRUD. Создать базовый класс:

```typescript
// server/src/utils/crud-service.ts
export class CrudService<T> {
  constructor(
    private prisma: PrismaClient,
    private model: string,
    private schema?: z.ZodSchema
  ) {}

  async list(where: any = {}) {
    return this.prisma[this.model].findMany({ where })
  }

  async get(id: string) {
    return this.prisma[this.model].findUnique({ where: { id } })
  }

  async create(data: any, tenantId?: string) {
    if (this.schema) {
      const validated = this.schema.parse(data)
      return this.prisma[this.model].create({ 
        data: { ...validated, tenantId } 
      })
    }
    return this.prisma[this.model].create({ data })
  }

  async update(id: string, data: any) {
    return this.prisma[this.model].update({ where: { id }, data })
  }

  async delete(id: string) {
    return this.prisma[this.model].delete({ where: { id } })
  }
}
```

**Экономия:** Простые роутеры могут уменьшиться с 100-150 строк до 20-30 строк

#### 4. **Оптимизация специфичных модулей**

**payments/router.ts (984 строки):**
- Выделить логику распределения платежей в отдельный сервис
- Создать `services/payment-allocation.ts`
- Роутер должен быть тонким слоем над сервисом

**transactions/router.ts (691 строка):**
- Логику импорта из GSheets вынести в отдельный сервис
- Создать `services/gsheets-importer.ts`

**purchasing/router.ts (681 строка):**
- Разбить на под-роутеры: products, suppliers, orders, buffer
- Уже есть `buffer-router.ts` и `settings-router.ts` - хорошее начало

---

### Клиентская часть

#### 1. **Создать API клиент с хуками**

**Файл:** `client/src/lib/api-client.ts`

```typescript
type FetchOptions = {
  method?: string
  body?: any
  params?: Record<string, any>
}

export class ApiClient {
  private baseUrl: string

  constructor() {
    this.baseUrl = getApiBase()
  }

  private async request<T>(
    endpoint: string, 
    options: FetchOptions = {}
  ): Promise<T> {
    const { method = 'GET', body, params } = options
    
    let url = `${this.baseUrl}${endpoint}`
    if (params) {
      const query = new URLSearchParams(params).toString()
      url += `?${query}`
    }

    const config: RequestInit = {
      method,
      credentials: 'include',
      headers: body ? { 'Content-Type': 'application/json' } : {}
    }

    if (body) {
      config.body = JSON.stringify(body)
    }

    const response = await fetch(url, config)
    return response.json()
  }

  get<T>(endpoint: string, params?: Record<string, any>) {
    return this.request<T>(endpoint, { params })
  }

  post<T>(endpoint: string, body: any) {
    return this.request<T>(endpoint, { method: 'POST', body })
  }

  patch<T>(endpoint: string, body: any) {
    return this.request<T>(endpoint, { method: 'PATCH', body })
  }

  delete<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: 'DELETE' })
  }
}

export const apiClient = new ApiClient()
```

**Файл:** `client/src/hooks/use-api.ts`

```typescript
export function useApi<T>(
  endpoint: string, 
  params?: Record<string, any>
) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    try {
      setLoading(true)
      const result = await apiClient.get<T>(endpoint, params)
      setData(result)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [endpoint, JSON.stringify(params)])

  useEffect(() => {
    fetch()
  }, [fetch])

  return { data, loading, error, refetch: fetch }
}
```

**Файл:** `client/src/hooks/use-crud.ts`

```typescript
export function useCrud<T>(endpoint: string) {
  const { data, loading, error, refetch } = useApi<{ data: T[] }>(endpoint)

  const create = async (item: Partial<T>) => {
    await apiClient.post(endpoint, item)
    await refetch()
  }

  const update = async (id: string, item: Partial<T>) => {
    await apiClient.patch(`${endpoint}/${id}`, item)
    await refetch()
  }

  const remove = async (id: string) => {
    await apiClient.delete(`${endpoint}/${id}`)
    await refetch()
  }

  return {
    items: data?.data || [],
    loading,
    error,
    create,
    update,
    remove,
    refetch
  }
}
```

**Использование:**

```typescript
// Было (EmployeesClient.tsx):
const [employees, setEmployees] = useState<Employee[]>([])
const API_BASE = getApiBase()

async function refresh() {
  const res = await fetch(`${API_BASE}/api/employees`, { credentials: 'include' })
  const json = await res.json()
  setEmployees(json.data)
}

async function save() {
  // ...много кода
}

// Стало:
const { items: employees, create, update } = useCrud<Employee>('/api/employees')

async function save() {
  if (editingId) {
    await update(editingId, form)
  } else {
    await create(form)
  }
}
```

**Экономия:** ~50-100 строк в каждом компоненте × 37 компонентов = **1,850-3,700 строк**

#### 2. **Создать переиспользуемые компоненты**

**Файл:** `client/src/components/crud/CrudTable.tsx`

```typescript
type CrudTableProps<T> = {
  items: T[]
  columns: ColumnDef<T>[]
  onEdit?: (item: T) => void
  onDelete?: (item: T) => void
  loading?: boolean
}

export function CrudTable<T>({ items, columns, onEdit, onDelete, loading }: CrudTableProps<T>) {
  // Общая логика таблицы с сортировкой, фильтрацией, пагинацией
}
```

**Файл:** `client/src/components/crud/CrudForm.tsx`

```typescript
type CrudFormProps<T> = {
  fields: FieldDef[]
  initialValues?: T
  onSubmit: (values: T) => void
  onCancel?: () => void
}

export function CrudForm<T>({ fields, initialValues, onSubmit, onCancel }: CrudFormProps<T>) {
  // Общая логика формы с валидацией
}
```

**Файл:** `client/src/components/filters/DepartmentFilter.tsx`

```typescript
export function DepartmentFilter({ value, onChange }: FilterProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectItem value="ALL">Все отделы</SelectItem>
      <SelectItem value="KITCHEN">Кухня</SelectItem>
      <SelectItem value="HALL">Зал</SelectItem>
      <SelectItem value="BAR">Бар</SelectItem>
      <SelectItem value="OPERATORS">Операторы</SelectItem>
      <SelectItem value="OFFICE">Офис</SelectItem>
    </Select>
  )
}
```

**Экономия:** Еще ~30-50 строк в каждом компоненте

#### 3. **Разбить большие компоненты**

**PurchasingClient.tsx (1,509 строк):**

Разбить на:
```
purchasing/
  ├── PurchasingClient.tsx (главный, 200 строк)
  ├── components/
  │   ├── OrderCalculator.tsx
  │   ├── ProductBuffers.tsx
  │   ├── ProductSuppliers.tsx
  │   ├── SupplierOrders.tsx
  │   ├── ProductStock.tsx
  │   └── OrderRecommendations.tsx
  └── hooks/
      ├── use-purchasing-data.ts
      └── use-order-calculations.ts
```

**CategoriesClient.tsx (934 строки):**

```
categories/
  ├── CategoriesClient.tsx (главный, 200 строк)
  ├── components/
  │   ├── CategoryTree.tsx
  │   ├── CategoryForm.tsx
  │   ├── ArticleList.tsx
  │   └── MoveDialog.tsx
  └── hooks/
      └── use-categories.ts
```

**Экономия:** Улучшение читаемости и поддерживаемости

#### 4. **Удалить неиспользуемые файлы**

```bash
rm client/src/app/(dashboard)/sales/purchasing/ui/PurchasingClient.backup.tsx
rm client/src/app/(dashboard)/sales/revenue/ui/RevenueClient.tsx.backup
```

**Экономия:** -1,273 строки мертвого кода

---

## 📈 Итоговые метрики оптимизации

### Серверная часть

| Оптимизация | Экономия строк | Улучшение |
|-------------|----------------|-----------|
| Разбить iiko/router.ts | -1,500 | Модульность |
| Common middleware (asyncHandler, validators) | -500 | DRY принцип |
| CRUD service для простых роутеров | -300 | Переиспользование |
| Рефакторинг payments/transactions | -400 | Читаемость |
| **Итого:** | **-2,700 строк** | **Легче поддерживать** |

### Клиентская часть

| Оптимизация | Экономия строк | Улучшение |
|-------------|----------------|-----------|
| API client + хуки (use-api, use-crud) | -2,500 | DRY, типизация |
| Переиспользуемые компоненты | -1,500 | Консистентность |
| Разбить большие компоненты | -3,000 | Читаемость |
| Удалить backup файлы | -1,300 | Чистота |
| **Итого:** | **-8,300 строк** | **Гораздо проще поддерживать** |

### Общий результат

**До оптимизации:**
- Backend: ~10,525 строк
- Frontend: ~14,000+ строк (оценка)
- **Всего: ~24,500 строк**

**После оптимизации:**
- Backend: ~7,825 строк (-25%)
- Frontend: ~5,700 строк (-59%)
- **Всего: ~13,525 строк (-45%)**

---

## 🎯 План внедрения

### Фаза 1: Критические улучшения (Неделя 1-2)

1. ✅ Создать `server/src/utils/common-middleware.ts`
2. ✅ Создать `client/src/lib/api-client.ts`
3. ✅ Создать `client/src/hooks/use-api.ts` и `use-crud.ts`
4. ✅ Удалить backup файлы
5. ✅ Применить middleware в 2-3 простых роутерах (пилот)
6. ✅ Переписать 2-3 простых компонента с хуками (пилот)

### Фаза 2: Рефакторинг iiko модуля (Неделя 3-4)

1. ✅ Разбить `iiko/router.ts` на под-роутеры
2. ✅ Применить middleware ко всем iiko endpoints
3. ✅ Протестировать все iiko функции

### Фаза 3: Рефакторинг других модулей (Неделя 5-6)

1. ✅ Рефакторинг `payments/router.ts` → создать payment сервис
2. ✅ Рефакторинг `transactions/router.ts` → создать transaction сервис
3. ✅ Рефакторинг `purchasing/router.ts` → разбить на под-роутеры
4. ✅ Применить CRUD service где возможно

### Фаза 4: Клиентские компоненты (Неделя 7-8)

1. ✅ Переписать все простые компоненты с новыми хуками
2. ✅ Создать переиспользуемые UI компоненты (CrudTable, CrudForm, DepartmentFilter)
3. ✅ Разбить `PurchasingClient.tsx`
4. ✅ Разбить `CategoriesClient.tsx`

### Фаза 5: Тестирование и оптимизация (Неделя 9-10)

1. ✅ Полное регрессионное тестирование
2. ✅ Оптимизация производительности
3. ✅ Обновление документации
4. ✅ Code review и финальные доработки

---

## 🔧 Дополнительные рекомендации

### 1. Типизация

Создать центральный файл типов:
```typescript
// shared/types/index.ts
export type Employee = {...}
export type Position = {...}
export type Transaction = {...}
// и т.д.
```

Использовать и на сервере, и на клиенте

### 2. Валидация

Использовать Zod схемы и на сервере, и на клиенте:
```typescript
// shared/schemas/employee.schema.ts
export const employeeSchema = z.object({
  fullName: z.string().min(1),
  positionId: z.string().optional()
})
```

### 3. Логирование

Добавить структурированное логирование (Winston или Pino) вместо console.log

### 4. Кеширование

- На клиенте: React Query или SWR для кеширования API запросов
- На сервере: Redis для кеширования частых запросов (например, категории)

### 5. Тестирование

- Backend: Jest + Supertest для API тестов
- Frontend: Jest + React Testing Library
- E2E: Playwright

---

## 📝 Заключение

Система **Piligrim** имеет хорошую архитектурную основу, но страдает от:

1. **Дублирования кода** (особенно на клиенте)
2. **Монолитных файлов** (iiko/router.ts, PurchasingClient.tsx)
3. **Отсутствия переиспользуемых утилит** (API клиент, CRUD хуки)
4. **Мертвого кода** (backup файлы)

**Предложенная оптимизация позволит:**
- ✅ Сократить кодовую базу на **~45%**
- ✅ Улучшить читаемость и поддерживаемость
- ✅ Упростить добавление новых функций
- ✅ Уменьшить количество багов
- ✅ Ускорить разработку новых фичей

**Приоритет:** Начать с Фазы 1 (middleware + API hooks), так как это даст быстрый результат с минимальными рисками.

