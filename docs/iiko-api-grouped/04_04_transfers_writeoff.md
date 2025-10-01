---
title: Документы: внутренние перемещения, списания (writeoff)
source: https://ru.iiko.help/articles/#!api-documentations/iikoserver-api
generated: 2025-09-29T09:20:40.655Z
---

# Документы: внутренние перемещения, списания (writeoff)

## Оглавление

---

    "effectiveDirectWriteoffStoreSpecification" : {
      "departments" : [ ],
      "inverse" : false
    },
    "effectiveDirectWriteoffStoreSpecification": {
        "departments": [],
        "inverse": false
    },
        "effectiveDirectWriteoffStoreSpecification": {
            "departments": [],
            "inverse": false
        },
Акты списания
Акты списания
### Версия iiko: 7.9.3

#### Описание полей
[+] WriteoffDocumentDto
[+] WriteoffDocumentItemDto
Выгрузка документов
### GET Request	https://host:port/resto/api/v2/documents/writeoff
#### Параметры запроса
dateFrom	String	Начало временного интервала в формате "yyyy-MM-dd". Обязательный.
dateTo	String	Конец временного интервала в формате "yyyy-MM-dd". Обязательный.
status	Enum	Статус документа. Если не задан, то все.
revisionFrom	Integer	В ответе будут сущности с ревизией выше данной. По умолчанию '-1'.
#### Что в ответе
Список документов.

Поле revision - максимальная ревизия, доступная для выгрузки во внешние системы на момент запроса (это значит, что в базе присутствуют записи с такой ревизией, а записей с ревизией выше этой в базе нет).

Эту ревизию можно использовать в качестве параметра revisionFrom в следующем запросе на получение списка расписаний.

#### Пример запроса и результат
Запрос
https://localhost:9080/resto/api/v2/documents/writeoff?dateFrom=2018-01-01&dateTo=2021-12-31

[+] Результат
Выгрузка документа по идентификатору
### GET Request	https://host:port/resto/api/v2/documents/writeoff/byId
#### Параметры запроса
id	UUID	Идентификатор документа.
#### Что в ответе
Выгруженный документ

#### Пример запроса и результат
Запрос
https://localhost:9080/resto/api/v2/documents/writeoff/byId?id=3d27d640-d6a1-4545-86a4-b07422c3c9f0

