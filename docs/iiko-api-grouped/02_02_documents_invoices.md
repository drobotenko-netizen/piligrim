---
title: Документы: приходные/расходные накладные, возвраты, распроведение
source: https://ru.iiko.help/articles/#!api-documentations/iikoserver-api
generated: 2025-09-29T09:20:40.650Z
---

# Документы: приходные/расходные накладные, возвраты, распроведение

## Оглавление

---

[+] XSD Приходная накладная
#### Что в ответе
Структура documentValidationResult

[+] XSD Результат валидации документа
#### Пример расчета количества и цены товара:

При формировании приходной накладной есть позиция с продуктом в ящиках с базовыми единицами в кг.

Например, 5 ящиков по 1000 руб каждый, и в каждом ящике по 10 кг. Тогда заполнятся следующие поля:

"в ед." (<amount>) - 5*10= 50

"Фактическое количество" (<actualAmount>)  - 5*10=50/documents/export/incomingInvoice

"Цена базовой единицы" (<price>) - 1000/10=100 

Если фасовки нет, то эти поля заполняются количеством товара в единицах измерения.

#### Пример запроса и результата
Запрос

https://localhost:8080/resto/api/documents/import/incomingInvoice?key=ddb22676-38a7-afb4-d02a-d5f6898d64cc

XML

<document>
  <items>
    <item>
      <amount>3.00</amount>
[+] XSD Расходная накладная
#### Что в ответе
Структура documentValidationResult

[+] XSD Результат валидации документа​
#### Пример запроса и результат

Запрос

XML
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<document>
    <documentNumber>400234</documentNumber>
    <dateIncoming>2015-02-25T00:12:34</dateIncoming>
    <useDefaultDocumentTime>true</useDefaultDocumentTime>
    <revenueAccountCode>4.01</revenueAccountCode>
    <counteragentId>48ae3720-abe9-5637-014f-7420d2640125</counteragentId>
    <items>
        <item>
https://host:port/resto/api/documents/unprocess/incomingInvoice

#### Тело запроса
Структура document (см. XSD Приходная накладная)

#### Что в ответе
Структура documentValidationResult (см. XSD Результат валидации документа)

Распроведение расходной накладной
### Версия iiko: 7.7

### POST Request
https://host:port/resto/api/documents/unprocess/outgoingInvoice

#### Тело запроса
Структура outgoingInvoiceDto (см. XSD Расходная накладная)

#### Что в ответе
Структура documentValidationResult (см. XSD Результат валидации документа)

XSD Приходная накладная 
XML
XSD Расходная накладная 
XML
При запросе без поставщиков возвращает все приходные накладные, попавшие в интервал.

#### Что в ответе
[+] XSD Приходная накладная
#### Пример запроса и результат
Запрос
https://localhost:9080/resto/api/documents/export/incomingInvoice?key=491eca76-beed-845e-878c-9b05c97be0e2&from=2012-07-01&to=2012-07-02&supplierId=22A2A9D7-9D9C-48AD-BF99-83BF8CDE1938&supplierId=C5C6F00D-E1E5-4E3C-A4B8-BB677F470572

Выгрузка расходных накладных
### Версия iiko: 5.4

### GET Request
https://host:port/resto/api/documents/export/outgoingInvoice 

#### Параметры запроса
Название	Значение	Описание
from	YYYY-MM-DD	начальная дата (входит в интервал)
to	YYYY-MM-DD	конечная  дата (входит в интервал, время не учитывается)
supplierId	GUID	Id поставщика
При запросе без поставщиков возвращает все расходные накладные, попавшие в интервал.

#### Что в ответе
[+] XSD Расходная накладная
#### Пример запроса и результат
Запрос

https://localhost:9080/resto/api/documents/export/outgoingInvoice?key=86024f97-3c65-08af-2798-d7817bcdadce&from=2012-07-04&to=2012-07-05&supplierId=18761e00-aa16-4d0f-a064-d26cb3e7c646

[+] Результат

Выгрузка приходной накладной по ее номеру
### Версия iiko: 5.4

### GET Request
https://host:port/resto/api/documents/export/incomingInvoice/byNumber

#### Параметры запроса
Название
Значение
Описание
number	String	номер документа
from	YYYY-MM-DD	начальная дата (входит в интервал)
to	YYYY-MM-DD	конечная дата (входит в интервал, время не учитывается)
currentYear	Boolean	только за текущий год
При currentYear = true, вернет документы с указанным номером документа только за текущий год. Параметры from и to должны отсутствовать.

При currentYear = false параметры from и to должны быть указаны.

currentYear — обязательный параметр.

#### Что в ответе

[+] XSD Приходная накладная
#### Пример запроса и результат
Запрос 

https://localhost:9080/resto/api/documents/export/incomingInvoice/byNumber?key=49023c7b-86f4-351a-b237-554a674bf3a9&number=1711&from=2012-01-01&to=2012-12-30&currentYear=false

Загрузка возвратной накладной
### Версия iiko: 4.4

### POST Request
https://host:port/resto/api/documents/import/returnedInvoice

Content-Type: application/xml

#### Тело запроса
Структура returnedInvoiceDto

[+] XSD Возвратная накладная
#### Что в ответе
Структура documentValidationResult

[+] XSD Результат валидации документа
#### Пример вызова и результата

Запрос

XML
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<document>
  <documentNumber>TAKT0003</documentNumber>
  <dateIncoming>2016-05-03T00:12:35</dateIncoming>
  <status>PROCESSED</status>
  <incomingInvoiceNumber>TAKT0001</incomingInvoiceNumber>
  <incomingInvoiceDate>2016-05-01</incomingInvoiceDate>
  <counteragentId>4F1AC4B8-21AC-4FE6-8BEB-464EA10C5FFB</counteragentId>
  <items>
    <item>
      <storeId>84A2C3D1-488B-42F4-96C1-4670F7D08583</storeId>
[+] XSD Расходная накладная
#### Пример запроса и результат
Запрос

https://localhost:9080/resto/api/documents/export/outgoingInvoice/byNumber?key=49023c7b-86f4-351a-b237-554a674bf3a9&number=4&from=2012-01-01&to=2012-12-30&currentYear=false

Результат

XML
<outgoingInvoiceDtoes>
    <document>
        <id>cde9adc2-1c49-4d68-9d30-31a3768df53e</id>
        <documentNumber>4</documentNumber>
        <dateIncoming>2012-07-04T23:00:00+04:00</dateIncoming>
        <useDefaultDocumentTime>false</useDefaultDocumentTime>
        <status>PROCESSED</status>
        <accountToCode>7.3</accountToCode>
        <revenueAccountCode>4.01.1</revenueAccountCode>
        <defaultStoreId>a80f6110-aa36-43ea-8fb7-de9b6a3a2346</defaultStoreId>
        <defaultStoreCode>16</defaultStoreCode>
        <counteragentId>18761e00-aa16-4d0f-a064-d26cb3e7c646</counteragentId>
        <counteragentCode>703</counteragentCode>
        <comment/>
        <items>
            <item>