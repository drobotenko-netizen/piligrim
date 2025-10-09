# 🏗️ Диаграммы архитектуры Piligrim

## 📐 Общая архитектура системы

```mermaid
graph TB
    subgraph "Client Layer"
        Browser[Веб-браузер]
        NextJS[Next.js 14 App]
        Components[React Components]
        Hooks[Custom Hooks]
    end
    
    subgraph "Network"
        Caddy[Caddy Reverse Proxy]
    end
    
    subgraph "Server Layer"
        Express[Express.js API]
        Middleware[Middleware Chain]
        Routers[Domain Routers]
        Services[Business Services]
    end
    
    subgraph "Data Layer"
        Prisma[Prisma ORM]
        SQLite[(SQLite DB)]
    end
    
    subgraph "External Services"
        Telegram[Telegram Bot API]
        iiko[iiko Restaurant API]
        GSheets[Google Sheets API]
    end
    
    Browser --> Caddy
    Caddy --> NextJS
    Caddy --> Express
    
    NextJS --> Components
    Components --> Hooks
    Hooks -->|REST API| Express
    
    Express --> Middleware
    Middleware --> Routers
    Routers --> Services
    Services --> Prisma
    Prisma --> SQLite
    
    Express -->|Auth| Telegram
    Express -->|Import Data| iiko
    Express -->|Import Finance| GSheets
    
    style Browser fill:#e1f5ff
    style NextJS fill:#61dafb
    style Express fill:#68a063
    style Prisma fill:#2d3748
    style SQLite fill:#003b57
```

## 🎯 Слоистая архитектура (Layered Architecture)

```mermaid
graph TD
    subgraph "Presentation Layer"
        UI[UI Components]
        Forms[Forms & Inputs]
        Tables[Data Tables]
        Charts[Charts & Graphs]
    end
    
    subgraph "Application Layer"
        API[REST API Endpoints]
        Auth[Authentication]
        Validation[Input Validation]
        BL[Business Logic]
    end
    
    subgraph "Data Access Layer"
        ORM[Prisma Client]
        Queries[Database Queries]
        Migrations[Schema Migrations]
    end
    
    subgraph "Database"
        DB[(SQLite)]
    end
    
    UI --> API
    Forms --> API
    Tables --> API
    Charts --> API
    
    API --> Auth
    API --> Validation
    API --> BL
    
    BL --> ORM
    ORM --> Queries
    Queries --> DB
    Migrations --> DB
    
    style UI fill:#61dafb
    style API fill:#68a063
    style ORM fill:#2d3748
    style DB fill:#003b57
```

## 🧩 Модульная структура Backend

```mermaid
graph LR
    subgraph "HR Domain"
        Employees[employees/]
        Positions[positions/]
        Timesheets[timesheets/]
        Payroll[payroll/]
    end
    
    subgraph "Finance Domain"
        Accounts[accounts/]
        Categories[categories/]
        Transactions[transactions/]
        Payments[payments/]
        ExpenseDocs[expense-docs/]
    end
    
    subgraph "Sales Domain"
        Shifts[shifts/]
        Channels[channels/]
        TenderTypes[tender-types/]
    end
    
    subgraph "Purchasing Domain"
        Purchasing[purchasing/]
        Suppliers[suppliers/]
        Orders[orders/]
    end
    
    subgraph "Integration"
        iiko[iiko/]
        GSheets[gsheets/]
        Telegram[telegram/]
    end
    
    subgraph "System"
        Auth[auth/]
        Admin[admin/]
    end
    
    style Employees fill:#ffd700
    style Accounts fill:#98fb98
    style Shifts fill:#87ceeb
    style Purchasing fill:#dda0dd
    style iiko fill:#ffa07a
    style Auth fill:#ff6b6b
```

## 🔄 Поток данных (Data Flow)

```mermaid
sequenceDiagram
    participant U as User (Browser)
    participant C as Client (Next.js)
    participant A as API (Express)
    participant M as Middleware
    participant R as Router
    participant S as Service
    participant P as Prisma
    participant D as Database
    
    U->>C: Открыть страницу /employees
    C->>C: Server-side rendering
    C->>A: GET /api/employees
    A->>M: Auth middleware
    M->>M: Verify JWT
    M->>M: Get tenant
    M->>R: employees router
    R->>P: prisma.employee.findMany()
    P->>D: SELECT * FROM Employee
    D-->>P: Rows
    P-->>R: Employee[]
    R-->>A: { data: [...] }
    A-->>C: JSON response
    C->>C: Hydrate component
    C-->>U: Render page
    
    U->>C: Создать сотрудника
    C->>A: POST /api/employees
    A->>M: Auth + Validation
    M->>R: employees router
    R->>S: create employee
    S->>P: prisma.employee.create()
    P->>D: INSERT INTO Employee
    D-->>P: Created row
    P-->>S: Employee
    S-->>R: Employee
    R-->>A: { data: {...} }
    A-->>C: JSON response
    C->>C: Update local state
    C-->>U: Show success
```

