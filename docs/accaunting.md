Отлично, делаем подробное ТЗ **Cafe Finance Lite v3** с учётом долгов, раздельных дат (факт vs учётный месяц) и **трёх видов деятельности: Операционная / Инвестиционная / Финансовая**. Ниже — всё для постановки задачи в Cursor: модели, бизнес-правила, отчёты (структуры колонок, формулы, примеры), валидации, роли, тест-кейсы.

# 0) Принципы

* **Одна валюта.**
* **Два измерения времени:**

  * `operation_date` — фактическая дата события (смена/платёж/чек/выписка).
  * `posting_period` — месяц, к которому относится доход/расход (попадает в P&L).
* **Долги** — любой неоплаченный ExpenseDoc = обязательство (rent, поставщики).
* **3 вида деятельности (Activity):**

  * **OPEX/Revenue → Операционная**,
  * **CapEx/Disposals → Инвестиционная**,
  * **Кредиты/проценты/дивиденды → Финансовая**.
    Используются в **Cash Flow** и как аналитика категорий расходов/поступлений.

---

# 1) Сущности и связи (минимальная ER-модель)

## 1.1 Справочники

* **channel(id, name)** — 'Dine-in','Pickup','Grab','Foodpanda' …
* **tender_type(id, name)** — 'cash','card','qr','aggregator'
* **money_account(id, name, kind)** — 'cash','bank','acquirer','aggregator'
* **vendor(id, name, phone, email)**
* **expense_category(id, name, kind, activity)**

  * `kind`: 'COGS','OPEX','CAPEX','TAX','FEE','OTHER'
  * `activity`: 'operating' | 'investing' | 'financing' (по умолчанию для Cash Flow)
* **revenue_category(id, name)** (опционально, если нужно детализировать выручку)

## 1.2 Операции

* **shift(id, open_at, close_at, opened_by, closed_by, note)**
* **shift_sale(id, shift_id, channel_id, tender_type_id, gross_amount, discounts, refunds, revenue_category_id?)**

## 1.3 Расходы и долги

* **expense_doc(…)** — обязательство/расход

  * `operation_date DATE` — дата счёта/акта/чека
  * `posting_period DATE` — 1-е число месяца, к которому относится расход
  * `amount NUMERIC(18,2)` — сумма документа
  * `paid_amount NUMERIC(18,2)` — суммарно оплачено
  * `status` — 'draft'|'unpaid'|'partial'|'paid'|'void'
  * `expense_category_id`, `vendor_id`, `activity` (можно переопределить дефолт из категории)
  * `memo TEXT`
* **payment(id, expense_doc_id?, money_account_id, date, amount, memo, activity?)**

  * Если `expense_doc_id` пуст → разовый платёж (например, комиссия банка).
  * `activity` можно задать явно для корректной классификации в Cash Flow.
* **payment_allocation(id, payment_id, expense_doc_id, amount)** — распределение одного платежа на несколько документов.
* **cash_tx(id, money_account_id, date, direction, amount, source_type, source_id, memo, activity)**

  * Запись о реальном движении денег (всегда создаётся из Shift/Payment/Импорта).
  * `direction`: 'in'|'out'.
  * `activity` — операционная/инвест./финансовая (для Cash Flow).

## 1.4 Сверки

* **bank_statement(id, money_account_id, period_start, period_end, imported_at)**
* **bank_statement_line(id, statement_id, date, amount, description, external_ref)**
* **payout_register(id, aggregator_name, period_start, period_end, imported_at)**
* **payout_register_line(id, register_id, date, order_count, gross_sales, platform_fee, net_payout, external_ref)**

> Связи:
> Shift → ShiftSale; Payment → PaymentAllocation → ExpenseDoc;
> Любой платёж/смена/реестр создаёт/ссылается на **cash_tx**;
> bank_statement_line матчится с подходящим **cash_tx**.

---

# 2) Бизнес-логика

## 2.1 Продажи (выручка)

