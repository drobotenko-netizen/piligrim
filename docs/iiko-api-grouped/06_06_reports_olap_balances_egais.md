---
title: Отчёты: OLAP, балансы, ЕГАИС
source: https://ru.iiko.help/articles/#!api-documentations/iikoserver-api
generated: 2025-09-29T09:20:40.658Z
---

# Отчёты: OLAP, балансы, ЕГАИС

## Оглавление

---

Если вам не нужны общие результаты в OLAP-отчетах, указывайте в запросе значение параметра build-summary=false. Для крупных сетей значение build-summary=true может привести к зависанию сервера.
При построении OLAP-отчета рекомендуется использовать не более 7 полей.
Перед выполнением запросов на сервере клиента проверяйте их на демо-сервере.

Формирование OLAP отчета в API
Получить данные в API при помощи OLAP отчета можно следующими путями:

- получение данных по преднастроенному отчету в iikoOffice: в классическом приложении iikoOffice выбрать в навигационном меню раздела «Розничные продажи» - "OLAP Отчет по продажам", добавить в него поля и период для получения данных, сохранить данный вариант. Далее выгрузить список преднастроенных отчетов и получить информацию по полям и фильтрам при помощи метода «Получение отчета по сохраненной конфигурации».

- самостоятельное формирование отчета OLAP, руководствуясь документацией.

В обоих случаях рекомендуется использовать OLAP v2. 

Тот же механизм доступен для работы с "OLAP Отчет по проводкам" в разделе "Финансы".

Описание примеров OLAP-отчетов в iikoOffice можно найти в здесь. 

Описание примеров OLAP-отчетов в API можно найти здесь. 

Подробное описание полей можно прочитать в статье по полям OLAP-отчета по продажам и в статье по полям OLAP-отчета по проводкам. 

Процесс формирования отчета в iikoOffice
В классическом приложении iikoOffice выберите "OLAP Отчет по продажам" в навигационном меню раздела «Розничные продажи»:

Изображение выглядит как текст, снимок экрана, программное обеспечение, веб-страница  Содержимое, созданное искусственным интеллектом, может быть неверным.
После запуска «OLAP Отчет по продажам» укажите период сбора данных, добавьте поля для сбора данных.

Далее сохраните сформированный отчет, дайте ему название.

Готово. Отчет сохранен и готов к выгрузке через API.
Дополнительно: при нажатии на комбинацию клавиш «CTRL + SHIFT + F3» выведется окно с параметрами OLAP-отчета, на которые можно ориентироваться при построение отчета в API.

Работа с API iikoServer
Метод для получения списка преднастроенных отчетов OLAP.

Ответ метода для рассматриваемого примера:

JSON
....  
{
        "id": "e45124ec-6455-4a1f-ba59-9aa3efe05f30",
        "name": "Отчет по проданным блюдам в смену",
        "buildSummary": null,
        "reportType": "SALES",
        "groupByRowFields": [
            "OpenDate.Typed",
            "SessionNum",
            "OpenTime",
            "CloseTime",
            "DishName",
            "OrderType",
            "Delivery.CustomerName",
            "Delivery.CustomerPhone",
            "PayTypes"
        ],
        "groupByColFields": [],
        "aggregateFields": [
            "DishSumInt"
        ],
        "filters": {
Метод для получения полей OLAP отчета v2 (если необходимость уточнить поля).

Метод для формирования OLAP отчета в API (с возможностью конфигурации тела запроса)
### POST Request	https://host:port.iiko.it/resto/api/v2/reports/olap?key=[token]
#### Параметры запроса

Параметр
Описание
key

Балансы по счетам, контрагентам и подразделениям
### Версия iiko: 5.2

### GET Request	https://host:port/resto/api/v2/reports/balance/counteragents
#### Параметры запроса
Параметр
Описание
timestamp
учетная-дата время отчета в формате yyyy-MM-dd'T'HH:mm:ss (обязательный)
account
id счета для фильтрации (необязательный, можно указать несколько)
counteragent
id контрагента для фильтрации (необязательный, можно указать несколько)
department
id подразделения для фильтрации (необязательный, можно указать несколько)
#### Что в ответе
Возвращает денежные балансы по указанным счетам, контрагентам и подразделениям на заданную учетную дату-время.

См. ниже пример результата.

#### Пример запроса и результата
Запрос

https://localhost:9080/resto/api/v2/reports/balance/counteragents?key=88e98be8-89c4-766b-a319-dc6d1f3b8cec&timestamp=2016-10-19T23:10:10

[+] Результат

Остатки на складах
### Версия iiko: 5.2

### GET Request	https://host:port/resto/api/v2/reports/balance/stores
#### Параметры запроса
Параметр
Описание
timestamp
учетная-дата время отчета в формате yyyy-MM-dd'T'HH:mm:ss (обязательный)
department
id подразделения для фильтрации (необязательный, можно указать несколько)
store	id склада для фильтрации (необязательный, можно указать несколько)
https://localhost:9080/resto/api/v2/reports/balance/stores?key=88e98be8-89c4-766b-a319-dc6d1f3b8cec&timestamp=2016-10-18T23:10:10

Результат

Код
[
    {
        "store": "657ded9f-a1a3-416c-91a4-5a2fc78e8a36",
Отчет по балансу на 3 регистре ЕГАИС (акцизные марки)
Получение обновлений состояния на 3 регистре
### Версия iiko: 7.4

### GET Request	https://host:port/resto/api/v2/reports/egais/marks/list
#### Параметры запроса
Название
Тип данных
Обязательный
Описание
fsRarId	List<String>	
Нет, по умолчанию

возвращаются данные для всех организаций.

Список РАР-идентификаторов организаций, баланс которых запрашивается
revisionFrom 	int	Нет, по умолчанию -1	
Номер ревизии, начиная с которой необходимо отфильтровать сущности.

Не включающий саму ревизию, т.е. ревизия объекта > revisionFrom.

#### Пример запроса и результат
Запрос

https://localhost:8080/resto/api/v2/reports/egais/marks/list?fsRarId=030000455388&fsRarId=030000455399&revisionFrom=100

[+] Пример результата
#### Описание полей

Поле
Тип данных
Описание
revision	int	Ревизия, по которую (включительно) выданы данные
fullUpdate	Boolean	
true - пакет является "полным обновлением", то есть, клиент должен удалить все имеющие данные, не перечисленные явно.

false - пакет является "частичным обновлением", клиент должен заменить закешированные записи с теми же ключами.

marksByBRegId	Map<String, EgaisBRegDto>	

Название вложенного поля - BRegId - Идентификатор Справки Б (Справки 2)

Значение вложенного поля:

Поле
Тип данных
Описание
dateTo	Дата в формате yyyy-MM-dd'T'HH:mm:ss.SSS	
Дата-время актуальности состояния:

MAX_DATE, если марка еще не списана
Дата-время списания + MAX_MARK_KEEP_DAYS дней, если списана документом, находящимся в нередактируемом статусе

Дата-время удаления последнего известного EgaisMarkTableItem (информация о движении акцизной марки) (для отсутствующих марок).
marksWrittenOff	Map<String, EgasMarkStateDto>	

Множество акцизных марок, списанных с баланса организации.

Название вложенного поля - полный текст акцизной марки.

Значения вложенного поля:

Параметр
Тип, формат
Описание
dateTo	Дата в формате yyyy-MM-dd'T'HH:mm:ss.SSS	
Дата-время актуальности состояния:

MAX_DATE, если марка еще не списана
Дата-время списания + MAX_MARK_KEEP_DAYS дней, если списана документом, находящимся в нередактируемом статусе

Дата-время удаления последнего известного EgaisMarkTableItem (информация о движении акцизной марки) (для отсутствующих марок).

OLAP-отчеты
Поля OLAP-отчета
### Версия iiko: 4.1

### GET Request	https://host:port/resto/api/v2/reports/olap/columns
#### Параметры запроса
Параметры	Описание
reportType	
Тип отчета:

SALES - По продажам
TRANSACTIONS - По транзакциям
DELIVERIES - По доставкам
#### Что в ответе
Json структура списка полей с информацией по возможностям фильтрации, агрегации и группировки.

Устаревшие поля (deprecated) не выводятся.

Структура списка полей 
JSON
"FieldName": {
  "name": "StringValue",
  "type": "StringValue",
  "aggregationAllowed": booleanValue,
  "groupingAllowed": booleanValue,
  "filteringAllowed": booleanValue,
  "tags": [
    "StringValue1",
    "StringValue2",
    ...,
    "StringValueN",
  ]
}

Название	Значение	Описание
FieldName 
Строка	Название колонки отчета. Именно это название используется для получения данных отчета
name 
Строка	Название колонки отчета в iikoOffice. Справочная информация.
type	Строка	
Тип поля. Возможны следующие значения:

ENUM - Перечислимые значения
STRING - Строка
ID - Внутренний идентификатор объекта в iiko (начиная с 5.0)
DATETIME - Дата и время
INTEGER - Целое
PERCENT - Процент (от 0 до 1)
DURATION_IN_SECONDS - Длительность в секундах
AMOUNT - Количество
MONEY - Денежная сумма
aggregationAllowed
true/false	Если true, то по данной колонке можно агрегировать данные
groupingAllowed
true/false	Если true, то по данной колонке можно группировать данные
filteringAllowed
true/false	Если true, то по данной колонке можно фильтровать данные
tags
Список строк	Список категорий отчета, к которому относится данное поле. Справочная информация. Соответствует списку в верхнем правом углу конструктора отчета в iikoOffice.
#### Пример запроса
https://localhost:8080/resto/api/v2/reports/olap/columns?key=5b119afe-9468-ab68-7d56-c71495e39ee4&reportType=SALES

Ответ 
JSON
{
  "PercentOfSummary.ByCol": {
    "name": "% по столбцу",
    "type": "PERCENT",
    "aggregationAllowed": true,
    "groupingAllowed": false,
    "filteringAllowed": false,
    "tags": [
      "Оплата"
    ]
  },
  "PercentOfSummary.ByRow": {
    "name": "% по строке",
    "type": "PERCENT",
    "aggregationAllowed": true,
    "groupingAllowed": false,
    "filteringAllowed": false,
    "tags": [
      "Оплата"
    ]
  },
  "Delivery.Email": {
    "name": "e-mail доставки",
    "type": "STRING",
    "aggregationAllowed": false,
    "groupingAllowed": true,
    "filteringAllowed": true,
    "tags": [
      "Доставка",
      "Клиент доставки"
    ]
  }
}

Общая информация (General info)
### Версия iiko: 4.1

### POST Request	https://host:port/resto/api/reports/olap
Content-type: Application/json; charset=utf-8

#### Тело запроса
JSON
{
  "reportType": "EnumValue",
  "buildSummary": "true",
  "groupByRowFields": [
    "groupByRowFieldName1",
    "groupByRowFieldName2",
    ...,
    "groupByRowFieldNameN"
  ],
  "groupByColFields": [
    "groupByColFieldName1",
    "groupByColFieldName2",
    ...,
    "groupByColFieldNameL"
  ],
  "aggregateFields": [
    "AggregateFieldName1",
    "AggregateFieldName2",
    ...,
    "AggregateFieldNameM"
  ],
  "filters": {
    filter1,
    filter2,
    ...
    filterK
  }
}

Название	Значение	Описание
reportType
SALES

TRANSACTIONS

DELIVERIES

Тип отчета:

SALES - По продажам
TRANSACTIONS - По проводками
DELIVERIES - По доставкам
buildSummary
true/false
Параметр появился в Version(iiko) 5.3.4. Считать ли итоговые значения. Необязательное, до версии 9.1.2 по умолчанию true, с версии 9.1.2 по умолчанию false.
groupByRowFields 
Список полей для группировки по строкам	Имена полей, по которым доступна группировка. Список полей можно получить через метод reports/olap/columns, как элементы данного списка используются поля FieldName из возвращаемой reports/olap/columns структуры. Для указания в данном списке доступны поля, у которых groupingAllowed = true
groupByColFields 
Список полей для группировки по столбцам	Необязательный. Имена полей, по которым доступна группировка. Список полей можно получить через метод reports/olap/columns, как элементы данного списка используются поля FieldName из возвращаемой reports/olap/columns структуры. Для указания в данном списке доступны поля, у которых groupingAllowed = true
aggregateFields 
Список полей для агрегации	Имена полей, по которым доступна агрегация. Список полей можно получить через метод reports/olap/columns, как элементы данного списка используются поля FieldName из возвращаемой reports/olap/columns структуры. Для указания в данном списке доступны поля, у которых filteringAllowed = true
filters 
Список фильтров	 См. описание структуры фильтров. Для указания в данном списке доступны поля, у которых filteringAllowed = true

Information	
Поля агрегации, учитывающие начальный остаток товара и денежный остаток (StartBalance.Amount, StartBalance.Money, FinalBalance.Amount, FinalBalance.Money) вычисляются суммированием всей таблицы проводок за все время работы системы (всей базы данных) без каких-либо оптимизаций. То есть, такой запрос может выполняться очень долго и замедлять работу сервера.
В 5.2 добавлено API для быстрого получения остатков: Отчеты по балансам. Во всех случаях рекомендуется пользоваться им вместо OLAP.

В 5.5 OLAP-отчеты с остатками оптимизированы с использованием балансовых таблиц ATransactionSum, ATransactionBalance, при условии, что применяются группировки и фильтры по полям из этих таблиц, см. признак StartBalanceOptimizable в описании полей.

То есть, правильно составленный запрос приведет к суммированию не всей таблицы проводок, а только лишь открытого периода. Обратите особое внимание на то, что оптимизировано только поле Account.Name (счет "текущей" стороны проводки, в том числе склад), а не Store (первый попавшийся "склад" проводки, взятый из: левой, правой части проводки, строки документа или самого документа).

Фильтры
Фильтр по значению 
JSON
"FieldName": {
"filterType": "filterTypeEnum",
"values": ["Value1","Value2",...,"ValueN"]
}

Работает для полей с типами:

ENUM
STRING
Название	Значение	Описание
FieldName
Имя поля для фильтрации	
Поле FieldName из возвращаемой reports/olap/columns структуры

filterType
IncludeValues / ExcludeValues	
IncludeValues - в фильтрации участвуют только перечисленные значения поля

ExcludeValues - в фильтрации участвуют значения поля, за исключением перечисленных

values 
Список значений поля	В зависимости от типа поля, это могут быть или enum из Расшифровки кодов базовых типов или текстовое значение поля
JSON
Поле FieldName из возвращаемой reports/olap/columns структуры

filterType
 Range	Фильтр по диапазону значений
from	Нижняя граница диапазона	Значение в формате, соответствующем типу поля
to	Верхняя граница диапазона	Значение в формате, соответствующем типу поля
includeLow	true/false	
Необязательное, по умолчанию true

true - нижняя граница диапазона включается в фильтр

false - нижняя граница диапазона не включается в фильтр

includeHigh	true/false	
Необязательное, по умолчанию false

true - верхняя граница диапазона включается в фильтр

false - верхняя граница диапазона не включается в фильтр

JSON
"SessionNum": {
"filterType": "Range",
"from": 758,
"to": 760,
"includeHigh": true
}

Фильтр по дате 
JSON
"FieldName": {
"filterType": "DateRange",
"periodType": "periodTypeEnum",
"from": "fromDateTime",
"to": "toDateTime",
"includeLow": booleanValue,
"includeHigh": booleanValue
}

Работает для полей с типами:

DATETIME
DATE
Название	Значение	Описание
FieldName 
Имя поля для фильтрации	
Поле FieldName из возвращаемой reports/olap/columns структуры

filterType
DateRange	Фильтр по диапазону значений
periodType
CUSTOM - вручную

OPEN_PERIOD - текущий открытый период

TODAY - сегодня

YESTERDAY - вчера

CURRENT_WEEK - текущая неделя

CURRENT_MONTH - текущий месяц

CURRENT_YEAR - текущий год

LAST_WEEK - прошлая неделя

LAST_MONTH - прошлый месяц

LAST_YEAR - прошлый год

Если период CUSTOM, то период задается вручную, используются поля from, to, includeLow, includeHigh

Для остальных типов периода данные параметры игнорируются (можно не использовать), кроме параметра from, его передача обязательна, его значение может быть любым.

from	Начальная дата	
Дата в формате yyyy-MM-dd'T'HH:mm:ss.SSS

to	Конечная дата	Дата в формате yyyy-MM-dd'T'HH:mm:ss.SSS
includeLow	true/false	
Необязательное, по умолчанию true

true - нижняя граница диапазона включается в фильтр

false - нижняя граница диапазона не включается в фильтр

includeHigh	true/false	Необязательное, по умолчанию false
true - верхняя граница диапазона включается в фильтр. Внимание: включение верхней границы имеет смысл только у полей, выдающих округленную ДАТУ, а не ДАТУ-ВРЕМЯ.

false - верхняя граница диапазона не включается в фильтр

Information	
В OLAP-отчете по проводкам ("reportType": "TRANSACTIONS") для фильтрации по *дате* рекомендуется использовать поле DateTime.DateTyped(или DateTime.Typed — но это дата-время)

В OLAP-отчете по продажам, а также доставкам используется поле OpenDate.Typed.

В 4.1 вместо отсутствующих полей OpenDate.Typed и DateTime.DateTyped используются поля OpenDate и DateTime.OperDayFilter соответственно.

Начиная с 5.5, каждый OLAP-запрос должен содержать фильтр по дате

JSON
"OpenDate.Typed": {
"filterType": "DateRange",
"periodType": "CUSTOM",
"from": "2014-01-01T00:00:00.000",
"to": "2014-01-03T00:00:00.000" 
}
Фильтр по дате и времени
XML
"filters": { 
"OpenDate.Typed": { 
"filterType": "DateRange", 
"periodType": "CUSTOM", 
"from": "2018-09-04", 
"to": "2018-09-04", 
"includeLow": true, 
"includeHigh": true 
},
"OpenTime": {
"filterType": "DateRange",
"periodType": "CUSTOM",
"from": "2018-09-04T01:00:00.000",
"to": "2018-09-04T23:00:00.000",
"includeLow": true,
"includeHigh": true
}
}

Ответ
JSON
{
  "data": [
    {
      "GroupFieldName1": "Value11",
      "GroupFieldName2": "Value12",
       ...,
      "GroupFieldNameN": "Value1N",
      "AggregateFieldName1": "Value11",
      "AggregateFieldName1": "Value12",
       ...,
      "AggregateFieldNameM": "Value1M"
    },
    ...,
    {
      "GroupFieldName1": "ValueK1",
      "GroupFieldName2": "ValueK2",
       ...,
      "GroupFieldNameN": "ValueKN",
      "AggregateFieldName1": "ValueK1",
      "AggregateFieldName1": "ValueK2",
       ...,
      "AggregateFieldNameM": "ValueKM"
    }
  ],
  "summary": [
   [
      {
         
      },
      {
        "AggregateFieldName1": "TotalValue1",
        "AggregateFieldName2": "TotalValue2",
        ...,
        "AggregateFieldNameM": "TotalValueM"
      }
    ],
    [
      {
        "GroupFieldName1": "Value11"
      },
      {
        "AggregateFieldName1": "TotalValue11",
        "AggregateFieldName2": "TotalValue12",
        ...,
        "AggregateFieldNameM": "TotalValue1M"
      }
    ],
    ...,
   [
      {
        "GroupFieldName1": "Value1",
        ...
        "GroupFieldNameN": "ValueN",
      },
      {
        "AggregateFieldName1": "TotalValue11",
        "AggregateFieldName2": "TotalValue12",
        ...,
        "AggregateFieldNameM": "TotalValue1M"
      }
   ],
   ...
  ]
}

Название	Значение	Описание
data	Данные отчета	Линейные данные отчета (построчно), одна запись внутри блока соответствует одной строке в гриде iikoOffice
summary	Промежуточные и общие итоги по отчету	
Список блоков, состоящих из двух структур.

В первой структуре - список полей, по которым собраны промежуточные итоги, в качестве элементов этой структуры представлены поля, которые используются для группировки. Количество элементов в структуре отличается и может быть:
пустым - это значит, что во втором блоке представлены общие итоги по отчету
список полей группировки, по которым собраны промежуточные итоги. Список имеет длину от 1 до числа полей группировки. Поля добавляются к списку в порядке их следования в запросе. 
Во второй - собственно промежуточные итоги. В качестве элементов данной структуры представлены поля, которые используются для агрегации. Количество элементов этой структуры фиксировано и равно количеству полей для агрегации.
При параметре запроса summary = false (olap, olap_presetId). "summary": [ ]  будет пустой. C Version (iiko) 5.3

#### Примеры вызова OLAP-отчетов по продажам
[-] Выручка по типам оплат
### POST Request	https://localhost:8080/resto/api/v2/reports/olap?key=99939171-551a-f54b-5163-366e773c40ac
#### Тело запроса
Код

{
  "reportType": "SALES",
  "groupByRowFields": [
    "PayTypes",
    "OpenDate"
  ],
  "aggregateFields": [
    "GuestNum",
    "DishSumInt",
    "DishDiscountSumInt",
    "UniqOrderId"
  ],
  "filters": {
    "OpenDate": {
      "filterType": "DateRange",
      "periodType": "CUSTOM",
      "from": "2014-01-01T00:00:00.000", 
      "to": "2014-01-03T00:00:00.000" 
    },
https://localhost:8080/resto/api/v2/reports/olap?key=99939171-551a-f54b-5163-366e773c40ac
#### Тело запроса
Код

{
  "reportType": "SALES",
  "groupByRowFields": [
    "DishName",
    "OpenDate",
    "CashRegisterName"
  ],
  "aggregateFields": [
    "DishSumInt",
    "DishDiscountSumInt"
  ],
  "filters": {
    "OpenDate": {
      "filterType": "DateRange",
      "periodType": "CUSTOM",
      "from": "2014-01-01T00:00:00.000", 
      "to": "2014-01-03T00:00:00.000" 
    },
https://localhost:8080/resto/api/v2/reports/olap?key=99939171-551a-f54b-5163-366e773c40ac
#### Тело запроса
Код

{
  "reportType": "SALES",
  "groupByRowFields": [
    "OpenDate",
    "HourClose"
  ],
  "aggregateFields": [
    "GuestNum",
    "DishSumInt",
    "DishDiscountSumInt",
    "UniqOrderId"
  ],
  "filters": {
    "OpenDate": {
      "filterType": "DateRange",
      "periodType": "CUSTOM",
      "from": "2014-01-01T00:00:00.000", 
      "to": "2014-01-03T00:00:00.000" 
    },
https://localhost:8080/resto/api/v2/reports/olap?key=99939171-551a-f54b-5163-366e773c40ac
#### Тело запроса
Код

{
  "reportType": "SALES",
  "groupByRowFields": [
    "DishCategory"
  ],
  "aggregateFields": [
    "GuestNum",
    "DishSumInt",
    "DishDiscountSumInt",
    "UniqOrderId"
  ],
  "filters": {
    "OpenDate": {
      "filterType": "DateRange",
      "periodType": "CUSTOM",
      "from": "2014-01-01T00:00:00.000", 
      "to": "2014-01-03T00:00:00.000" 
    },
https://localhost:8080/resto/api/v2/reports/olap?key=b785c815-f06d-947c-3fb5-3052a2df7fd8
#### Тело запроса
Код

{
  "reportType": "SALES",
  "groupByRowFields": [
    "OpenDate"
  ],
  "aggregateFields": [
    "GuestNum",
    "DishSumInt",
    "DishDiscountSumInt",
    "UniqOrderId"
  ],
  "filters": {
    "OpenDate": {
      "filterType": "DateRange",
      "periodType": "CUSTOM",
      "from": "2014-01-01T00:00:00.000", 
      "to": "2014-01-03T00:00:00.000" 
    },
https://localhost:8080/resto/api/v2/reports/olap?key=b785c815-f06d-947c-3fb5-3052a2df7fd8 
Запрос
JSON
{
  "reportType": "SALES",
  "groupByRowFields": [
    "WaiterName"
  ],
  "aggregateFields": [
    "DishSumInt",
    "DishDiscountSumInt"
  ],
  "filters": {
    "OpenDate": {
      "filterType": "DateRange",
      "periodType": "CUSTOM",
      "from": "2014-01-01T00:00:00.000", 
      "to": "2014-01-03T00:00:00.000" 
    },