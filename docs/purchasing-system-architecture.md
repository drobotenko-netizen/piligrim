# Система закупа - Архитектура

## 🎯 Обзор системы

Система автоматического расчета и формирования заказов поставщикам на основе:
- Расхода ингредиентов за последние 4 недели
- Индивидуальных буферных запасов для каждого ингредиента
- Текущих остатков на складах
- Еженедельного графика заказов

## 📊 Модели данных

### 1. Поставщики продуктов
```typescript
interface ProductSupplier {
  id: string
  productId: string           // Связь с ингредиентом
  supplierId: string          // Связь с поставщиком
  isPrimary: boolean          // Основной поставщик (true) или запасной (false)
  priority: number            // Приоритет среди запасных (1, 2, 3...)
  isActive: boolean           // Активен ли поставщик для этого продукта
  minOrderAmount?: number     // Минимальная сумма заказа
  deliveryDays: number        // Дни доставки (1-7)
  price?: number             // Цена за единицу (если фиксированная)
  unit: string               // Единица измерения (кг, л, шт)
  createdAt: DateTime
  updatedAt: DateTime
}
```

### 2. Буферные запасы
```typescript
interface ProductBuffer {
  id: string
  productId: string          // Связь с ингредиентом
  bufferDays: number         // На сколько дней буфер (по умолчанию 7)
  minBuffer: number          // Минимальный буфер в единицах
  maxBuffer: number          // Максимальный буфер в единицах
  isActive: boolean          // Активен ли буфер
  notes?: string             // Примечания
  createdAt: DateTime
  updatedAt: DateTime
}
```

### 3. Остатки продуктов
```typescript
interface ProductStock {
  id: string
  productId: string          // Связь с ингредиентом
  storeId: string            // Склад (из iiko)
  currentStock: number       // Текущий остаток
  reservedStock: number      // Зарезервировано
  lastUpdated: DateTime      // Последнее обновление
  lastSyncWithIiko: DateTime // Последняя синхронизация с iiko
}
```

### 4. График заказов
```typescript
interface OrderSchedule {
  id: string
  supplierId: string         // Поставщик
  dayOfWeek: number          // День недели (1-7, где 1 = понедельник)
  orderTime: string          // Время заказа (HH:MM)
  isActive: boolean          // Активен ли график
  autoCreate: boolean        // Автоматически создавать заказы
  notes?: string
}
```

### 5. Заказы поставщикам
```typescript
interface SupplierOrder {
  id: string
  supplierId: string
  status: 'DRAFT' | 'SENT' | 'CONFIRMED' | 'DELIVERED' | 'CANCELLED'
  orderDate: DateTime        // Дата создания заказа
  scheduledDate: DateTime    // Планируемая дата заказа
  deliveryDate?: DateTime    // Дата доставки
  totalAmount: number        // Общая сумма заказа
  items: SupplierOrderItem[]
  notes?: string
  createdBy: string          // ID пользователя
  createdAt: DateTime
  updatedAt: DateTime
}
```

### 6. Позиции заказа
```typescript
interface SupplierOrderItem {
  id: string
  orderId: string
  productId: string
  productName: string        // Название для отображения
  quantity: number           // Количество к заказу
  unit: string              // Единица измерения
  price?: number            // Цена за единицу
  totalAmount: number       // Сумма позиции
  notes?: string
}
```

## 🔧 API Endpoints

### Расчет заказов
```typescript
// Основной расчет заказов
GET /api/purchasing/calculate-orders
Query params:
  - storeId?: string         // Конкретный склад
  - supplierId?: string      // Конкретный поставщик
  - productId?: string       // Конкретный продукт
  - date?: string           // Дата расчета (YYYY-MM-DD)
Response: OrderCalculation[]

// Предварительный расчет (без создания заказа)
GET /api/purchasing/preview-orders
Query params: те же
Response: OrderCalculation[]

// История расчетов
GET /api/purchasing/calculation-history
Query params:
  - from?: string
  - to?: string
  - supplierId?: string
Response: CalculationHistory[]
```

### Управление буферами
```typescript
GET /api/purchasing/buffers
POST /api/purchasing/buffers
PUT /api/purchasing/buffers/:id
DELETE /api/purchasing/buffers/:id

// Массовое обновление буферов
PUT /api/purchasing/buffers/bulk
Body: { buffers: ProductBuffer[] }
```