* Закрытие смены создаёт `shift_sale` по каналам×способам оплаты.
* Автогенерация `cash_tx`:

  * наличные → money_account.kind='cash' (in),
  * карта/QR → 'acquirer' (in) — ожидаем поступление на банк,
  * агрегатор → 'aggregator' (in) — ожидаем выплату.
* (Опция) Заполнить `posting_period` продаж = месяц `close_at`.

## 2.2 Расходы и долги

* Создаём **expense_doc** (пример: аренда янв 50 000):

  * `operation_date='2025-02-05'` (получили счёт 5 фев),
  * `posting_period='2025-01-01'` (относим к январю),
  * `expense_category='Аренда' (kind=OPEX, activity=operating)`,
  * `status='unpaid'`.
* При оплате (10 фев): создаём **payment** `date='2025-02-10', amount=50 000, account=Bank` →

  * `cash_tx(out, Bank, 50 000, activity=operating)`
  * `payment_allocation` закрывает документ; `paid_amount` растёт; статус → 'paid/partial'.
* Частичные оплаты — несколько `payment_allocation` на один `expense_doc`.

## 2.3 Сверка банка и агрегаторов

* Импорт выписки/реестра.
* Автосопоставление по сумме (±1%), дате (±2 дня), ключевым словам/ID.
* Если нет совпадения — предложить создать `payment` (для списаний) или «поступление агрегатора» (для выплат).
* Комиссии агрегатора: из реестра формировать

  * `cash_tx(out)` на «Комиссия агрегатора» (activity=operating),
  * `cash_tx(in)` на банк по `net_payout`.

## 2.4 Классификация по видам деятельности

* Дефолт берём из **expense_category.activity** или из типа источника:

  * Продажи/COGS/OPEX → **operating**.
  * Покупка/продажа оборудования (CAPEX/Disposal) → **investing**.
  * Кредиты, проценты, дивиденды, пополнение/вывод собственника → **financing**.
* Можно переопределить на уровне **payment** или **cash_tx**, если кейс особый.

---

# 3) Отчёты — структуры, поля, формулы

## 3.1 P&L (Отчёт о прибылях и убытках)

**Смысл:** начисленный результат по **posting_period**.

**Параметры фильтра:**
`period_from`, `period_to` (месяцы), `channel?`, `vendor?`, `category?`.

**Колонки (помесячно или по одному месяцу):**

* Период (YYYY-MM)
* Выручка (нетто) = Σ `shift_sale.gross_amount - discounts - refunds` по `posting_period`
* COGS (себестоимость) = Σ `expense_doc.amount` где `category.kind='COGS'` по `posting_period`
* Валовая прибыль = Выручка − COGS
* OPEX = Σ `expense_doc.amount` где `kind='OPEX'` по `posting_period`
* Прочие доходы/расходы (если нужны отдельные категории)
* **Операционная прибыль** = Валовая − OPEX

**Разрезы (доп. таблицы/фильтры):**

* По каналам (на основе продаж),
* По категориям расходов,
* По поставщикам (top-N).

**Пример строки P&L Январь 2025:**

* Выручка 900 000; COGS 360 000; Валовая 540 000; OPEX 320 000 → Прибыль 220 000.
  (Аренда за январь, оплаченная в феврале, включена в OPEX января за счёт `posting_period`.)

---

## 3.2 Cash Flow (ДДС) — прямой метод

**Смысл:** реальные движения денег по **operation_date**, с разбиением на 3 вида деятельности.

**Параметры:** `date_from`, `date_to`, `account?`.

**Структура (помесячно / за период):**

* Период (YYYY-MM)
* **Операционная деятельность:**

  * Поступления от продаж (наличные, банковские поступления от эквайринга/агрегатора) = Σ `cash_tx.in` с `activity=operating`
  * Выплаты операционные (COGS, аренда, коммуналка, зарплата*, комиссии банка/агрегаторов) = Σ `cash_tx.out` `activity=operating`
  * **Net Operating CF**
* **Инвестиционная деятельность:**

  * Поступления (продажа ОС и т.п.) = Σ `cash_tx.in` `activity=investing`
  * Выплаты (покупка оборудования, ремонт как CAPEX) = Σ `cash_tx.out` `activity=investing`
  * **Net Investing CF**
