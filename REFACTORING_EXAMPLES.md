# Примеры рефакторинга кода

## 🎯 Конкретные примеры До/После

---

## 1. Серверная часть: Middleware для обработки ошибок

### ❌ БЫЛО (дублируется в каждом роутере)

```typescript
// server/src/modules/iiko/router.ts
router.get('/sales/summary', async (req, res) => {
  const date = String(req.query.date || '').trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: 'date=YYYY-MM-DD required' })
  }
  try {
    const summary = await client.salesSummary(date)
    res.json({ date, ...summary })
  } catch (e: any) {
    res.status(500).json({ error: String(e?.message || e) })
  }
})

router.get('/sales/revenue', async (req, res) => {
  const year = Number(req.query.year)
  const month = Number(req.query.month)
  if (!year || !month || month < 1 || month > 12) {
    return res.status(400).json({ error: 'year=YYYY&month=MM required' })
  }
  try {
    const revenue = await client.salesRevenueByDay(year, month)
    res.json({ year, month, revenue })
  } catch (e: any) {
    res.status(500).json({ error: String(e?.message || e) })
  }
})

// ... повторяется в ~50 endpoints!
```

### ✅ СТАЛО

```typescript
// server/src/utils/common-middleware.ts
import { Request, Response, NextFunction } from 'express'

export function asyncHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next))
      .catch((e: any) => {
        console.error('API Error:', e)
        res.status(500).json({ error: String(e?.message || e) })
      })
  }
}

export function validateDate(paramName: string = 'date') {
  return (req: Request, res: Response, next: NextFunction) => {
    const date = String(req.query[paramName] || '').trim()
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: `${paramName}=YYYY-MM-DD required` })
    }
    (req as any)[paramName] = date
    next()
  }
}

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

// server/src/modules/iiko/router.ts (ПОСЛЕ)
import { asyncHandler, validateDate, validateYearMonth } from '../../utils/common-middleware'

router.get('/sales/summary', 
  validateDate(),
  asyncHandler(async (req: any, res) => {
    const { date } = req
    const summary = await client.salesSummary(date)
    res.json({ date, ...summary })
  })
)

router.get('/sales/revenue',
  validateYearMonth(),
  asyncHandler(async (req: any, res) => {
    const { year, month } = req
    const revenue = await client.salesRevenueByDay(year, month)
    res.json({ year, month, revenue })
  })
)

// Код сократился с ~15 строк до ~5 строк на каждый endpoint!
```

**Экономия:** ~10 строк × 50 endpoints = **500 строк кода**

---

## 2. Серверная часть: CRUD Service

### ❌ БЫЛО (повторяется в каждом простом роутере)

```typescript
// server/src/modules/employees/router.ts
router.get('/', async (_req, res) => {
  const data = await prisma.employee.findMany({ 
    orderBy: { fullName: 'asc' }, 
    include: { position: true } 
  })
  res.json({ data })
})

router.post('/', async (req, res) => {
  const fullName = String(req.body?.fullName || '').trim()
  const positionId = req.body?.positionId || null
  if (!fullName) return res.status(400).json({ error: 'fullName required' })
  const tenant = await getTenant(prisma, req as any)
  const created = await prisma.employee.create({ 
    data: { fullName, positionId, tenantId: tenant.id } 
  })
  res.json({ data: created })
})

router.patch('/:id', async (req, res) => {
  const id = req.params.id
  const patch: any = {}
  if ('fullName' in req.body) patch.fullName = String(req.body.fullName)
  if ('positionId' in req.body) patch.positionId = req.body.positionId || null
  const updated = await prisma.employee.update({ where: { id }, data: patch })
  res.json({ data: updated })
})

// Такая же структура в positions, counterparties, channels, tender-types...
```

### ✅ СТАЛО