Результат
JSON
{
  "id": "3d27d640-d6a1-4545-86a4-b07422c3c9f0",
  "dateIncoming": "2020-01-10T23:00",
  "documentNumber": "20002",
  "status": "PROCESSED",
  "storeId": "7954d76d-6177-402c-ba2a-cc0ff16486fa",
  "accountId": "97036ddb-b2e1-cd47-1669-c145daa9f9c5",
  "items": [
    {
      "num": 1,
### GET Request	https://host:port/resto/api/v2/documents/writeoff/byNumber
#### Параметры запроса
documentNumber	String	Номер документа.
#### Примеры запроса и результат
Запрос
https://localhost:9080/resto/api/v2/documents/writeoff/byNumber?documentNumber=20002
Результат

JSON
[
  {
    "id": "3d27d640-d6a1-4545-86a4-b07422c3c9f0",
    "dateIncoming": "2020-01-10T23:00",
    "documentNumber": "20002",
    "status": "PROCESSED",
    "storeId": "7954d76d-6177-402c-ba2a-cc0ff16486fa",
    "accountId": "97036ddb-b2e1-cd47-1669-c145daa9f9c5",
    "items": [
      {
        "num": 1,
### POST Request	https://host:port/resto/api/v2/documents/writeoff
#### Тело запроса
Если задан идентификатор документа - считаем, что это редактирование (редактировать приказ можно, если его статус 'NEW'), если не задан, то создание.

Обязательные поля: 'dateIncoming', 'status', 'storeId', 'accountId'. Также должна быть как минимум одна позиция в документе.

https://localhost:9080/resto/api/v2/documents/writeoff

Результат
JSON
{
  "result": "SUCCESS",
  "errors": [
  ],
  "response": {
    "id": "78e58a66-1648-e023-017d-28c01da501cc",
    "dateIncoming": "2021-11-16T23:00",
    "documentNumber": "",
    "status": "NEW",
    "comment": "yyy",
    "storeId": "7954d76d-6177-402c-ba2a-cc0ff16486fa",
    "accountId": "8c46f55a-0698-4e3f-8703-8bb36b24e8ac",
    "items": [
      {
        "num": 1,
Внутренние перемещения

Внутренние перемещения
### Версия iiko: 7.9.3

#### Описание полей
[+] InternalTransferDto
[+] InternalTransferItemDto

Выгрузка документов
### GET Request	https://host:port/resto/api/v2/documents/internalTransfer
#### Параметры запроса
dateFrom	String	Начало временного интервала в формате "yyyy-MM-dd". Обязательный.
dateTo	String	Конец временного интервала в формате "yyyy-MM-dd". Обязательный.
status	Enum	Статус документа. Если не задан, то все.
revisionFrom	Integer	В ответе будут сущности с ревизией выше данной. По умолчанию '-1'.
#### Что в ответе
Список документов.

Поле revision - максимальная ревизия, доступная для выгрузки во внешние системы на момент запроса (это значит, что в базе присутствуют записи с такой ревизией, а записей с ревизией выше этой в базе нет).

Эту ревизию можно использовать в качестве параметра revisionFrom в следующем запросе на получение списка расписаний.

#### Пример запроса и результат
Запрос
https://localhost:9080/resto/api/v2/documents/internalTransfer?dateFrom=2018-01-01&dateTo=2021-12-31

[+] Результат
Выгрузка документа по идентификатору
### GET Request	https://host:port/resto/api/v2/documents/internalTransfer/byId
#### Параметры запроса
id	UUID	Идентификатор документа.
#### Пример запроса и результата
Запрос
https://localhost:9080/resto/api/v2/documents/internalTransfer/byId?id=f26f9661-c1c1-437e-b68a-e67cd78cc1a0
Результат
JSON
{
  "id": "f26f9661-c1c1-437e-b68a-e67cd78cc1a0",
  "dateIncoming": "2021-04-01T12:08:36.340",
  "documentNumber": "20002",
  "status": "NEW",
  "storeFromId": "7954d76d-6177-402c-ba2a-cc0ff16486fa",
  "storeToId": "cfdfaff0-382c-4851-bba2-92b408db02ef",
  "items": [
    {
      "num": 1,
### GET Request	https://host:port/resto/api/v2/documents/internalTransfer/byNumber
#### Параметры запроса
documentNumber	String	Номер документа.
#### Пример запроса и результата
Запрос
https://localhost:9080/resto/api/v2/documents/internalTransfer/byNumber?documentNumber=20002
Результат

JSON
[
  {
    "id": "f26f9661-c1c1-437e-b68a-e67cd78cc1a0",
    "dateIncoming": "2021-04-01T12:08:36.340",
    "documentNumber": "20002",
    "status": "NEW",
    "storeFromId": "7954d76d-6177-402c-ba2a-cc0ff16486fa",
    "storeToId": "cfdfaff0-382c-4851-bba2-92b408db02ef",
    "items": [
      {
        "num": 1,
### POST Request	https://host:port/resto/api/v2/documents/internalTransfer
#### Тело запроса
Если задан идентификатор документа - считаем, что это редактирование (редактировать приказ можно, если его статус 'NEW'), если не задан, то создание.

Обязательные поля: 'dateIncoming', 'status', 'storeFromId', 'storeToId'. Также должна быть как минимум одна позиция в документе.

https://localhost:9080/resto/api/v2/documents/internalTransfer

Результат
JSON
{
  "result": "SUCCESS",
  "errors": [
  ],
  "response": {
    "id": "0fd6f4ad-4858-401c-017d-22eacb7101a7",
    "dateIncoming": "2021-11-15T06:00",
    "documentNumber": "30002",
    "status": "NEW",
    "comment": "zzz",
    "storeFromId": "05a407d4-d7c6-4bc2-a578-6ad5de99d468",
    "storeToId": "370620fe-c789-46db-9d92-33bec29b82a3",
    "items": [
      {
        "num": 1,
sumWriteoffOrders	Сумма заказов, закрытых за счет заведения.
salesCash	
Сумма продаж за наличные.  

salesCerdit	Сумма продаж в кредит.
salesCard	Сумма продаж по картам.
      "sumWriteoffOrders":0,
      "salesCash":9787,
      "salesCredit":0,
      "salesCard":11564,
      "sumWriteoffOrders":0,
      "salesCash":0,
      "salesCredit":0,
      "salesCard":34885,
      "sumWriteoffOrders":0,
      "salesCash":2660,
      "salesCredit":0,
      "salesCard":0,
sumWriteoffOrders	Сумма заказов, закрытых за счет заведения.
salesCash	
Сумма продаж за наличные.  

salesCerdit	Сумма продаж в кредит.
salesCard	Сумма продаж по картам.
            "DeletedWithWriteoff": {
                "filterType": "IncludeValues",
                "values": [
                    "NOT_DELETED"
                ]
            },
            "OrderDeleted": {
                "filterType": "IncludeValues",
                "values": [
                    "NOT_DELETED"
                ]
            }
        }
    }
...

Метод для получения тела отчета по сохраненной конфигурации (id)

[+] Ответ для рассматриваемого примера
        "DeletedWithWriteoff": {
            "filterType": "IncludeValues",
            "values": [
                "NOT_DELETED"
            ]
        },
        "OrderDeleted": {
            "filterType": "IncludeValues",
            "values": [
                "NOT_DELETED"
            ]
        }
    }
}
#### Что в ответе
JSON
{
    "data": [
        {
            "CloseTime": "2025-03-18T12:05:24.618",
            "Delivery.CustomerName": "Пупкин Василий",
            "Delivery.CustomerPhone": "+79785160513",
            "DishName": "Лимонад",
            "DishSumInt": 176,
            "OpenDate.Typed": "2025-03-18",
            "OpenTime": "2025-03-18T11:36:48",
            "OrderType": null,
            "PayTypes": "Наличные",
            "SessionNum": 17
        },
        {
            "CloseTime": "2025-03-18T15:34:01.955",
            "Delivery.CustomerName": "Ермолаев Евгений",
            "Delivery.CustomerPhone": "+79196129578",
            "DishName": "Шоколадный батончик",
            "DishSumInt": 50,
            "OpenDate.Typed": "2025-03-18",
            "OpenTime": "2025-03-18T15:33:41",
            "OrderType": null,
            "PayTypes": "Наличные",
            "SessionNum": 17
        },
        {
            "CloseTime": "2025-03-18T19:11:06.321",
            "Delivery.CustomerName": null,
            "Delivery.CustomerPhone": null,
            "DishName": "Пицца ",
            "DishSumInt": 240,
            "OpenDate.Typed": "2025-03-18",
            "OpenTime": "2025-03-18T19:10:47",
            "OrderType": "Доставка самовывоз",
            "PayTypes": "Банковские карты",
            "SessionNum": 17
        },
        {
            "CloseTime": "2025-03-18T19:14:02.906",
            "Delivery.CustomerName": "Ермолаев Евгений",
            "Delivery.CustomerPhone": "+79196129578",
            "DishName": "Пицца ",
            "DishSumInt": 240,
            "OpenDate.Typed": "2025-03-18",
            "OpenTime": "2025-03-18T19:13:20",
            "OrderType": "Доставка самовывоз",
            "PayTypes": "Банковские карты",
            "SessionNum": 17
        },
        {
            "CloseTime": "2025-03-18T19:19:12.99",
            "Delivery.CustomerName": "Ермолаев Евгений",
            "Delivery.CustomerPhone": "+79196129578",
            "DishName": "Пицца ",
            "DishSumInt": 240,
            "OpenDate.Typed": "2025-03-18",
            "OpenTime": "2025-03-18T19:18:35",
            "OrderType": "Доставка самовывоз",
            "PayTypes": "Банковские карты",
            "SessionNum": 17
        },
        {
            "CloseTime": "2025-03-18T19:21:43.061",
            "Delivery.CustomerName": null,
            "Delivery.CustomerPhone": null,
            "DishName": "Пицца ",
            "DishSumInt": 240,
            "OpenDate.Typed": "2025-03-18",
            "OpenTime": "2025-03-18T19:21:25",
            "OrderType": "Доставка самовывоз",
            "PayTypes": "Банковские карты",
            "SessionNum": 17
        },
        {
            "CloseTime": "2025-03-18T23:14:50.343",
            "Delivery.CustomerName": "Ермолаев Евгений",
            "Delivery.CustomerPhone": "+79196129578",
            "DishName": "Пицца ",
            "DishSumInt": 240,
            "OpenDate.Typed": "2025-03-18",
            "OpenTime": "2025-03-18T20:07:22",
            "OrderType": "Доставка самовывоз",
            "PayTypes": "Наличные",
            "SessionNum": 17
        },
        {
            "CloseTime": "2025-03-18T23:15:22.35",
            "Delivery.CustomerName": "Ермолаев Евгений",
            "Delivery.CustomerPhone": "+79196129578",
            "DishName": "Пицца ",
            "DishSumInt": 240,
            "OpenDate.Typed": "2025-03-18",
            "OpenTime": "2025-03-18T20:13:45",
            "OrderType": "Доставка самовывоз",
            "PayTypes": "Наличные",
            "SessionNum": 17
        },
        {
            "CloseTime": "2025-03-19T12:58:35.344",
            "Delivery.CustomerName": "Ермолаев Евгений",
            "Delivery.CustomerPhone": "+79196129578",
            "DishName": "Пицца ",
            "DishSumInt": 240,
            "OpenDate.Typed": "2025-03-18",
            "OpenTime": "2025-03-19T12:56:35",
            "OrderType": "Доставка самовывоз",
            "PayTypes": "Банковские карты",
            "SessionNum": 17
        },
        {
            "CloseTime": "2025-03-24T10:26:53.437",
            "Delivery.CustomerName": null,
            "Delivery.CustomerPhone": null,
            "DishName": "Шоколадный батончик MARS",
            "DishSumInt": 50,
            "OpenDate.Typed": "2025-03-18",
            "OpenTime": "2025-03-24T10:23:59",
            "OrderType": null,
            "PayTypes": "Наличные",
            "SessionNum": 17
        },
        {
            "CloseTime": "2025-03-25T12:44:08.425",
            "Delivery.CustomerName": null,
            "Delivery.CustomerPhone": null,
            "DishName": "Пицца ",
            "DishSumInt": 240,
            "OpenDate.Typed": "2025-03-24",
            "OpenTime": "2025-03-24T13:21:53",
            "OrderType": "Доставка самовывоз",
            "PayTypes": "Наличные",
            "SessionNum": 18
        }
    ],
    "summary": []
}

Отчеты
"DeletedWithWriteoff": {
"filterType": "ExcludeValues",
"values": ["DELETED_WITH_WRITEOFF","DELETED_WITHOUT_WRITEOFF"]
},
"OrderDeleted": {
"filterType": "IncludeValues",
"values": ["NOT_DELETED"]
}
Фильтр по диапазону 
JSON
"FieldName": {
"filterType": "Range",
"from": Value1,
"to": Value2,
"includeLow": booleanValue,
"includeHigh": booleanValue
}

Работает для полей с типами:

INTEGER
PERCENT
AMOUNT
MONEY
Название	Значение	Описание
FieldName
Имя поля для фильтрации	
  "DeletedWithWriteoff": {
      "filterType": "ExcludeValues",
      "values": ["DELETED_WITH_WRITEOFF","DELETED_WITHOUT_WRITEOFF"]
    },
   "OrderDeleted": {
      "filterType": "IncludeValues",
      "values": ["NOT_DELETED"]
    }
  }
}

Ответ

Код

{
  "data": [
    {
      "DishDiscountSumInt": 0,
      "DishSumInt": 1600,
      "GuestNum": 2,
      "OpenDate": "2014.01.01",
      "PayTypes": "(без оплаты)",
      "UniqOrderId": 2
    },

  "DeletedWithWriteoff": {
      "filterType": "IncludeValues",
      "values": ["NOT_DELETED"]
    },
   "OrderDeleted": {
      "filterType": "IncludeValues",
      "values": ["NOT_DELETED"]
    }
  }
}

Ответ
JSON
{
  "data": [
    {
      "CashRegisterName": "Cash_Register_Name",
      "DishDiscountSumInt": 80,
      "DishName": "Dish_Name",
      "DishSumInt": 80,
      "OpenDate": "2014.01.01"
    },
    {
      "CashRegisterName": "Cash_Register_Name",
      "DishDiscountSumInt": 320,
      "DishName": "Dish_Name",
      "DishSumInt": 320,
      "OpenDate": "2014.01.02"
    },

  "DeletedWithWriteoff": {
      "filterType": "IncludeValues",
      "values": ["NOT_DELETED"]
    },
   "OrderDeleted": {
      "filterType": "IncludeValues",
      "values": ["NOT_DELETED"]
    }
  }
}

Ответ
Код

{
  "data": [
    {
      "DishDiscountSumInt": 1892.5,
      "DishSumInt": 1950,
      "GuestNum": 5,
      "HourClose": "16",
      "OpenDate": "2014.01.01",
      "UniqOrderId": 5
    },
    {
      "DishDiscountSumInt": 31815.75,
      "DishSumInt": 34700,
      "GuestNum": 34,
      "HourClose": "17",
      "OpenDate": "2014.01.01",
      "UniqOrderId": 34
    },

  "DeletedWithWriteoff": {
      "filterType": "IncludeValues",
      "values": ["NOT_DELETED"]
    },
   "OrderDeleted": {
      "filterType": "IncludeValues",
      "values": ["NOT_DELETED"]
    }
  }
}

Ответ 
Код

{
  "data": [
    {
      "DishCategory": null,
      "DishDiscountSumInt": 8967.73,
      "DishSumInt": 9900,
      "GuestNum": 88,
      "UniqOrderId": 93
    },
    {
      "DishCategory": "Без скидки",
      "DishDiscountSumInt": 80296.57,
      "DishSumInt": 84800,
      "GuestNum": 86,
      "UniqOrderId": 87
    },

  "DeletedWithWriteoff": {
      "filterType": "IncludeValues",
      "values": ["NOT_DELETED"]
    },
   "OrderDeleted": {
      "filterType": "IncludeValues",
      "values": ["NOT_DELETED"]
    }
  }
}

Ответ
Код

{
  "data": [
    {
      "DishDiscountSumInt": 186521.5,
      "DishSumInt": 198795,
      "GuestNum": 186,
      "OpenDate": "2014.01.01",
      "UniqOrderId": 196
    },
    {
      "DishDiscountSumInt": 279318,
      "DishSumInt": 292240,
      "GuestNum": 271,
      "OpenDate": "2014.01.02",
      "UniqOrderId": 286
    }
  ],

  "DeletedWithWriteoff": {
      "filterType": "IncludeValues",
      "values": ["NOT_DELETED"]
    },
   "OrderDeleted": {
      "filterType": "IncludeValues",
      "values": ["NOT_DELETED"]
    }
  }
}

Ответ
JSON
{
  "data": [
    {
      "DishDiscountSumInt": 36186.25,
      "DishSumInt": 38475,
      "WaiterName": "Water_Name"
      
    },
    {
      "DishDiscountSumInt": 29935,
      "DishSumInt": 31445,
      "WaiterName": "Water_Name"
      
    },
    {
      "DishDiscountSumInt": 76610,
      "DishSumInt": 78970,
      "WaiterName": "Water_Name"
      
    },