* **Финансовая деятельность:**

  * Поступления (займы полученные, вклад собственника) = Σ `cash_tx.in` `activity=financing`
  * Выплаты (погашение кредитов, проценты, дивиденды, вывод собственника) = Σ `cash_tx.out` `activity=financing`
  * **Net Financing CF**
* **Итог чистый денежный поток** = Σ Net по трём блокам
* Начальный остаток, Конечный остаток (по выбранным счётам)

**Замечания:**

* Поступление от эквайринга попадает в CF, когда деньги пришли на **банк** (а не в день смены).
* Операция «инкассация» (касса→банк) — **внутренний перевод**, его можно:

  * либо показывать отдельно (раздел «Переводы внутри»),
  * либо исключать из сводного CF (чтобы не искажать внешний поток). Рекомендация — **исключать** из итогов, но показывать справочно.

---

## 3.3 Дневная сводка (по сменам)

**Параметры:** `date` или диапазон дат.

**Колонки:**

* Дата/Смена
* Канал
* Способ оплаты
* Выручка брутто
* Скидки
* Возвраты
* Выручка нетто
* Наличные к инкассации (нетто по tender='cash')
* Комментарий (если кассовый недостач/излишек — фиксируется отдельно)

**Группировки:**
по дню/смене, по каналу, по способу оплаты.

---

## 3.4 Отчёт «Долги» (Aging по расходам)

**Параметры:** `as_of_date`, `vendor?`, `category?`.

**Колонки:**

* Поставщик
* Документ (№/дата `operation_date`)
* Posting Period (YYYY-MM)
* Сумма документа
* Оплачено
* Остаток долга
* Возраст долга (bucket): 0–30 / 31–60 / 61–90 / 90+

**Секция итогов:**

* Итого по поставщику и по всем поставщикам,
* Сводка по bucket’ам.

---

# 4) Правила заполнения дат

* **operation_date**:

  * смена → `shift.close_at::date`,
  * платеж → дата списания/поступления по факту (или дата выписки),
  * реестр агрегатора → дата поступления net-выплаты.
* **posting_period**:

  * продажи → месяц `close_at`,
  * аренда — месяц, к которому относится (может отличаться от `operation_date`),
  * COGS — чаще = месяцу фактического потребления/продажи (если не усложняем — по дате накладной).

Храним `posting_period` как `DATE` с **первым числом месяца** (например, `2025-01-01`) для простых фильтров и индексов.

---

# 5) Преднастройки категорий (рекомендуемый справочник)

**Операционная (operating):**

* COGS: Мясо/Рыба, Овощи/Фрукты, Молочка, Сухие, Напитки, Упаковка
* OPEX: Аренда, Коммуналка, Зарплата*, Связь/Интернет, Маркетинг, Хозтовары
* Fees: Комиссия банка, Комиссия агрегатора

**Инвестиционная (investing):**

* Покупка оборудования/ремонта (CAPEX)
* Продажа оборудования

**Финансовая (financing):**

* Кредиты полученные/погашения
* Проценты по кредитам
* Вклад/Вывод собственника
* Дивиденды

* Зарплату можно учитывать агрегированно как OPEX (без детализации ведомостей).

---

# 6) DDL (ориентир для миграций)