```typescript
// server/src/utils/crud-controller.ts
import { PrismaClient } from '@prisma/client'
import { Request, Response, Router } from 'express'
import { z } from 'zod'
import { asyncHandler } from './common-middleware'
import { getTenant } from './tenant'

export interface CrudOptions {
  model: string
  include?: any
  orderBy?: any
  createSchema?: z.ZodSchema
  updateSchema?: z.ZodSchema
  withTenant?: boolean
}

export function createCrudRouter(prisma: PrismaClient, options: CrudOptions) {
  const router = Router()
  const { model, include, orderBy, createSchema, updateSchema, withTenant = true } = options

  // GET / - list
  router.get('/', asyncHandler(async (req: Request, res: Response) => {
    const where = withTenant ? { tenantId: (await getTenant(prisma, req)).id } : {}
    const data = await (prisma as any)[model].findMany({
      where,
      include,
      orderBy: orderBy || { createdAt: 'desc' }
    })
    res.json({ data })
  }))

  // POST / - create
  router.post('/', asyncHandler(async (req: Request, res: Response) => {
    let data = req.body
    if (createSchema) {
      const validated = createSchema.safeParse(data)
      if (!validated.success) {
        return res.status(400).json({ 
          error: 'validation_error', 
          details: validated.error.flatten() 
        })
      }
      data = validated.data
    }
    
    if (withTenant) {
      const tenant = await getTenant(prisma, req)
      data.tenantId = tenant.id
    }

    const created = await (prisma as any)[model].create({ data })
    res.json({ data: created })
  }))

  // PATCH /:id - update
  router.patch('/:id', asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params
    let data = req.body
    
    if (updateSchema) {
      const validated = updateSchema.safeParse(data)
      if (!validated.success) {
        return res.status(400).json({ 
          error: 'validation_error', 
          details: validated.error.flatten() 
        })
      }
      data = validated.data
    }

    const updated = await (prisma as any)[model].update({
      where: { id },
      data
    })
    res.json({ data: updated })
  }))

  // DELETE /:id - delete
  router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params
    await (prisma as any)[model].delete({ where: { id } })
    res.json({ success: true })
  }))

  return router
}

// server/src/modules/employees/router.ts (ПОСЛЕ)
import { createCrudRouter } from '../../utils/crud-controller'
import { z } from 'zod'

const createEmployeeSchema = z.object({
  fullName: z.string().min(1),
  positionId: z.string().optional().nullable()
})

const updateEmployeeSchema = z.object({
  fullName: z.string().min(1).optional(),
  positionId: z.string().optional().nullable()
})

export function createEmployeesRouter(prisma: PrismaClient) {
  const router = createCrudRouter(prisma, {
    model: 'employee',
    include: { position: true },
    orderBy: { fullName: 'asc' },
    createSchema: createEmployeeSchema,
    updateSchema: updateEmployeeSchema
  })

  // Можно добавить специфичные endpoints
  router.patch('/:id/fire', asyncHandler(async (req, res) => {
    const updated = await prisma.employee.update({
      where: { id: req.params.id },
      data: { active: false, firedAt: new Date() }
    })
    res.json({ data: updated })
  }))

  return router
}

// Код сократился с ~43 строк до ~25 строк!
```

**Экономия:** ~50-100 строк на каждый простой роутер × 6 роутеров = **300-600 строк**

---

## 3. Клиентская часть: API хуки

### ❌ БЫЛО (повторяется в каждом клиентском компоненте)

