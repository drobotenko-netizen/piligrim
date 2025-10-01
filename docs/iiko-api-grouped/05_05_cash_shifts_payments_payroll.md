---
title: Смены, платежи/внесения/изъятия, платежные ведомости
source: https://ru.iiko.help/articles/#!api-documentations/iikoserver-api
generated: 2025-09-29T09:20:40.656Z
---

# Смены, платежи/внесения/изъятия, платежные ведомости

## Оглавление

---

Работа со сменами
Список смен
### GET Request	https://host:port/resto/api/v2/cashshifts/list
#### Параметры запроса
Название
Значение
Описание
openDateFrom	YYYY-MM-DD	Период открытия смены ''с'' (входит в интервал).
openDateTo	YYYY-MM-DD	Период открытия смены ''по'' (входит в интервал).
departmentId	UUID	Список ТП, если пуст, то фильтра нет.
groupId	UUID	Список групп секций, если пуст, то фильтра нет.
status	
String

Значение
Описание
ANY	Любая.
OPEN	Открытая.
CLOSED	Закрытая.
ACCEPTED	Принята.
UNACCEPTED	Не принята.
HASWARNINGS	Подозрительная.
Фильтр по статусу. Не может быть пустым.
revisionFrom
число, -1
Номер ревизии, начиная с которой необходимо отфильтровать сущности. Не включающий саму ревизию, т.е. ревизия объекта > revisionFrom.

По умолчанию (неревизионный запрос) revisionFrom = -1 (с версии iiko 6.4)

#### Что в ответе
Json структура. Возвращает списки смен

Поле
Значение
id	Id смены
sessionNumber	Номер кассовый смены (в нумерации фронта).
fiscalNumber	Фискальный номер смены (с ФРа).
cashRegNumber	Номер ФРа (в нумерации iiko).
cashRegSerial	Серийный номер ФРа.
openDate	Дата открытия смены.
closeDate	Дата закрытия смены.
acceptDate	
Дата принятия смены. null --- смена не принята.

managerId	Ответственный менеджер.
responsibleUser	Ответственный кассир.
sessionStartCash	Остаток в кассе на начало дня.
payOrders	Сумма всех заказов с учётом скидки
payIn	Сумма всех внесений.
payOut	Сумма всех изъятий, без учета изъятий в конце смены.
payIncome	Сумма изъятия в конце смены.
cashRemain	Остаток в кассе после закрытия смены.
cashDiff	Общее расхождение сумм книжных и фактических.
sessionStaus	Статус смены.
conception	Концепция, которой принадлежит данная кассовая смена.
pointOfSale	Точка продаж данной кассовой смены.
#### Пример запроса и результат
JSON
[ 
   { 
      "id":"1c81b65a-1b8a-428f-8a74-2c994a928a86",
      "sessionNumber":583,
      "fiscalNumber":1003,
      "cashRegNumber":1,
      "cashRegSerial":"115744 ",
      "openDate":"2017-02-21T09:56:32.937",
      "closeDate":"2017-02-21T22:28:18.63",
      "acceptDate":null,
      "managerId":"173f155b-48e5-4da0-a9e7-3caa58cfa9d0",
      "responsibleUser":"173f155b-48e5-4da0-a9e7-3caa58cfa9d0",
      "sessionStartCash":0,
      "payOrders":21351,
      "payIn":2000,
      "payOut":0,
      "payIncome":-11787,
      "cashRemain":0,
      "cashDiff":-11787,
      "sessionStatus":"UNACCEPTED",
      "conception":"bd6daa35-12ce-4117-af8f-816d99720eeb",
      "pointOfSale":"1b17ee6b-c499-4916-9347-fe854d3067b4"
   },
   { 
      "id":"43aab17c-ab23-4d5a-91f0-9fa39fac8612",
      "sessionNumber":145,
      "fiscalNumber":306,
      "cashRegNumber":3,
      "cashRegSerial":"115731 ",
      "openDate":"2017-02-21T10:00:51.733",
      "closeDate":"2017-02-21T23:16:59.13",
      "acceptDate":null,
      "managerId":"173f155b-48e5-4da0-a9e7-3caa58cfa9d0",
      "responsibleUser":"173f155b-48e5-4da0-a9e7-3caa58cfa9d0",
      "sessionStartCash":0,
      "payOrders":34885,
      "payIn":0,
      "payOut":0,
      "payIncome":0,
      "cashRemain":0,
      "cashDiff":0,
      "sessionStatus":"UNACCEPTED",
      "conception":"bd6daa35-12ce-4117-af8f-816d99720eeb",
      "pointOfSale":"e49cda0d-f3b1-4a8a-901e-7c44ee09c5a2"
   },
   { 
      "id":"f67fea0a-90d4-427c-ac3d-b82c1582f7f9",
      "sessionNumber":1,
      "fiscalNumber":null,
      "cashRegNumber":998,
      "cashRegSerial":null,
      "openDate":"2017-05-03T14:07:44.11",
      "closeDate":"2017-05-03T14:08:57.307",
      "acceptDate":"2017-05-24T11:55:13.907",
      "managerId":"2c6f7e76-2fee-473e-879e-4c4c2faaa032",
      "responsibleUser":"2c6f7e76-2fee-473e-879e-4c4c2faaa032",
      "sessionStartCash":0,
      "payOrders":2660,
      "payIn":0,
      "payOut":0,
      "payIncome":-2660,
      "cashRemain":0,
      "cashDiff":-2660,
      "sessionStatus":"HASWARNINGS",
      "conception":null,
      "pointOfSale":"4138237d-c4db-4bfb-b52e-18e1bb4f12e5"
   }
]