```sql
-- Channels / Tenders
CREATE TABLE channel(id SERIAL PRIMARY KEY, name VARCHAR(50) NOT NULL);
CREATE TABLE tender_type(id SERIAL PRIMARY KEY, name VARCHAR(50) NOT NULL);

-- Money accounts
CREATE TABLE money_account(
  id SERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  kind VARCHAR(20) NOT NULL CHECK (kind IN ('cash','bank','acquirer','aggregator')),
  is_active BOOLEAN DEFAULT TRUE
);

-- Vendors
CREATE TABLE vendor(id SERIAL PRIMARY KEY, name VARCHAR(200) NOT NULL, phone VARCHAR(64), email VARCHAR(200));

-- Expense categories
CREATE TABLE expense_category(
  id SERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  kind VARCHAR(20) NOT NULL CHECK (kind IN ('COGS','OPEX','CAPEX','TAX','FEE','OTHER')),
  activity VARCHAR(20) NOT NULL CHECK (activity IN ('operating','investing','financing'))
);

-- Shifts & Sales
CREATE TABLE shift(
  id SERIAL PRIMARY KEY,
  open_at TIMESTAMP NOT NULL,
  close_at TIMESTAMP NOT NULL,
  opened_by VARCHAR(100),
  closed_by VARCHAR(100),
  note TEXT
);

CREATE TABLE shift_sale(
  id SERIAL PRIMARY KEY,
  shift_id INT NOT NULL REFERENCES shift(id),
  channel_id INT NOT NULL REFERENCES channel(id),
  tender_type_id INT NOT NULL REFERENCES tender_type(id),
  gross_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  discounts NUMERIC(18,2) NOT NULL DEFAULT 0,
  refunds NUMERIC(18,2) NOT NULL DEFAULT 0,
  revenue_category_id INT
);

-- Expenses & Debts
CREATE TABLE expense_doc(
  id SERIAL PRIMARY KEY,
  vendor_id INT REFERENCES vendor(id),
  expense_category_id INT NOT NULL REFERENCES expense_category(id),
  operation_date DATE NOT NULL,
  posting_period DATE NOT NULL, -- first day of month
  amount NUMERIC(18,2) NOT NULL,
  paid_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL CHECK (status IN ('draft','unpaid','partial','paid','void')),
  activity VARCHAR(20) NOT NULL CHECK (activity IN ('operating','investing','financing')),
  memo TEXT
);

CREATE TABLE payment(
  id SERIAL PRIMARY KEY,
  expense_doc_id INT REFERENCES expense_doc(id),
  money_account_id INT NOT NULL REFERENCES money_account(id),
  date DATE NOT NULL,
  amount NUMERIC(18,2) NOT NULL,
  activity VARCHAR(20) CHECK (activity IN ('operating','investing','financing')),
  memo TEXT
);

CREATE TABLE payment_allocation(
  id SERIAL PRIMARY KEY,
  payment_id INT NOT NULL REFERENCES payment(id),
  expense_doc_id INT NOT NULL REFERENCES expense_doc(id),
  amount NUMERIC(18,2) NOT NULL
);

-- Cash movements
CREATE TABLE cash_tx(
  id SERIAL PRIMARY KEY,
  money_account_id INT NOT NULL REFERENCES money_account(id),
  date DATE NOT NULL,
  direction VARCHAR(10) NOT NULL CHECK (direction IN ('in','out')),
  amount NUMERIC(18,2) NOT NULL,
  source_type VARCHAR(30) NOT NULL, -- 'shift','payment','payout','bank_fee','transfer'
  source_id INT NOT NULL,
  memo TEXT,
  activity VARCHAR(20) NOT NULL CHECK (activity IN ('operating','investing','financing')),
  matched_statement_line_id INT
);

-- Bank statements / Aggregator payouts
CREATE TABLE bank_statement(
  id SERIAL PRIMARY KEY,
  money_account_id INT NOT NULL REFERENCES money_account(id),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  imported_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE bank_statement_line(
  id SERIAL PRIMARY KEY,
  statement_id INT NOT NULL REFERENCES bank_statement(id),
  date DATE NOT NULL,
  amount NUMERIC(18,2) NOT NULL,
  description TEXT,
  external_ref VARCHAR(100)
);

CREATE TABLE payout_register(
  id SERIAL PRIMARY KEY,
  aggregator_name VARCHAR(80) NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  imported_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE payout_register_line(
  id SERIAL PRIMARY KEY,
  register_id INT NOT NULL REFERENCES payout_register(id),
  date DATE NOT NULL,
  order_count INT,
  gross_sales NUMERIC(18,2),
  platform_fee NUMERIC(18,2),
  net_payout NUMERIC(18,2),
  external_ref VARCHAR(100)
);
```

Индексы: `expense_doc(posting_period)`, `cash_tx(date)`, `cash_tx(activity)`, `bank_statement_line(date, amount)`, `payment(expense_doc_id)`.