```typescript
// client/src/app/(dashboard)/employees/ui/EmployeesClient.tsx
export default function EmployeesClient({ initialEmployees }: { initialEmployees: Employee[] }) {
  const [employees, setEmployees] = useState<Employee[]>(initialEmployees || [])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const API_BASE = getApiBase()

  async function refresh() {
    try {
      setLoading(true)
      const res = await fetch(`${API_BASE}/api/employees`, { credentials: 'include' })
      const json = await res.json()
      setEmployees(json.data)
      setError(null)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function create(data: Partial<Employee>) {
    try {
      setLoading(true)
      await fetch(`${API_BASE}/api/employees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include'
      })
      await refresh()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function update(id: string, data: Partial<Employee>) {
    try {
      setLoading(true)
      await fetch(`${API_BASE}/api/employees/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include'
      })
      await refresh()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  // ... еще 100+ строк UI кода
}

// Повторяется в 37 компонентах!
```

### ✅ СТАЛО

```typescript
// client/src/lib/api-client.ts
class ApiClient {
  private baseUrl: string

  constructor() {
    this.baseUrl = getApiBase()
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    const config: RequestInit = {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    }

    const response = await fetch(url, config)
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(error.error || 'Request failed')
    }
    return response.json()
  }

  get<T>(endpoint: string) {
    return this.request<T>(endpoint)
  }

  post<T>(endpoint: string, body: any) {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(body)
    })
  }

  patch<T>(endpoint: string, body: any) {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(body)
    })
  }

  delete<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: 'DELETE' })
  }
}

export const api = new ApiClient()

// client/src/hooks/use-crud.ts
import { useState, useCallback } from 'react'
import { api } from '@/lib/api-client'

export function useCrud<T>(endpoint: string, initialData?: T[]) {
  const [items, setItems] = useState<T[]>(initialData || [])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await api.get<{ data: T[] }>(endpoint)
      setItems(response.data)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [endpoint])

  const create = useCallback(async (data: Partial<T>) => {
    try {
      setLoading(true)
      setError(null)
      await api.post(endpoint, data)
      await fetch()
    } catch (e: any) {
      setError(e.message)
      throw e
    } finally {
      setLoading(false)
    }
  }, [endpoint, fetch])

  const update = useCallback(async (id: string, data: Partial<T>) => {
    try {
      setLoading(true)
      setError(null)
      await api.patch(`${endpoint}/${id}`, data)
      await fetch()
    } catch (e: any) {
      setError(e.message)
      throw e
    } finally {
      setLoading(false)
    }
  }, [endpoint, fetch])

  const remove = useCallback(async (id: string) => {
    try {
      setLoading(true)
      setError(null)
      await api.delete(`${endpoint}/${id}`)
      await fetch()
    } catch (e: any) {
      setError(e.message)
      throw e
    } finally {
      setLoading(false)
    }
  }, [endpoint, fetch])

  return {
    items,
    loading,
    error,
    fetch,
    create,
    update,
    remove
  }
}

// client/src/app/(dashboard)/employees/ui/EmployeesClient.tsx (ПОСЛЕ)
export default function EmployeesClient({ initialEmployees }: { initialEmployees: Employee[] }) {
  const { items: employees, loading, error, create, update } = useCrud<Employee>(
    '/api/employees',
    initialEmployees
  )
  
  const [form, setForm] = useState({ fullName: '', positionId: 'none' })
  const [editingId, setEditingId] = useState<string | null>(null)

  async function handleSave() {
    const data = {
      fullName: form.fullName,
      positionId: form.positionId === 'none' ? null : form.positionId
    }
    
    if (editingId) {
      await update(editingId, data)
    } else {
      await create(data)
    }
    
    setForm({ fullName: '', positionId: 'none' })
    setEditingId(null)
  }

  // ... остальной UI код (стал намного чище!)
}

// Код сократился с ~170 строк до ~100 строк!
```

**Экономия:** ~50-70 строк × 37 компонентов = **1,850-2,590 строк**

---

## 4. Клиентская часть: Переиспользуемые фильтры

### ❌ БЫЛО (дублируется в 4+ компонентах)

```typescript
// В каждом компоненте:
const [activeDept, setActiveDept] = useState<'ALL' | 'KITCHEN' | 'HALL' | 'BAR' | 'OPERATORS' | 'OFFICE'>('ALL')

// В JSX:
<Select value={activeDept} onValueChange={v => setActiveDept(v as any)}>
  <SelectTrigger className="w-48">
    <SelectValue />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="ALL">Все отделы</SelectItem>
    <SelectItem value="KITCHEN">Кухня</SelectItem>
    <SelectItem value="HALL">Зал</SelectItem>
    <SelectItem value="BAR">Бар</SelectItem>
    <SelectItem value="OPERATORS">Операторы</SelectItem>
    <SelectItem value="OFFICE">Офис</SelectItem>
  </SelectContent>
</Select>

// Повторяется в: EmployeesClient, TimesheetsClient, PositionsClient, PayrollClient
```

### ✅ СТАЛО

```typescript
// client/src/components/filters/DepartmentFilter.tsx
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export type Department = 'ALL' | 'KITCHEN' | 'HALL' | 'BAR' | 'OPERATORS' | 'OFFICE'

const DEPARTMENTS: Record<Department, string> = {
  ALL: 'Все отделы',
  KITCHEN: 'Кухня',
  HALL: 'Зал',
  BAR: 'Бар',
  OPERATORS: 'Операторы',
  OFFICE: 'Офис'
}

interface DepartmentFilterProps {
  value: Department
  onChange: (value: Department) => void
  className?: string
}

export function DepartmentFilter({ value, onChange, className }: DepartmentFilterProps) {
  return (
    <Select value={value} onValueChange={v => onChange(v as Department)}>
      <SelectTrigger className={className || "w-48"}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {Object.entries(DEPARTMENTS).map(([key, label]) => (
          <SelectItem key={key} value={key}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

// client/src/app/(dashboard)/employees/ui/EmployeesClient.tsx (ПОСЛЕ)
import { DepartmentFilter, Department } from '@/components/filters/DepartmentFilter'

export default function EmployeesClient() {
  const [activeDept, setActiveDept] = useState<Department>('ALL')
  
  // В JSX:
  <DepartmentFilter value={activeDept} onChange={setActiveDept} />
}

// Вместо 15 строк → 1 строка!
```

**Аналогично создать:**
- `MonthFilter` (выбор месяца/года)
- `DateRangeFilter` (диапазон дат)
- `StatusFilter` (активные/неактивные)

**Экономия:** ~10-15 строк × 10 мест использования = **100-150 строк**

---

## 5. Разбиение монолитного компонента

### ❌ БЫЛО

```typescript
// client/src/app/(dashboard)/sales/purchasing/ui/PurchasingClient.tsx
// 1,509 строк кода в одном файле!

export default function PurchasingClient() {
  // 100+ строк state
  const [orders, setOrders] = useState([])
  const [buffers, setBuffers] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [products, setProducts] = useState([])
  const [stock, setStock] = useState([])
  const [calculations, setCalculations] = useState([])
  // ... еще 20+ useState

  // 200+ строк функций
  async function fetchOrders() { ... }
  async function fetchBuffers() { ... }
  async function fetchSuppliers() { ... }
  async function calculateOrders() { ... }
  async function createOrder() { ... }
  async function updateBuffer() { ... }
  // ... еще 30+ функций

  // 1,200+ строк JSX
  return (
    <div>
      <Tabs>
        <TabsList>
          <TabsTrigger value="orders">Заказы</TabsTrigger>
          <TabsTrigger value="buffers">Буферы</TabsTrigger>
          <TabsTrigger value="suppliers">Поставщики</TabsTrigger>
          <TabsTrigger value="calculator">Калькулятор</TabsTrigger>
        </TabsList>
        
        <TabsContent value="orders">
          {/* 300 строк кода для заказов */}
        </TabsContent>
        
        <TabsContent value="buffers">
          {/* 300 строк кода для буферов */}
        </TabsContent>
        
        <TabsContent value="suppliers">
          {/* 300 строк кода для поставщиков */}
        </TabsContent>
        
        <TabsContent value="calculator">
          {/* 300 строк кода для калькулятора */}
        </TabsContent>
      </Tabs>
    </div>
  )
}
```

### ✅ СТАЛО

```typescript
// client/src/app/(dashboard)/sales/purchasing/hooks/use-purchasing.ts
export function usePurchasing() {
  const orders = useCrud<Order>('/api/purchasing/orders')
  const buffers = useCrud<Buffer>('/api/purchasing/buffers')
  const suppliers = useCrud<Supplier>('/api/purchasing/suppliers')
  
  const [calculations, setCalculations] = useState<Calculation[]>([])
  
  const calculateOrders = useCallback(async () => {
    const result = await api.post<{ calculations: Calculation[] }>(
      '/api/purchasing/calculate', 
      {}
    )
    setCalculations(result.calculations)
  }, [])
  
  return {
    orders,
    buffers,
    suppliers,
    calculations,
    calculateOrders
  }
}

// client/src/app/(dashboard)/sales/purchasing/components/OrdersTab.tsx
export function OrdersTab({ orders }: { orders: ReturnType<typeof useCrud<Order>> }) {
  const { items, loading, create, update, remove } = orders
  const [editingId, setEditingId] = useState<string | null>(null)
  
  return (
    <div>
      {/* 200 строк UI для заказов */}
    </div>
  )
}

// client/src/app/(dashboard)/sales/purchasing/components/BuffersTab.tsx
export function BuffersTab({ buffers }: { buffers: ReturnType<typeof useCrud<Buffer>> }) {
  // 200 строк UI для буферов
}

// client/src/app/(dashboard)/sales/purchasing/components/SuppliersTab.tsx
export function SuppliersTab({ suppliers }: { suppliers: ReturnType<typeof useCrud<Supplier>> }) {
  // 200 строк UI для поставщиков
}

// client/src/app/(dashboard)/sales/purchasing/components/CalculatorTab.tsx
export function CalculatorTab({ 
  calculations, 
  onCalculate 
}: { 
  calculations: Calculation[]
  onCalculate: () => void 
}) {
  // 200 строк UI для калькулятора
}

// client/src/app/(dashboard)/sales/purchasing/ui/PurchasingClient.tsx (ПОСЛЕ)
import { usePurchasing } from '../hooks/use-purchasing'
import { OrdersTab } from '../components/OrdersTab'
import { BuffersTab } from '../components/BuffersTab'
import { SuppliersTab } from '../components/SuppliersTab'
import { CalculatorTab } from '../components/CalculatorTab'

export default function PurchasingClient() {
  const { orders, buffers, suppliers, calculations, calculateOrders } = usePurchasing()
  const [activeTab, setActiveTab] = useState('orders')
  
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Закупки</h1>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="orders">Заказы</TabsTrigger>
          <TabsTrigger value="buffers">Буферы</TabsTrigger>
          <TabsTrigger value="suppliers">Поставщики</TabsTrigger>
          <TabsTrigger value="calculator">Калькулятор</TabsTrigger>
        </TabsList>
        
        <TabsContent value="orders">
          <OrdersTab orders={orders} />
        </TabsContent>
        
        <TabsContent value="buffers">
          <BuffersTab buffers={buffers} />
        </TabsContent>
        
        <TabsContent value="suppliers">
          <SuppliersTab suppliers={suppliers} />
        </TabsContent>
        
        <TabsContent value="calculator">
          <CalculatorTab 
            calculations={calculations} 
            onCalculate={calculateOrders} 
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Главный компонент сократился до ~50 строк!
```

**Новая структура файлов:**

```
sales/purchasing/
├── ui/
│   └── PurchasingClient.tsx (50 строк - главный)
├── components/
│   ├── OrdersTab.tsx (200 строк)
│   ├── BuffersTab.tsx (200 строк)
│   ├── SuppliersTab.tsx (200 строк)
│   ├── CalculatorTab.tsx (200 строк)
│   ├── OrderForm.tsx (100 строк)
│   └── BufferForm.tsx (100 строк)
├── hooks/
│   └── use-purchasing.ts (100 строк)
└── types/
    └── index.ts (50 строк)

Итого: вместо 1 файла × 1,509 строк → 9 файлов × ~150 строк в среднем
```

**Преимущества:**
- ✅ Легче найти код
- ✅ Легче тестировать
- ✅ Переиспользование компонентов
- ✅ Параллельная разработка

---

## 6. Серверная часть: Выделение бизнес-логики в сервисы

### ❌ БЫЛО

```typescript
// server/src/modules/payments/router.ts (984 строки)
router.post('/', requireRole(['ADMIN', 'ACCOUNTANT']), async (req, res) => {
  try {
    // 200+ строк сложной логики распределения платежей
    const { accountId, amount, date, expenseDocId, allocations } = req.body
    
    // Валидация
    if (!accountId || !amount || !date) {
      return res.status(400).json({ error: 'invalid input' })
    }
    
    // Получение связанных данных
    const account = await prisma.account.findUnique({ where: { id: accountId } })
    if (!account) {
      return res.status(404).json({ error: 'account not found' })
    }
    
    // Создание платежа
    const payment = await prisma.payment.create({
      data: {
        accountId,
        amount,
        date: new Date(date),
        expenseDocId: expenseDocId || null
      }
    })
    
    // Сложная логика распределения на несколько документов
    if (allocations && Array.isArray(allocations)) {
      for (const alloc of allocations) {
        const expenseDoc = await prisma.expenseDoc.findUnique({
          where: { id: alloc.expenseDocId }
        })
        
        if (!expenseDoc) continue
        
        // Вычисление оставшейся суммы
        const existingAllocations = await prisma.paymentAllocation.findMany({
          where: { expenseDocId: alloc.expenseDocId }
        })
        
        const totalAllocated = existingAllocations.reduce((sum, a) => sum + a.amount, 0)
        const remaining = expenseDoc.amount - totalAllocated
        
        if (alloc.amount > remaining) {
          throw new Error('Allocation exceeds remaining amount')
        }
        
        await prisma.paymentAllocation.create({
          data: {
            paymentId: payment.id,
            expenseDocId: alloc.expenseDocId,
            amount: alloc.amount
          }
        })
        
        // Обновление статуса документа
        const newTotalAllocated = totalAllocated + alloc.amount
        const newStatus = newTotalAllocated >= expenseDoc.amount ? 'paid' : 'partial'
        
        await prisma.expenseDoc.update({
          where: { id: alloc.expenseDocId },
          data: { paymentStatus: newStatus }
        })
      }
    }
    
    // Обновление баланса счета
    await prisma.account.update({
      where: { id: accountId },
      data: {
        balance: {
          decrement: amount
        }
      }
    })
    
    res.json({ data: payment })
  } catch (e: any) {
    res.status(500).json({ error: String(e?.message || e) })
  }
})
```

### ✅ СТАЛО

```typescript
// server/src/services/payment.service.ts
import { PrismaClient } from '@prisma/client'

export class PaymentService {
  constructor(private prisma: PrismaClient) {}

  async createPaymentWithAllocations(data: {
    accountId: string
    amount: number
    date: Date
    expenseDocId?: string
    allocations?: Array<{ expenseDocId: string; amount: number }>
    tenantId: string
  }) {
    return await this.prisma.$transaction(async (tx) => {
      // Проверка счета
      const account = await tx.account.findUnique({ 
        where: { id: data.accountId } 
      })
      
      if (!account) {
        throw new Error('Account not found')
      }

      if (account.balance < data.amount) {
        throw new Error('Insufficient funds')
      }

      // Создание платежа
      const payment = await tx.payment.create({
        data: {
          accountId: data.accountId,
          amount: data.amount,
          date: data.date,
          expenseDocId: data.expenseDocId || null,
          tenantId: data.tenantId
        }
      })

      // Распределение платежей
      if (data.allocations && data.allocations.length > 0) {
        await this.allocatePayment(tx, payment.id, data.allocations)
      }

      // Обновление баланса счета
      await tx.account.update({
        where: { id: data.accountId },
        data: { balance: { decrement: data.amount } }
      })

      return payment
    })
  }

  private async allocatePayment(
    tx: any,
    paymentId: string,
    allocations: Array<{ expenseDocId: string; amount: number }>
  ) {
    for (const alloc of allocations) {
      // Получение документа
      const expenseDoc = await tx.expenseDoc.findUnique({
        where: { id: alloc.expenseDocId },
        include: { allocations: true }
      })

      if (!expenseDoc) {
        throw new Error(`Expense doc ${alloc.expenseDocId} not found`)
      }

      // Проверка оставшейся суммы
      const totalAllocated = expenseDoc.allocations.reduce(
        (sum: number, a: any) => sum + a.amount, 
        0
      )
      const remaining = expenseDoc.amount - totalAllocated

      if (alloc.amount > remaining) {
        throw new Error(
          `Allocation ${alloc.amount} exceeds remaining ${remaining}`
        )
      }

      // Создание аллокации
      await tx.paymentAllocation.create({
        data: {
          paymentId,
          expenseDocId: alloc.expenseDocId,
          amount: alloc.amount
        }
      })

      // Обновление статуса
      const newTotalAllocated = totalAllocated + alloc.amount
      const paymentStatus = newTotalAllocated >= expenseDoc.amount 
        ? 'paid' 
        : 'partial'

      await tx.expenseDoc.update({
        where: { id: alloc.expenseDocId },
        data: { paymentStatus }
      })
    }
  }

  async getPaymentsByAccount(accountId: string, dateRange?: { from: Date; to: Date }) {
    return await this.prisma.payment.findMany({
      where: {
        accountId,
        ...(dateRange && {
          date: {
            gte: dateRange.from,
            lt: dateRange.to
          }
        })
      },
      include: {
        account: true,
        expenseDoc: {
          include: {
            vendor: true,
            category: true
          }
        },
        allocations: {
          include: {
            expenseDoc: {
              include: { vendor: true }
            }
          }
        }
      },
      orderBy: { date: 'desc' }
    })
  }
}

// server/src/modules/payments/router.ts (ПОСЛЕ)
import { PaymentService } from '../../services/payment.service'
import { asyncHandler } from '../../utils/common-middleware'
import { z } from 'zod'

const createPaymentSchema = z.object({
  accountId: z.string(),
  amount: z.number().positive(),
  date: z.string().datetime(),
  expenseDocId: z.string().optional(),
  allocations: z.array(z.object({
    expenseDocId: z.string(),
    amount: z.number().positive()
  })).optional()
})

export function createPaymentsRouter(prisma: PrismaClient) {
  const router = Router()
  const paymentService = new PaymentService(prisma)

  router.post('/', 
    requireRole(['ADMIN', 'ACCOUNTANT']),
    asyncHandler(async (req: any, res) => {
      const validated = createPaymentSchema.parse(req.body)
      const tenant = await getTenant(prisma, req)
      
      const payment = await paymentService.createPaymentWithAllocations({
        ...validated,
        date: new Date(validated.date),
        tenantId: tenant.id
      })
      
      res.json({ data: payment })
    })
  )

  router.get('/',
    asyncHandler(async (req: any, res) => {
      const { accountId, from, to } = req.query
      
      const payments = await paymentService.getPaymentsByAccount(
        String(accountId),
        from && to ? {
          from: new Date(String(from)),
          to: new Date(String(to))
        } : undefined
      )
      
      res.json({ items: payments })
    })
  )

  return router
}

// Роутер сократился с 984 строк до ~50 строк!
// Логика теперь тестируема независимо
```

**Преимущества:**
- ✅ Роутер стал тонким слоем (только HTTP)
- ✅ Бизнес-логику легко тестировать
- ✅ Переиспользование сервиса в других местах
- ✅ Транзакции централизованы
- ✅ Легче поддерживать

---

## 📋 Чек-лист внедрения

### Шаг 1: Подготовка (1-2 дня)
- [ ] Создать `server/src/utils/common-middleware.ts`
- [ ] Создать `server/src/utils/crud-controller.ts`
- [ ] Создать `client/src/lib/api-client.ts`
- [ ] Создать `client/src/hooks/use-crud.ts`
- [ ] Создать `client/src/components/filters/`

### Шаг 2: Пилотное внедрение (3-5 дней)
- [ ] Применить middleware к 3 простым роутерам
- [ ] Переписать 3 простых компонента с хуками
- [ ] Протестировать изменения
- [ ] Собрать обратную связь

### Шаг 3: Массовое внедрение (2-3 недели)
- [ ] Применить ко всем роутерам
- [ ] Переписать все компоненты
- [ ] Разбить большие компоненты
- [ ] Выделить сервисы для сложной логики

### Шаг 4: Финализация (1 неделя)
- [ ] Удалить backup файлы
- [ ] Полное тестирование
- [ ] Обновить документацию
- [ ] Code review

---

## 🎓 Заключение

Эти примеры показывают конкретные способы уменьшения дублирования и улучшения архитектуры кода.

**Ключевые принципы:**
1. **DRY (Don't Repeat Yourself)** - не дублируйте код
2. **Separation of Concerns** - разделяйте ответственность
3. **Single Responsibility** - одна функция = одна задача
4. **Composition over Inheritance** - используйте композицию

**Результат:**
- Меньше кода для поддержки
- Выше качество кода
- Быстрее разработка новых фичей
- Проще находить и исправлять баги