Выгрузка платежей, внесений, изъятий за смену
### Версия iiko: 5.4

### GET Request
https://host:port/resto/api/v2/cashshifts/payments/list/{sessionId}

#### Параметры запроса
Название	Значение	Описание
hideAccepted	true, false	скрыть принятые
#### Что в ответе
Json структура. Возвращает списки внесений, изъятий, безналичных платежей за смену

Поле
Описание
sessionId	UUID запрошенной смены
cashlessRecords	
Список записей, относящихся к безналичным платежам.

payInRecords	Список записей, относящихся к внесениям. 
payOutRecords	Список записей, относящихся к  изъятиям. 
Запись в документе

Поле
Описание
info	Описание проводки
 

Поле
Описание
id	UUID проводки.
date	
Дата создания в формате "yyyy-MM-dd'T'HH:MM:SS"

Проводки оплат заказов содержат в этом поле учетный день, округленный до суток.

creationDate	
Дата создания в формате "yyyy-MM-dd'T'HH:MM:SS"

с привязкой ко времени, может быть меньше, чем date,
если используется настройка "конец учетного дня" <> 00:00.
group	
PAYOUT (изъятия)
PAYIN (внесения)
accountId	Редактируемый счет. Чаще принимается конечный счет проводки.
counteragentId	Контрагент.
paymentTypeId	Тип оплаты.
type	Тип проводки.
sum	Сумма.
comment	Комментарий.
auth	
https://localhost:8080/resto/api/v2/cashshifts/payments/list/f67fea0a-90d4-427c-ac3d-b82c1582f7f9?hideAccepted=false

[+] Результат

Выгрузка кассовой смены по id
### Версия iiko: 5.4

### GET Request	https://host:port/resto/api/v2/cashshifts/byId/{sessionId}
#### Что в ответе
Json структура кассовой смены.

Поле
Значение
id	Id смены
sessionNumber	Номер кассовый смены (в нумерации фронта).
fiscalNumber	Фискальный номер смены (с ФРа).
cashRegNumber	Номер ФРа (в нумерации iiko).
cashRegSerial	Серийный номер ФРа.
openDate	Дата открытия смены.
closeDate	Дата закрытия смены.
acceptDate	
Дата принятия смены. null --- смена не принята.

managerId	Ответственный менеджер.
responsibleUser	Ответственный кассир.
sessionStartCash	Остаток в кассе на начало дня.
payOrders	Сумма всех заказов с учётом скидки
payIn	Сумма всех внесений.
payOut	Сумма всех изъятий, без учета изъятий в конце смены.
payIncome	Сумма изъятия в конце смены.
cashRemain	Остаток в кассе после закрытия смены.
cashDiff	Общее расхождение сумм книжных и фактических.
sessionStaus	Статус смены.
conception	Концепция, которой принадлежит данная кассовая смена.
pointOfSale	Точка продаж данной кассовой смены.
#### Пример запроса и результат
Запрос