---

# 7) Алгоритмы отчётов (SQL-эскизы)

## 7.1 P&L (помесячно)

```sql
-- Выручка по месяцу (по закрытию смены)
WITH sales AS (
  SELECT date_trunc('month', s.close_at)::date AS posting_period,
         SUM(ss.gross_amount - ss.discounts - ss.refunds) AS revenue
  FROM shift s
  JOIN shift_sale ss ON ss.shift_id = s.id
  GROUP BY 1
),
cogs AS (
  SELECT posting_period, SUM(amount) AS cogs
  FROM expense_doc ed
  JOIN expense_category ec ON ec.id = ed.expense_category_id
  WHERE ec.kind = 'COGS' AND ed.status <> 'void'
  GROUP BY posting_period
),
opex AS (
  SELECT posting_period, SUM(amount) AS opex
  FROM expense_doc ed
  JOIN expense_category ec ON ec.id = ed.expense_category_id
  WHERE ec.kind = 'OPEX' AND ed.status <> 'void'
  GROUP BY posting_period
)
SELECT p.posting_period,
       COALESCE(sales.revenue,0) AS revenue,
       COALESCE(cogs.cogs,0) AS cogs,
       COALESCE(sales.revenue,0) - COALESCE(cogs.cogs,0) AS gross_profit,
       COALESCE(opex.opex,0) AS opex,
       (COALESCE(sales.revenue,0) - COALESCE(cogs.cogs,0)) - COALESCE(opex.opex,0) AS operating_profit
FROM (
  SELECT DISTINCT posting_period FROM expense_doc
  UNION
  SELECT DISTINCT date_trunc('month', close_at)::date FROM shift
) p
LEFT JOIN sales ON sales.posting_period = p.posting_period
LEFT JOIN cogs  ON cogs.posting_period  = p.posting_period
LEFT JOIN opex  ON opex.posting_period  = p.posting_period
ORDER BY p.posting_period;
```

## 7.2 Cash Flow (по видам деятельности)

```sql
SELECT date_trunc('month', ct.date)::date AS period,
       ct.activity,
       SUM(CASE WHEN ct.direction='in'  THEN ct.amount ELSE 0 END) AS inflow,
       SUM(CASE WHEN ct.direction='out' THEN ct.amount ELSE 0 END) AS outflow,
       SUM(CASE WHEN ct.direction='in'  THEN ct.amount ELSE -ct.amount END) AS net_cf
FROM cash_tx ct
GROUP BY 1,2
ORDER BY 1,2;
```

(В разметке UI объединяем activity в три блока и считаем итоги.)

## 7.3 Долги (Aging)

```sql
WITH open_docs AS (
  SELECT ed.id, ed.vendor_id, ed.operation_date, ed.posting_period,
         ed.amount, ed.paid_amount,
         (ed.amount - ed.paid_amount) AS balance,
         GREATEST(0, DATE_PART('day', CURRENT_DATE - ed.operation_date)) AS age_days
  FROM expense_doc ed
  WHERE ed.status IN ('unpaid','partial')
)
SELECT v.name AS vendor,
       id AS doc_id,
       operation_date,
       posting_period,
       amount,
       paid_amount,
       balance,
       CASE
         WHEN age_days <= 30 THEN '0-30'
         WHEN age_days <= 60 THEN '31-60'
         WHEN age_days <= 90 THEN '61-90'
         ELSE '90+'
       END AS bucket
FROM open_docs od
LEFT JOIN vendor v ON v.id = od.vendor_id
ORDER BY vendor, operation_date;
```

---

# 8) UI/UX — экраны и поля

1. **Закрытие смены**

   * Поля ввода/импорта: канал × способ оплаты × (брутто, скидки, возвраты).
   * Кнопки: «Рассчитать нетто», «Закрыть смену».
   * Вывод: нетто по tender, нал к инкассации, «ожидаем к поступлению» (эквайринг/агрегатор).