### Управление поставщиками продуктов
```typescript
GET /api/purchasing/product-suppliers
POST /api/purchasing/product-suppliers
PUT /api/purchasing/product-suppliers/:id
DELETE /api/purchasing/product-suppliers/:id

// Поставщики для конкретного продукта
GET /api/purchasing/products/:productId/suppliers
```

### Заказы поставщикам
```typescript
GET /api/purchasing/orders
POST /api/purchasing/orders
PUT /api/purchasing/orders/:id
DELETE /api/purchasing/orders/:id

// Изменение статуса заказа
PUT /api/purchasing/orders/:id/status
Body: { status: string }

// Дублирование заказа
POST /api/purchasing/orders/:id/duplicate
```

### График заказов
```typescript
GET /api/purchasing/schedule
POST /api/purchasing/schedule
PUT /api/purchasing/schedule/:id
DELETE /api/purchasing/schedule/:id

// Автоматическое создание заказов по графику
POST /api/purchasing/schedule/auto-create
Body: { date: string }
```

### Остатки продуктов
```typescript
GET /api/purchasing/stock
PUT /api/purchasing/stock/:id

// Синхронизация с iiko
POST /api/purchasing/stock/sync-iiko
Body: { storeId?: string, productId?: string }

// История изменений остатков
GET /api/purchasing/stock/history
Query params:
  - productId?: string
  - storeId?: string
  - from?: string
  - to?: string
```

## 🧮 Бизнес-логика

### Расчет расхода за неделю
```typescript
interface ConsumptionData {
  productId: string
  weeklyConsumption: number    // Расход за неделю
  maxWeeklyConsumption: number // Максимальный расход за 4 недели
  averageWeeklyConsumption: number // Средний расход за 4 недели
  weeksAnalyzed: number       // Количество недель с данными
  lastConsumptionDate: DateTime
}

function calculateWeeklyConsumption(productId: string, storeId?: string): ConsumptionData {
  // 1. Получаем данные из iikoReceiptItem за последние 4 недели
  // 2. Фильтруем по типу операции (списание, расход)
  // 3. Группируем по неделям
  // 4. Вычисляем статистики
  // 5. Возвращаем максимальное значение как базовое для расчета
}
```

### Расчет буферного запаса
```typescript
function calculateBufferStock(productId: string): number {
  const consumption = calculateWeeklyConsumption(productId)
  const buffer = getProductBuffer(productId)
  
  if (!buffer || !buffer.isActive) {
    return 0
  }
  
  // Базовый буфер на основе расхода
  const baseBuffer = Math.ceil(consumption.maxWeeklyConsumption * (buffer.bufferDays / 7))
  
  // Применяем ограничения
  return Math.max(
    buffer.minBuffer,
    Math.min(buffer.maxBuffer, baseBuffer)
  )
}
```

### Формирование заказа
```typescript
interface OrderCalculation {
  productId: string
  productName: string
  supplierId: string
  supplierName: string
  isPrimarySupplier: boolean
  
  // Расчетные данные
  weeklyConsumption: number
  bufferStock: number
  currentStock: number
  orderQuantity: number      // К заказу (буфер - max(текущий остаток, 0))
  
  // Дополнительная информация
  price?: number
  totalAmount?: number
  deliveryDays: number
  unit: string
  lastOrderDate?: DateTime
  notes?: string
}

function calculateOrderQuantity(productId: string, storeId: string): OrderCalculation {
  const consumption = calculateWeeklyConsumption(productId, storeId)
  const bufferStock = calculateBufferStock(productId)
  const currentStock = getCurrentStock(productId, storeId)
  
  // Основная формула: буфер - max(текущий остаток, 0)
  const orderQuantity = bufferStock - Math.max(currentStock, 0)
  
  // Получаем поставщика (основного или запасного)
  const supplier = getSupplierForProduct(productId)
  
  return {
    productId,
    productName: getProductName(productId),
    supplierId: supplier.id,
    supplierName: supplier.name,
    isPrimarySupplier: supplier.isPrimary,
    weeklyConsumption: consumption.maxWeeklyConsumption,
    bufferStock,
    currentStock,
    orderQuantity,
    price: supplier.price,
    totalAmount: orderQuantity * (supplier.price || 0),
    deliveryDays: supplier.deliveryDays,
    unit: supplier.unit,
    lastOrderDate: getLastOrderDate(productId, supplier.id)
  }
}
```