https://localhost:8080/resto/api/v2/cashshifts/byId/1c81b65a-1b8a-428f-8a74-2c994a928a86

  
[+] Результат

  
  
Выгрузка документы принятия кассовой смены по id смены
### Версия iiko: 5.4

### GET Request
https://host:port/resto/api/v2/cashshifts/closedSessionDocument/{id}

#### Что в ответе
Json структура документа принятия кассовой смены. Возвращает существующий документ, либо создает новый.

Поле
Значение
id	id документа.
session	
Кассовая смена

Поле
Значение
sessionId	id смены.
groupId	id группы секций работающих в одной кассовой смене.
number	Номер смены.
accountShortageId	Счет, на который записывается недостача.
counteragentShortageId	Контрагент, на которого записывается недостача.
accountSurplusId	Счет, на который записывается излишек.
counteragentSurplusId	Контрагент, на которого записывается излишек.
departmentId	Торговое предприятие кассовой смены.
items	
Элементы/строки документа

Поле
Значение
num	Номер элемента.
transactionId	UUID проводки.
sumReal	Отредактированная сумма.
accountOverrideId	Отредактированный счет.
counteragentOverrideId	Отредактированный контрагент.
status	
Статус.

Значение
Описание
ACCEPTED	принята
UNACCEPTED	не принята
HASWARNINGS	подозрительная
comment	Комментарий.
#### Пример запроса и результата
https://localhost:8080/resto/api/v2/cashshifts/closedSessionDocument/f67fea0a-90d4-427c-ac3d-b82c1582f7f9

JSON
{ 
   "id":"1a94e9e8-56cf-3a14-015b-ce1629e5006b",
   "session":{ 
      "sessionId":"f67fea0a-90d4-427c-ac3d-b82c1582f7f9",
      "groupId":"94a6f400-2f9b-4a5a-be7f-19b7b62c55a7",
      "number":1
   },
   "accountShortageId":null,
   "counteragentShortageId":null,
   "accountSurplusId":null,
   "counteragentSurplusId":"2c6f7e76-2fee-473e-879e-4c4c2faaa032",
   "departmentId":"cb90393a-8299-4af1-9fab-5ec308726266",
   "items":[ 
      { 
         "num":0,
         "transactionId":"e08a16b6-931c-4068-9aa5-b740d5ce726b",
         "sumReal":2660,
         "accountOverrideId":"ad3cc1aa-a60e-c85c-e66d-3904490de4b9",
         "counteragentOverrideId":"2c6f7e76-2fee-473e-879e-4c4c2faaa032",
         "status":"ACCEPTED",
         "comment":"test"
      }
   ]
}

Принятие кассовой смены
Примерный алгоритм принятия кассовой смены
Получить список кассовых смен. Выбрать id смены, которую нужно принять.
Получить документ принятия кассовой смены по id смены.
Получить список безналичных платежей, внесений, изъятий по выбранной из п.1 кассовой смене.
Дополнить список элементов документа недостающими.
Список из п.3 содержит все проводки смены. Документ принятия смены из п.2 состоит из элементов, редактирующих
такие проводок. Если есть проводки, для которых нет элементов в документе (например, когда смена закрывается впервые),
то нужно добавить новые элементы. Другими словами документ принятия смены должен содержать все проводки из п.3.

Добавление нового элемента происходит на основании записи из списка, полученного в п.3., следующим образом:

В поле num устанавливается следующий порядковый номер.
В поле transactionId устанавливается UUID добавляемой проводки.
В поле sumReal указывается результат редактирования суммы проводки: поле sum. sumReal заполняется только для
изъятий. т.е. для записей из payOutRecords. Для других записей сумма не редактируется.
В поле accountOverride устанавливаете результат редактирования счета из поля accountId. В counteragentOverride
результат редактирования counteragentId с некоторыми правилами.
Указывается нужный статус и комментарий.
       5. Отредактировать документ.

       6. Отправить на сервер.

### Версия iiko: 5.4

### POST Request
https://host:port/resto/api/v2/cashshifts/save

Content-Type: application/json
#### Тело запроса
Поле
Значение
id	id документа.
session	
Кассовая смена

Поле
Значение
sessionId	id смены.
group	id группы секций работающих в одной кассовой смене.
number	Номер смены.
accountShortageId	Счет, на который записывается недостача.
counteragentShortageId	Контрагент, на которого записывается недостача.
accountSurplusId	Счет, на который записывается излишек.
counteragentSurplusId	Контрагент, на которого записывается излишек.[1]
departmentId	Торговое предприятие кассовой смены.
items	
Элементы/строки документа.