2. **Расходы**

   * Форма ExpenseDoc: Поставщик, Категория, **operation_date**, **posting_period**, Сумма, Заметка.
   * Кнопки: «Сохранить (draft)», «Провести (unpaid)».
   * Таблица: статус, оплата/остаток, возраст долга.

3. **Оплата**

   * Поля: Дата, Счёт денег, Сумма, Поставщик?, Привязки к документам (allocation), Activity (override).
   * Результат: `cash_tx` + обновление статусов документов.

4. **Сверка**

   * Импорт выписки/реестра.
   * Две колонки: Выписка/Реестр ↔ Наши транзакции.
   * «Автосверка», «Связать», «Создать платёж/комиссию».
   * Индикатор расхождений.

5. **Отчёты**

   * P&L: выбор периода, разворот по каналам/категориям.
   * Cash Flow: по месяцам с блоками O/I/F, показатели inflow/outflow/net, остатки.
   * Долги: фильтры, buckets, экспорт.
   * Дневная сводка: по дням/сменам.

---

# 9) Валидации и инварианты

* `posting_period` всегда = 1-е число месяца.
* `expense_doc.amount ≥ 0`, `paid_amount` считается из allocations.
* Нельзя пометить «paid», если `paid_amount < amount`.
* `payment_allocation.amount` ≤ остаток документа и ≤ суммы платежа; сумма allocations = сумме платежа (или ≤, если часть не распределяем).
* Любой `cash_tx` должен иметь `activity`.
* Импорт выписки: не создавать дубли по `(date, amount, external_ref)`.

---

# 10) Роли и права

* **Владелец** — всё + закрытие периода.
* **Менеджер смены** — смены/расходы/просмотр отчётов.
* **Бухгалтер** — платежи/импорты/сверка/отчёты.
* **Просмотр** — только отчёты.

---

# 11) Процедуры периода

* **Закрытие месяца (lock):** заморозить `posting_period <= lock_date`; изменения — только корректировкой в текущем периоде.
* **Инвентаризация (опционально):** если будете считать COGS по складу — отдельный модуль (в Lite можно вручную).

---

# 12) Тест-кейсы (ключевые)

1. **Аренда (долг с переносом):**

   * ED: op=05.02, pp=01.2025, 50 000, unpaid.
   * Payment 10.02 (50 000, Bank).
   * P&L Январь содержит 50 000; Cash Flow Февраль содержит out 50 000 (operating).
   * Отчёт «Долги» на 31.01 показывает долг 50 000, на 28.02 — 0.

2. **Эквайринг:**

   * Смена 01.03: карта 120 000. Создан `cash_tx(in, acquirer, 120 000)` (ожидание).
   * 03.03 поступило на банк 118 800, комиссия 1 200.

     * Импорт выписки: сопоставить 118 800 → создать `cash_tx(in, bank, 118 800)` и `cash_tx(out, bank, 1 200, activity=operating, memo='Bank fee')` (или через payment).
   * Cash Flow: inflow операц. = 118 800, out операц. = 1 200.

3. **CAPEX (инвестиции):**

   * Покупка печи 200 000 (op=15.04, pp=04.2025, category=CAPEX, activity=investing), оплата 20.04.
   * P&L апреля — не включает CAPEX (если не амортизируем в Lite).
   * Cash Flow апреля — investing out 200 000.

4. **Кредит (финансовая):**

   * Получили займ 300 000 на банк 05.05 → `cash_tx(in, bank, 300 000, financing)`.
   * Погасили 100 000 20.06 → `cash_tx(out, bank, 100 000, financing)`.
   * Проценты 6 000 в июне → ExpenseDoc(OPEX? financing?), Payment → `cash_tx(out, bank, 6 000, financing)`.

---

# 13) Ответы на твои вопросы (коротко)

* **Долги** учитываем через `expense_doc` со статусами и `posting_period`; оплата частями — через `payment_allocation`.
* **Разделение дат**: `operation_date` — факт, `posting_period` — месяц для P&L.
* **3 вида деятельности** — да, используем **в обязательном порядке** для Cash Flow, и как аналитику категорий/платежей (operating/investing/financing).
