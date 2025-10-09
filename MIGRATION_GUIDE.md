# 🔄 Руководство по миграции на новую архитектуру

## Для разработчиков

### 🎯 Главное изменение

**Теперь не нужно писать boilerplate код!**

Вместо ручного написания fetch запросов и обработки ошибок используйте готовые утилиты.

---

## 📖 Backend: Как писать роутеры

### ✅ ПРАВИЛЬНО (новый стиль)

\`\`\`typescript
import { Router, Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { asyncHandler, validateYearMonth, validateId } from '../../utils/common-middleware'

export function createMyRouter(prisma: PrismaClient) {
  const router = Router()

  // Простой GET
  router.get('/', asyncHandler(async (_req: Request, res: Response) => {
    const data = await prisma.myModel.findMany()
    res.json({ data })
  }))

  // С валидацией года/месяца
  router.get('/by-month', validateYearMonth(), asyncHandler(async (req: any, res: Response) => {
    const { year, month } = req // уже провалидировано!
    // ваш код
    res.json({ data })
  }))

  // С валидацией ID
  router.patch('/:id', validateId(), asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id
    const updated = await prisma.myModel.update({ where: { id }, data: req.body })
    res.json({ data: updated })
  }))

  return router
}
\`\`\`

### ❌ УСТАРЕЛО (старый стиль)

\`\`\`typescript
router.get('/', async (_req, res) => {
  try {
    const data = await prisma.myModel.findMany()
    res.json({ data })
  } catch (e: any) {
    res.status(500).json({ error: String(e?.message || e) })
  }
})
\`\`\`

---

## 📖 Frontend: Как писать компоненты

### ✅ ПРАВИЛЬНО (новый стиль)

\`\`\`typescript
import { useCrud } from '@/hooks/use-crud'
import { DepartmentFilter } from '@/components/filters'

export default function MyClient({ initialData }) {
  const items = useCrud<MyItem>('/api/items', initialData)
  const [dept, setDept] = useState<Department>('ALL')

  async function handleSave() {
    if (editingId) {
      await items.update(editingId, formData)
    } else {
      await items.create(formData)
    }
  }

  return (
    <div>
      <DepartmentFilter value={dept} onChange={setDept} />
      
      {items.loading && <p>Загрузка...</p>}
      {items.error && <p>Ошибка: {items.error}</p>}
      
      {items.items.map(item => (
        <div key={item.id}>{item.name}</div>
      ))}
      
      <Button onClick={handleSave}>Сохранить</Button>
    </div>
  )
}
\`\`\`

### ❌ УСТАРЕЛО (старый стиль)

\`\`\`typescript
const [items, setItems] = useState([])
const API_BASE = getApiBase()

async function refresh() {
  const res = await fetch(\`\${API_BASE}/api/items\`, { credentials: 'include' })
  const json = await res.json()
  setItems(json.data)
}

async function create(data) {
  await fetch(\`\${API_BASE}/api/items\`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    credentials: 'include'
  })
  await refresh()
}
\`\`\`

---

## 🛠️ Доступные утилиты

### Backend Middleware

\`\`\`typescript
import {
  asyncHandler,         // Автоматическая обработка ошибок
  validateDate,         // Валидация YYYY-MM-DD
  validateYearMonth,    // Валидация year & month
  validateDateRange,    // Валидация from/to
  validateId,           // Валидация ID
  attachTenant,         // Авто-добавление tenant
  requestLogger         // Логирование
} from '../../utils/common-middleware'
\`\`\`

### Frontend Hooks

\`\`\`typescript
import { useCrud } from '@/hooks/use-crud'
import { useApi } from '@/hooks/use-api'
import { api } from '@/lib/api-client'
\`\`\`

### Frontend Filters

\`\`\`typescript
import { 
  DepartmentFilter,   // Фильтр по отделам
  StatusFilter        // Фильтр по статусу
} from '@/components/filters'
\`\`\`

---

## 🔄 Откат на старую версию

Если что-то пошло не так, можно легко откатиться:

\`\`\`bash
# Откат серверного роутера
cp old/server/employees-router.ts.old server/src/modules/employees/router.ts

# Откат клиентского компонента
cp old/client/EmployeesClient.tsx.old client/src/app/(dashboard)/employees/ui/EmployeesClient.tsx

# Пересобрать
cd server && npm run build
cd ../client && npm run build
\`\`\`

---

## 📚 Дополнительные материалы

- **REFACTORING_EXAMPLES.md** - детальные примеры кода
- **WHATS_NEW.md** - описание новых возможностей
- **SYSTEM_AUDIT_REPORT.md** - полный аудит системы

---

**Все готово к использованию! 🚀**