Элемент - продажа за безнал, внесение, изъятие.

Поле
Значение
num	Номер элемента.
transactionId	UUID проводки кассовой смены.
sumReal	Отредактированная сумма.
accountOverrideId	Отредактированный счет.
counteragentOverrideId	
Отредактированный контрагент.[2]

status	
Статус.

Значение
Описание
ACCEPTED	принята
UNACCEPTED	непринята
HASWARNINGS	подозрительная
comment	Комментарий.
[1].Счета/контрагенты  для недостачи/излишка должны быть заполнены независимо от выбранного счета.

Так сделано для обратной совместимости.

[2]. Контрагент в элементе документа должен быть указан только для счетов :

Тип счета
Название
ACCOUNTS_RECEIVABLE
Задолженность покупателей
DEBTS_OF_EMPLOYEES
Задолженность сотрудников
EMPLOYEES_LIABILITY
Расчеты с сотрудниками
ACCOUNTS_PAYABLE
Расчеты с поставщиками
CLIENTS_LIABILITY
Расчеты с гостями
Список доступных счетов можно получить через API счетов.

JSON
{ 
   "id":"1a94e9e8-56cf-3a14-015b-ce1629e5006b",
   "session":{ 
      "sessionId":"f67fea0a-90d4-427c-ac3d-b82c1582f7f9",
      "groupId":"94a6f400-2f9b-4a5a-be7f-19b7b62c55a7",
      "number":1
   },
   "accountShortageId":"ad3cc1aa-a60e-c85c-e66d-3904490de4b9",
   "counteragentShortageId":"2c6f7e76-2fee-473e-879e-4c4c2faaa032",
   "accountSurplusId":"ad3cc1aa-a60e-c85c-e66d-3904490de4b9",
   "counteragentSurplusId":"2c6f7e76-2fee-473e-879e-4c4c2faaa032",
   "departmentId":"cb90393a-8299-4af1-9fab-5ec308726266",
   "items":[ 
      { 
         "num":0,
         "transactionId":"e08a16b6-931c-4068-9aa5-b740d5ce726b",
         "sumReal":2650,
         "accountOverrideId":"ad3cc1aa-a60e-c85c-e66d-3904490de4b9",
         "counteragentOverrideId":"2c6f7e76-2fee-473e-879e-4c4c2faaa032",
         "status":"ACCEPTED",
         "comment":"test"
      }
   ]
}

#### Что в ответе
Содержит результат импорта, который состоит из результата валидации импортируемого документа и самого документа. Результат валидации состоит из ошибок, общих для всего документа, и ошибок по каждому отдельному элементу  документа. Ошибка состоит из кода ошибки и текста ошибки.

Поле
Значение
importResult	
Статус результата принятия смены

SUCCESS, ERROR

status	
Статус принятой смены. Вычисляется из совокупности статусов элементов документа.

Статус элемента задает пользователь. Если хотя бы один элемент имеет статус HASWARNINGS,

то весь документ будет в статусе HASWARNINGS, если хотя бы один элемент в статусе UNACCEPTED,

то весь документ будет в таком же статусе, ACCEPTED - все элементы приняты.

У HASWARNINGS самый высокий приоритет.

Значение
Описание
UNACCEPTED	не принята
ACCEPTED	принята
HASWARNINGS	подозрительна
errors	
Список ошибок, не позволивших сделать успешный импорт документа.

Поле
Значение
documentError	Ошибки в полях документа.
itemError	
Ошибки в полях документа.

Поле
Значение
identifier	UUID элемента.
error	Ошибка.
document	Импортируемый документ.
Ошибка
Поле
Значение
value	Неверное значение, либо название пустого поля.
code	Код ошибки.
[+] Коды ошибок
#### Пример запроса и результат
Запрос

