---
title: Документы: акты приготовления/реализации, инвентаризации
source: https://ru.iiko.help/articles/#!api-documentations/iikoserver-api
generated: 2025-09-29T09:20:40.654Z
---

# Документы: акты приготовления/реализации, инвентаризации

## Оглавление

---

<?xml version="1.0" encoding="UTF-8" standalone="yes"?><xs:schema version="1.0" xmlns:xs="http://www.w3.org/2001/XMLSchema">    <xs:element name="documentValidationResult" type="documentValidationResult"/>     <!--    Результат валидации документа.    Некоторые документы возвращают более подробную информацию, смотрите:     * incomingInventoryValidationResult.xsd    -->    <xs:complexType name="documentValidationResult">        <xs:sequence>            <!-- Результат валидации. -->            <xs:element name="valid" type="xs:boolean"/>            <!-- Указывает на то, что ошибка не критичная и служит в качестве предупреждения. -->            <xs:element name="warning" type="xs:boolean"/>            <!-- Номер валидируемого документа. -->            <xs:element name="documentNumber" type="xs:string" minOccurs="0"/>            <!--            Новый номер для документа.            Отличен от null, если старый нарушает уникальность или не изменились влияющие на номер поля.            -->            <xs:element name="otherSuggestedNumber" type="xs:string" minOccurs="0"/>            <!--            Текст ошибки (или только заголовок, если задано additionalInfo).            Предназначен для показа пользователю, но в REST API не всегда локализован.            -->            <xs:element name="errorMessage" type="xs:string" minOccurs="0"/>            <!--            Для невалидного результата может быть указана дополнительная информация, содержащая детали ошибки.            Например, для случая списания в минус это поле содержит детальную информацию по каждой позиции документа,            приводящей к отрицательным остаткам.            -->            <xs:element name="additionalInfo" type="xs:string" minOccurs="0"/>        </xs:sequence>    </xs:complexType></xs:schema>

Выгрузка приходных накладных 
### Версия iiko: 5.4

### GET Request
https://host:port/resto/api/documents/export/incomingInvoice

#### Параметры запроса
Название	Значение	Описание
from	YYYY-MM-DD	начальная дата (входит в интервал)
to	YYYY-MM-DD	конечная  дата (входит в интервал, время не учитывается)
supplierId	GUID	Id поставщика
revisionFrom
число, по умолчанию -1
с версии 6.4

Номер ревизии, начиная с которой необходимо отфильтровать сущности. Не включающий саму ревизию, т.е. ревизия объекта > revisionFrom.

По умолчанию (неревизионный запрос) revisionFrom = -1

Загрузка акта приготовления
### Версия iiko: 3.9

### POST Request
[+] XSD Акт приготовления
#### Что в ответе
Структура documentValidationResult

[+] XSD Результат валидации документа
#### Пример вызова и результат
Запрос

Загрузка акта реализации
### Версия iiko: 3.9

### POST Request
https://host:port/resto/api/documents/import/salesDocument

Content-Type: application/xml

#### Тело запроса
Структура salesDocumentDto

[+] XSD Акт реализации
#### Что в ответе
Структура documentValidationResult

[+] XSD Результат валидации документа
#### Пример вызова и результата
Запрос

https://localhost:8080/resto/api/documents/import/salesDocument?key=d5e3186a-b5a9-edf7-5164-ca55e29fe5e1

XML
<document>
  <items>
    <!--Zero or more repetitions:-->
      <item>
              <discountSum>11.00</discountSum>
              <sum>110.00</sum>
              <amount>3.00</amount>
Загрузка инвентаризации
### Версия iiko: 5.1

### POST Request
https://host:port/resto/api/documents/import/incomingInventory

Content-Type: application/xml

#### Тело запроса
Структура incomingInventoryDto

[+] XSD Инвентаризация
#### Что в ответе
Структура incomingInventoryValidationResult

[+] XSD Результат валидации документа инвентаризации
#### Пример запроса и результат
Запрос

XML
<?xml version="1.0" encoding="UTF-8"?>
<document>
  <documentNumber>Imv20160703j</documentNumber>
  <dateIncoming>2016-07-03T00:24:00</dateIncoming>
  <status>PROCESSED</status>
  <storeId>1239d270-1bbe-f64f-b7ea-5f00518ef508</storeId>
  <comment>Ничего не изменилось</comment>
  <items>
    <item>
<incomingInventoryValidationResult>
    <valid>true</valid>
    <warning>false</warning>
    <documentNumber>Imv20160703k</documentNumber>
    <store>
        <id>1239d270-1bbe-f64f-b7ea-5f00518ef508</id>
        <code>1</code>
        <name>Main storage</name>
    </store>
    <date>2016-07-03T00:26:00+03:00</date>
    <items>
        <item>
</incomingInventoryValidationResult>

Получение результатов инвентаризации до её проведения

### Версия iiko: 5.1

### POST Request
https://host:port/resto/api/documents/check/incomingInventory

Content-Type: application/xml

#### Тело запроса
Структура incomingInventoryDto

[+] XSD Инвентаризации
#### Что в ответе
Структура incomingInventoryValidationResult

[+] XSD Результат валидации документа инвентаризации

#### Пример запроса и результат
Запрос

XML
<?xml version="1.0" encoding="UTF-8"?>
<document>
  <documentNumber>Imv20160703j</documentNumber>
  <dateIncoming>2016-07-03T00:24:00</dateIncoming>
  <status>PROCESSED</status>
  <storeId>1239d270-1bbe-f64f-b7ea-5f00518ef508</storeId>
  <comment>Ничего не изменилось</comment>
  <items>
    <item>
<incomingInventoryValidationResult>
    <valid>true</valid>
    <warning>false</warning>
    <documentNumber>Imv20160703k</documentNumber>
    <store>
        <id>1239d270-1bbe-f64f-b7ea-5f00518ef508</id>
        <code>1</code>
        <name>Main storage</name>
    </store>
    <date>2016-07-03T00:26:00+03:00</date>
    <items>
        <item>
</incomingInventoryValidationResult>