## 🔐 Авторизация (Authentication Flow)

```mermaid
sequenceDiagram
    participant U as User
    participant C as Client
    participant A as API
    participant T as Telegram Bot
    participant DB as Database
    
    U->>C: Нажать "Войти через Telegram"
    C->>A: POST /api/auth/magic/request
    A->>DB: Найти User по phone
    A->>DB: Создать MagicLinkToken
    A->>T: Отправить сообщение с ссылкой
    T-->>U: Telegram сообщение
    
    U->>T: Нажать на ссылку
    T-->>U: Открыть браузер
    U->>C: GET /api/auth/magic/verify?token=xxx
    C->>A: Verify token
    A->>DB: Найти MagicLinkToken
    A->>DB: Отметить token как использованный
    A->>A: Создать JWT
    A->>C: Set-Cookie: access_token
    C-->>U: Redirect на /dashboard
    
    U->>C: Запросить данные
    C->>A: GET /api/employees (с cookie)
    A->>A: Verify JWT из cookie
    A->>DB: Получить данные
    DB-->>A: Data
    A-->>C: Response
    C-->>U: Показать данные
```

## 💾 Модель данных (Entity Relationship)

```mermaid
erDiagram
    Tenant ||--o{ Employee : has
    Tenant ||--o{ Position : has
    Tenant ||--o{ Account : has
    Tenant ||--o{ Transaction : has
    Tenant ||--o{ Category : has
    Tenant ||--o{ User : has
    
    Position ||--o{ Employee : "assigned to"
    Employee ||--o{ Timesheet : tracks
    Employee ||--o{ Payout : receives
    
    Account ||--o{ Transaction : "records"
    Category ||--o{ Transaction : "categorizes"
    Category ||--o{ Article : contains
    
    Counterparty ||--o{ Transaction : "party to"
    Counterparty ||--o{ ExpenseDoc : "vendor for"
    
    ExpenseDoc ||--o{ Payment : "paid by"
    Payment ||--o{ PaymentAllocation : "allocated through"
    PaymentAllocation }o--|| ExpenseDoc : "allocates to"
    
    User ||--o{ UserRole : "has"
    Role ||--o{ UserRole : "assigned to"
    Role ||--o{ RolePermission : "grants"
    Permission ||--o{ RolePermission : "granted through"
    
    User ||--o{ TelegramBinding : "bound to"
    User ||--o{ MagicLinkToken : "uses"
    
    Shift ||--o{ ShiftSale : contains
    Channel ||--o{ ShiftSale : "sells through"
    TenderType ||--o{ ShiftSale : "paid by"
```

## 🎨 Frontend структура (Feature-based)

```mermaid
graph TD
    subgraph "app/"
        Layout[layout.tsx]
        Dashboard[/(dashboard)/]
    end
    
    subgraph "Dashboard Features"
        Employees[employees/]
        Finance[finance/]
        Sales[sales/]
        iiko[iiko/]
        Admin[admin/]
    end
    
    subgraph "finance/"
        Accounts2[accounts/]
        Categories2[categories/]
        Payments2[payments/]
        Transactions2[transactions/]
        Reports[reports/]
    end
    
    subgraph "Shared"
        Components[components/ui/]
        Hooks2[hooks/]
        Lib[lib/]
    end
    
    Layout --> Dashboard
    Dashboard --> Employees
    Dashboard --> Finance
    Dashboard --> Sales
    Dashboard --> iiko
    Dashboard --> Admin
    
    Finance --> Accounts2
    Finance --> Categories2
    Finance --> Payments2
    Finance --> Transactions2
    Finance --> Reports
    
    Employees -.-> Components
    Finance -.-> Components
    Sales -.-> Components
    
    Employees -.-> Hooks2
    Finance -.-> Hooks2
    
    Hooks2 -.-> Lib
    
    style Layout fill:#61dafb
    style Components fill:#98fb98
    style Hooks2 fill:#ffd700
    style Lib fill:#dda0dd
```

## 🚀 Deployment Architecture