https://localhost:8080/resto/api/v2/cashshifts/save 
Результат
JSON
{ 
   "id":"1a94e9e8-56cf-3a14-015b-ce1629e5006b",
   "session":{ 
      "sessionId":"f67fea0a-90d4-427c-ac3d-b82c1582f7f9",
      "groupId":"94a6f400-2f9b-4a5a-be7f-19b7b62c55a7",
      "number":1
   },
   "accountShortageId":"ad3cc1aa-a60e-c85c-e66d-3904490de4b9",
   "counteragentShortageId":"2c6f7e76-2fee-473e-879e-4c4c2faaa032",
   "accountSurplusId":"ad3cc1aa-a60e-c85c-e66d-3904490de4b9",
   "counteragentSurplusId":"2c6f7e76-2fee-473e-879e-4c4c2faaa032",
   "departmentId":"cb90393a-8299-4af1-9fab-5ec308726266",
   "items":[ 
      { 
         "num":0,
         "transactionId":"e08a16b6-931c-4068-9aa5-b740d5ce726b",
         "sumReal":2650,
         "accountOverrideId":"ad3cc1aa-a60e-c85c-e66d-3904490de4b9",
         "counteragentOverrideId":"2c6f7e76-2fee-473e-879e-4c4c2faaa032",
         "status":"ACCEPTED",
         "comment":"test"
      }
   ]
}

​

#### Пример успешного импорта - SUCCESS

JSON
{ 
   "importResult":"SUCCESS",
   "status":"ACCEPTED",
   "errors":null,
   "document":{ 
      "id":"1a94e9e8-56cf-3a14-015b-ce1629e5006b",
      "session":{ 
         "sessionId":"f67fea0a-90d4-427c-ac3d-b82c1582f7f9",
         "groupId":"94a6f400-2f9b-4a5a-be7f-19b7b62c55a7",
         "number":1
      },
      "accountShortageId":"ad3cc1aa-a60e-c85c-e66d-3904490de4b9",
      "counteragentShortageId":"2c6f7e76-2fee-473e-879e-4c4c2faaa032",
      "accountSurplusId":"ad3cc1aa-a60e-c85c-e66d-3904490de4b9",
      "counteragentSurplusId":"2c6f7e76-2fee-473e-879e-4c4c2faaa032",
      "departmentId":"cb90393a-8299-4af1-9fab-5ec308726266",
      "items":[ 
         { 
            "num":0,
            "transactionId":"e08a16b6-931c-4068-9aa5-b740d5ce726b",
            "sumReal":2650,
            "accountOverrideId":"ad3cc1aa-a60e-c85c-e66d-3904490de4b9",
            "counteragentOverrideId":"2c6f7e76-2fee-473e-879e-4c4c2faaa032",
            "status":"ACCEPTED",
            "comment":"test"
         }
      ]
   }
}

#### Пример не успешного импорта - ERROR

JSON
{ 
   "importResult":"ERROR",
   "status":null,
   "errors":{ 
      "documentError":[ 
         { 
            "value":"ad3cc1aa-a60c-c85c-e66d-3904490de4b9",
            "code":"ACCOUNT_SHORTAGE_NOT_FOUND"
         },
         { 
            "value":"counteragentShortage",
            "code":"EMPTY_FIELD"
         }
      ],
      "itemError":[ 
         { 
            "identifier":0,
            "error":[ 
               { 
                  "value":"bd3cc1aa-a60e-c85c-e66d-3904490de4b9",
                  "code":"INVENTORY_ASSETS_TYPE_NOT_ALLOWED"
               },
               { 
                  "value":"6c6f7e76-2fee-473e-879e-4c4c2faaa032",
                  "code":"COUNTERAGENT_DELETED"
               }
            ]
         }
      ]
   },
   "document":{ 
      "id":"1a94e9e8-56cf-3a14-015b-ce1629e5006b",
      "session":{ 
         "sessionId":"f67fea0a-90d4-427c-ac3d-b82c1582f7f9",
         "group":"94a6f400-2f9b-4a5a-be7f-19b7b62c55a7",
         "number":1
      },
      "accountShortageId":"ad3cc1aa-a60c-c85c-e66d-3904490de4b9",
      "counteragentShortageId":null,
      "accountSurplusId":"ad3cc1aa-a60e-c85c-e66d-3904490de4b9",
      "counteragentSurplusId":"2c6f7e76-2fee-473e-879e-4c4c2faaa032",
      "departmentId":"cb90393a-8299-4af1-9fab-5ec308726266",
      "items":[ 
         { 
            "num":0,
            "transactionId":"e08a16b6-931c-4068-9aa5-b740d5ce726b",
            "sumReal":2650,
            "accountOverrideId":"bd3cc1aa-a60e-c85c-e66d-3904490de4b9",
            "counteragentOverrideId":"6c6f7e76-2fee-473e-879e-4c4c2faaa032",
            "status":"HASWARNINGS",
            "comment":"test"
         }
      ]
   }
}

