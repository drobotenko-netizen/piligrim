# ⚡ Быстрая справка

## 🚀 Частые задачи

### Создать новый CRUD модуль

**Backend:**
```typescript
// server/src/modules/my-module/router.ts
import { Router, Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { asyncHandler, validateId } from '../../utils/common-middleware'

export function createMyModuleRouter(prisma: PrismaClient) {
  const router = Router()

  router.get('/', asyncHandler(async (_req: Request, res: Response) => {
    const data = await prisma.myModel.findMany()
    res.json({ data })
  }))

  router.post('/', asyncHandler(async (req: Request, res: Response) => {
    const created = await prisma.myModel.create({ data: req.body })
    res.json({ data: created })
  }))

  router.patch('/:id', validateId(), asyncHandler(async (req: Request, res: Response) => {
    const updated = await prisma.myModel.update({ 
      where: { id: req.params.id }, 
      data: req.body 
    })
    res.json({ data: updated })
  }))

  return router
}
```

**Frontend:**
```typescript
// client/src/app/(dashboard)/my-module/ui/MyClient.tsx
import { useCrud } from '@/hooks/use-crud'

type MyItem = { id: string; name: string }

export default function MyClient({ initialData }) {
  const items = useCrud<MyItem>('/api/my-items', initialData)

  return (
    <div>
      {items.items.map(item => <div key={item.id}>{item.name}</div>)}
      <button onClick={() => items.create({ name: 'Test' })}>Add</button>
    </div>
  )
}
```

---

### Добавить валидацию года/месяца

```typescript
import { validateYearMonth } from '../../utils/common-middleware'

router.get('/data', validateYearMonth(), asyncHandler(async (req: any, res) => {
  const { year, month } = req // уже провалидировано!
  // ваш код
}))
```

---

### Добавить фильтр отделов

```typescript
import { DepartmentFilter, type Department } from '@/components/filters'

const [dept, setDept] = useState<Department>('ALL')
<DepartmentFilter value={dept} onChange={setDept} />
```

---

## 📝 Шпаргалка

### Backend Middleware

```typescript
asyncHandler()           // Обработка ошибок
validateDate()          // Валидация YYYY-MM-DD
validateYearMonth()     // Валидация year & month
validateDateRange()     // Валидация from/to
validateId()            // Валидация ID
```

### Frontend Hooks

```typescript
useCrud<T>(endpoint, initialData)    // CRUD операции
useApi<T>(endpoint, params)          // Загрузка данных
api.get/post/patch/delete()          // Прямые вызовы
```

### Frontend Filters

```typescript
<DepartmentFilter value={dept} onChange={setDept} />
<StatusFilter value={status} onChange={setStatus} />
```

---

## 🔧 Проверка билдов

```bash
# Проверить сервер
cd server && npm run build

# Проверить клиент
cd client && npm run build

# Оба сразу
cd server && npm run build && cd ../client && npm run build
```

---

## 💾 Откат изменений

```bash
# Откатить роутер
cp old/server/my-router.ts.old server/src/modules/my-module/router.ts

# Откатить компонент
cp old/client/MyClient.tsx.old client/src/app/.../MyClient.tsx

# Пересобрать
cd server && npm run build
```

---

## 📚 Документация

| Файл | Описание | Размер |
|------|----------|--------|
| REFACTORING_INDEX.md | **НАЧНИТЕ ЗДЕСЬ** | 📖 |
| MIGRATION_GUIDE.md | Как использовать | ⭐ |
| REFACTORING_EXAMPLES.md | Примеры кода | ⭐ |
| REFACTORING_COMPLETE.md | Полный итог | 📊 |
| SYSTEM_AUDIT_REPORT.md | Аудит системы | 📈 |

---

**Быстрая помощь - читайте REFACTORING_INDEX.md! 📚**