```mermaid
graph TB
    subgraph "Development"
        Dev[Developer]
        Git[Git Repository]
    end
    
    subgraph "CI/CD (будущее)"
        GHA[GitHub Actions]
        Tests[Run Tests]
        Build[Build Images]
    end
    
    subgraph "Production Server"
        Hook[post-receive hook]
        Docker[Docker Build]
        Compose[Docker Compose]
    end
    
    subgraph "Running Containers"
        Caddy2[Caddy Container]
        Web[Next.js Container]
        API[Express Container]
    end
    
    subgraph "Storage"
        DB2[(SQLite Volume)]
        Logs[Logs Volume]
    end
    
    Dev -->|git push prod| Git
    Git -->|trigger| Hook
    Hook --> Docker
    Docker --> Compose
    Compose --> Caddy2
    Compose --> Web
    Compose --> API
    
    API --> DB2
    Web --> Logs
    API --> Logs
    
    style Dev fill:#61dafb
    style Git fill:#f05032
    style Docker fill:#2496ed
    style Caddy2 fill:#1f88c0
    style Web fill:#000000
    style API fill:#68a063
```

## 🔄 Middleware Chain

```mermaid
graph LR
    Request[HTTP Request]
    
    subgraph "Global Middleware"
        CORS[CORS]
        JSON[body-parser]
        Cookie[cookie-parser]
        ALS[AsyncLocalStorage]
        Guard[Auth Guard]
    end
    
    subgraph "Route Middleware"
        Validate[validateYearMonth]
        Tenant[attachTenant]
        Async[asyncHandler]
    end
    
    Handler[Route Handler]
    Response[HTTP Response]
    
    Request --> CORS
    CORS --> JSON
    JSON --> Cookie
    Cookie --> ALS
    ALS --> Guard
    Guard --> Validate
    Validate --> Tenant
    Tenant --> Async
    Async --> Handler
    Handler --> Response
    
    style Request fill:#e1f5ff
    style Guard fill:#ff6b6b
    style Handler fill:#68a063
    style Response fill:#98fb98
```

## 📊 Система закупок (Purchasing System)

```mermaid
graph TD
    subgraph "Данные из iiko"
        Products[Продукты]
        Recipes[Рецепты]
        Consumption[Расход за период]
        Stock[Остатки на складах]
    end
    
    subgraph "Настройки"
        Suppliers[Поставщики продуктов]
        Buffers[Буферные запасы]
        Settings[Настройки закупа]
    end
    
    subgraph "Расчёт"
        Calc[Калькулятор заказа]
        Forecast[Прогноз расхода]
    end
    
    subgraph "Заказы"
        Orders[Заказы поставщикам]
        Schedule[График заказов]
    end
    
    Products --> Calc
    Consumption --> Forecast
    Stock --> Calc
    
    Suppliers --> Calc
    Buffers --> Calc
    Settings --> Forecast
    
    Forecast --> Calc
    Calc --> Orders
    Schedule --> Orders
    
    style Products fill:#ffa07a
    style Calc fill:#98fb98
    style Orders fill:#87ceeb
```

## 🔗 Интеграции (External Integrations)

```mermaid
graph LR
    subgraph "Piligrim System"
        API2[Express API]
    end
    
    subgraph "iiko Integration"
        iikoAPI[iiko REST API]
        iikoETL[ETL Process]
        iikoData[(iiko Data)]
    end
    
    subgraph "Telegram Integration"
        TBot[Telegram Bot]
        TAuth[Auth Handler]
        TNotif[Notifications]
    end
    
    subgraph "Google Sheets"
        Sheets[Google Sheets API]
        Import[Import Service]
    end
    
    API2 -->|Fetch data| iikoAPI
    iikoAPI --> iikoETL
    iikoETL --> iikoData
    
    API2 -->|Send messages| TBot
    TBot --> TAuth
    TBot --> TNotif
    
    API2 -->|Import finance| Sheets
    Sheets --> Import
    
    style API2 fill:#68a063
    style iikoAPI fill:#ffa07a
    style TBot fill:#0088cc
    style Sheets fill:#34a853
```

---

## 📝 Легенда

### Цвета компонентов:
- 🔵 **Синий (#61dafb)** — React/Next.js компоненты
- 🟢 **Зелёный (#68a063)** — Backend/Express.js
- ⚫ **Тёмный (#2d3748)** — ORM/Prisma
- 🔷 **Тёмно-синий (#003b57)** — База данных
- 🔴 **Красный (#ff6b6b)** — Безопасность/Auth
- 🟡 **Жёлтый (#ffd700)** — HR модули
- 🟣 **Фиолетовый (#dda0dd)** — Закупки
- 🟠 **Оранжевый (#ffa07a)** — Внешние интеграции

### Типы связей:
- **→** Прямой вызов/зависимость
- **⇢** Асинхронная связь
- **--** Данные
- **-.** Переиспользование

---

*Диаграммы созданы с использованием Mermaid.js*  
*Последнее обновление: 9 октября 2025*