Работа с изъятиями
Доступ
Чтобы пользоваться API:

Получения типов внесений и изъятий: право B_APIO "Просматривать типы внесений/изъятий".
Выполнения изъятий: право F_APIO "Авторизовывать кассовые внесения и изъятия".
Получение типов внесений и изъятий
### GET Request	https://host:port/resto/api/v2/entities/payInOutTypes/list
#### Параметры запроса
Название	Тип данных
Версия	Описание
includeDeleted	Boolean	 	включая удаленные (по умолчанию false)
revisionFrom	-1, число	с 6.4	
Номер ревизии, начиная с которой необходимо отфильтровать сущности. Не включающий саму ревизию, т.е. ревизия объекта > revisionFrom.

По умолчанию (неревизионный запрос) revisionFrom = -1

#### Что в ответе
Json структура. Возвращает список типов внесений и изъятий. 

Поле
Тип данных
Описание
id	UUID	Guid внесения/изъятия в базе iiko.
chiefAccount	UUID	Guid шеф-счёта. При изъятии перемещаются на корр. счёт, а при внесении наоборот.
account	UUID	Guid корр-счёта. При изъятии перемещаются на корр. счёт, а при внесении наоборот.
counteragentType	Enum	
Тип контрагента:

NONE (нет)
COUNTERAGENT (все)
EMPLOYEE (сотрудник)
SUPPLIER (поставщик)
CLIENT (гость)
INTERNAL_SUPPLIER (внутренний поставщик)

transactionType	Enum	Тип проводки.
cashFlowCategory	DTO	Статья движения денежных средств (ДДС).
conception	DTO	
Концепция

Параметр
Тип, формат
Описание
id	String	Guid концепции в базе iiko.
code	String	Код.
name	String	Название. 
limit
BigDecimal
 Предельная сумма для внесений/изъятий на iikoFront.
comment	String
Комментарий
mandatoryFrontComment
Boolean
 Требовать ввода комментария к операции в iikoFront.
isDeleted
Boolean
Удален
#### Пример запроса и результата
Запрос

https://localhost:8080/resto/api/v2/entities/payInOutTypes/list?includeDeleted=true

[+] Результат

Совершить изъятие
### Версия iiko: 6.0

### POST Request	https://host:port/resto/api/v2/payInOuts/addPayOut
Content-Type: application/json

#### Тело запроса
Поле
Тип данных
Описание
payOutTypeId	UUID	Guid типа изъятия в базе iiko.
payOutDate	String	Дата в формате yyyy-MM-dd. Время проставляется текущее.
counteragent	UUID	Guid контрагента в базе iiko. В зависимости от типа изъятия.
departmentSumMap
UUID -> BigDecimal
Торговое предприятие -> сумма изъятия.
payrollId
UUID
Guid платежной ведомости в базе iiko. Указывается если изъятие происходит на счет
(т.е. корр.счет) "Текущие расчеты с сотрудниками".
comment
String
Комментарий.
#### Что в ответе
Содержит результат изъятия, который состоит из результата валидации параметров изъятия и самого изъятия. Результат валидации состоит из ошибок. Ошибка состоит из кода ошибки и текста ошибки.

Поле
Тип данных
Значение
result	Enum
SUCCESS, ERROR
payOutSettings	DTO
Параметры изъятия.
errors	DTO
Список ошибок, не позволивших сделать изъятие. 
#### Пример вызова
https://localhost:8080/resto/api/v2/payInOuts/addPayOut

#### Пример результата - SUCCESS

JSON
 { 
   "result":"SUCCESS",
   "errors":null,
   "payOutSettings":{ 
      "payOutTypeId":"37d410d1-c524-4a76-b28c-8b733e313d7a",
      "payOutDate":"2017-10-18",
      "counteragent":null,
      "departmentSumMap":{ 
         "06d7ec0c-8fee-f341-015f-b58127ff000d":1500
      },
      "payrollId":null,
      "comment":null
   }
}

#### Пример результата - ERROR