### Выбор поставщика
```typescript
function getSupplierForProduct(productId: string): ProductSupplier {
  const suppliers = getProductSuppliers(productId)
  
  // 1. Ищем активного основного поставщика
  const primary = suppliers.find(s => s.isPrimary && s.isActive)
  if (primary) return primary
  
  // 2. Ищем запасного поставщика по приоритету
  const backup = suppliers
    .filter(s => !s.isPrimary && s.isActive)
    .sort((a, b) => a.priority - b.priority)[0]
  
  if (backup) return backup
  
  // 3. Если нет активных поставщиков, возвращаем неактивного основного
  return suppliers.find(s => s.isPrimary) || suppliers[0]
}
```

## 🎨 UI Компоненты

### Страницы
```
/purchasing/
├── orders/                 # Список заказов
├── calculate/             # Расчет заказов
├── buffers/               # Управление буферами
├── suppliers/             # Поставщики продуктов
├── schedule/              # График заказов
├── stock/                 # Остатки
└── reports/               # Отчеты по закупкам
```

### Компоненты
```typescript
// Основные компоненты
OrderCalculator             // Калькулятор заказов
BufferManager              // Управление буферами
SupplierSelector           // Выбор поставщика
StockViewer                // Просмотр остатков
OrderForm                  // Форма заказа
ScheduleManager            // Управление графиком

// Вспомогательные компоненты
ConsumptionChart           // График расхода
StockHistoryChart          // История остатков
OrderStatusBadge           // Статус заказа
SupplierPriorityEditor     // Редактор приоритетов
AutoOrderSettings          // Настройки автозаказов
```

## 🔄 Workflow

### 1. Настройка системы
1. **Настройка буферов** для каждого ингредиента
2. **Привязка поставщиков** к продуктам (основной + запасные)
3. **Настройка графика** еженедельных заказов
4. **Синхронизация остатков** с iiko

### 2. Еженедельный процесс
1. **Автоматический расчет** заказов по графику
2. **Проверка и корректировка** расчетов
3. **Создание заказов** поставщикам
4. **Отправка заказов** (email, телефон, etc.)
5. **Отслеживание доставки**

### 3. Контроль и анализ
1. **Обновление остатков** после доставки
2. **Анализ эффективности** закупок
3. **Корректировка буферов** на основе статистики
4. **Отчеты по закупкам**

## 📈 Отчеты

### 1. Отчет по расходу ингредиентов
- Расход по неделям за последние 12 недель
- Тренды и сезонность
- Прогноз на следующие недели

### 2. Отчет по эффективности закупок
- Процент выполнения заказов
- Средние сроки доставки
- Сравнение поставщиков

### 3. Отчет по остаткам
- Текущие остатки по складам
- История изменений
- Прогноз исчерпания запасов

### 4. Отчет по буферам
- Анализ адекватности буферов
- Рекомендации по корректировке
- Статистика перезаказа/недостачи

## 🔧 Интеграции

### С iiko
- **Продукты**: `iikoProduct` (ингредиенты)
- **Расход**: `iikoReceiptItem` (списания, расход)
- **Остатки**: `iikoStoreBalance` (текущие остатки)

### С финансами
- **Поставщики**: `Counterparty` (type = 'supplier')
- **Заказы**: создание документов расходов
- **Платежи**: связь с заказами

## 🚀 Планы развития

### Фаза 1 (MVP)
- Базовый расчет заказов
- Управление буферами
- Простые заказы поставщикам

### Фаза 2
- График заказов
- Автоматическое создание заказов
- Расширенные отчеты

### Фаза 3
- Прогнозирование спроса
- Оптимизация закупок
- Интеграция с внешними системами

## 📋 Чек-лист реализации

### Backend
- [ ] Модели данных (Prisma schema)
- [ ] API endpoints
- [ ] Бизнес-логика расчетов
- [ ] Интеграция с iiko
- [ ] Автоматические задачи (cron)

### Frontend
- [ ] Страницы управления
- [ ] Компоненты UI
- [ ] Формы и валидация
- [ ] Графики и отчеты
- [ ] Уведомления

### Тестирование
- [ ] Unit тесты бизнес-логики
- [ ] Integration тесты API
- [ ] E2E тесты UI
- [ ] Тестирование расчетов

### Документация
- [ ] API документация
- [ ] Руководство пользователя
- [ ] Техническая документация