JSON
{ 
   "result":"ERROR",
   "errors":[ 
      { 
         "value":"chiefAccount",
         "code":"ACCOUNT_NOT_SPECIFIED"
      }
   ],
   "payOutSettings":{ 
      "payOutTypeId":"32e01087-ded3-b5bb-4b82-6a3f0348af84",
      "payOutDate":"2017-10-18",
      "counteragent":null,
      "departmentSumMap":{ 
         "06d7ec0c-8fee-f341-015f-b58127ff000d":-100
      },
      "payrollId":null,
      "comment":null
   }
}

Получение платежных ведомостей
### Версия iiko: 6.0

### GET Request	https://host:port/resto/api/v2/payrolls/list
#### Параметры запроса
Поле
Тип данных
Описание
dateFrom	String
Начало периода в формате yyyy-MM-dd, включительно.
dateTo	String
Окончание периода в формате yyyy-MM-dd, включительно.
department	UUID
Guid  торгового предприятия. в базе iiko.
includeDeleted	Boolean
Включая удаленные (по умолчанию false). 
#### Что в ответе
Возвращает список платежных ведомостей.

Поле
Тип данных
Описание
payrollId	UUID
UUID ведомости.
dateFrom	Date
Дата начала действия.
dateTo	Date
Дата окончания действия.
department	UUID
Guid торгового предприятия.
documentNumber
String
Номер документа.
status
Enum
Статус документа (NEW, PROCESSED, DELETED).
comment
String
Комментарий.

#### Пример запроса и результата
Запрос

https://localhost:8080/resto/api/v2/payrolls/list?dateFrom=2017-08-01&dateTo=2017-10-01&department=372f68b4-8e7a-bae1-015f-0f9c638f000d
Результат

JSON
[
    {
        "id": "d4b29bd7-076f-48ba-9f93-6f21b78f47bf",
        "dateFrom": "2017-10-01T00:00:00",
        "dateTo": "2017-10-31T23:59:59",
        "department": "372f68b4-8e7a-bae1-015f-0f9c638f000d",
        "documentNumber": "0001",
        "status": "PROCESSED",
        "comment": null
   }
]

Warning	Для использования кириллицы в комментарии (параметр comment) при совершении изъятия в headers запроса должен быть параметр: content-type: application/json;charset=UTF-8
#### Примеры изъятий
Изъятие. Платёжная ведомость
Запрос

### POST Request	https://localhost:8080/resto/api/v2/payInOuts/addPayOut
Код

{
"payOutTypeId":"114c757f-bac4-422c-a184-0935923b60b8",
"payOutDate":"2017-12-13",
"counteragent":"d244cb85-9115-4b4d-8e02-a4f7fdd8ec15",
"departmentSumMap":{
"2b9c2770-f146-43b8-9ac1-ad717d9c7996":90.0
},
"payrollId":"c1349656-8401-4476-9541-7f0325c65f98",
"comment":"Comment"
}

Результат

Код
{
"result": "SUCCESS",
"errors": null,
"payOutSettingsDto": {
"payOutTypeId": "114c757f-bac4-422c-a184-0935923b60b8",
"payOutDate": "2017-12-13",
"counteragent": "d244cb85-9115-4b4d-8e02-a4f7fdd8ec15",
"departmentSumMap": {"2b9c2770-f146-43b8-9ac1-ad717d9c7996": 90},
"payrollId": "c1349656-8401-4476-9541-7f0325c65f98",
"comment": "Comment "
}
}

Изъятие. Аванс поставщику
Запрос

### POST Request	https://localhost:8080/resto/api/v2/payInOuts/addPayOut
Код

{
"payOutTypeId":"0cacd214-c280-4f58-afb3-28d25de90c21",
"payOutDate":"2017-12-13",
"counteragent":"ac716010-c95c-4705-a4bf-d202816c406e",
"departmentSumMap":{
"2b9c2770-f146-43b8-9ac1-ad717d9c7996":1000.0
},
"comment":"test1"
}

Результат

Код
{
"result": "SUCCESS",
"errors": null,
"payOutSettingsDto": {
"payOutTypeId": "0cacd214-c280-4f58-afb3-28d25de90c21",
"payOutDate": "2017-12-13",
"counteragent": "ac716010-c95c-4705-a4bf-d202816c406e",
"departmentSumMap": {"2b9c2770-f146-43b8-9ac1-ad717d9c7996": 1000},
"payrollId": null,
"comment": "test1"
}
}

